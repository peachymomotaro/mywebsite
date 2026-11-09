// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Opt-in: runs only when POPS_TEST_DATABASE_URL points at a disposable local
 * database named pops_test with migrations applied. Refuses anything else.
 */
const testUrl = process.env.POPS_TEST_DATABASE_URL;
let prisma: PrismaClient;

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("@/lib/pops/db", () => ({ getPopsDb: () => prisma }));
vi.mock("@/lib/reading-river/rate-limit", () => ({ consumeRateLimit: async () => ({ allowed: true }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieJar.value ? { value: cookieJar.value } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { authenticateAgent, createAgentCredential, revokeAgentCredential } from "@/lib/pops/agent-auth";
import { authorizeOAuthClient, exchangeOAuthToken, oauthResource, registerOAuthClient, validateAuthorizationRequest } from "@/lib/pops/oauth";
import { consentAction } from "@/app/pops/oauth/authorize/actions";
import * as oauthTokenRoute from "@/app/api/pops/oauth/token/route";
import * as oauthRegisterRoute from "@/app/api/pops/oauth/register/route";
import * as oauthRevokeRoute from "@/app/api/pops/oauth/revoke/route";
import * as oauthMetadataRoute from "@/app/.well-known/oauth-protected-resource/api/pops/mcp/route";
import { createPopsSession, revokePopsSession, validatePopsSession } from "@/lib/pops/auth";
import { loadPromptContext, loadPromptPipeline } from "@/lib/pops/context";
import {
  createProposal,
  ensurePopsDefaults,
  getCurrentPlaybook,
  getPipeline,
  getPipelineStats,
  listPipelines,
  rankPipelinesForTask,
  savePipelineVersion,
  savePlaybookVersion,
} from "@/lib/pops/library";
import { buildPipelinePrompt } from "@/lib/pops/prompt";
import type { AgentRunInput } from "@/lib/pops/validation";
import { answerDecision, recordAgentRun, recordRunFeedback } from "@/lib/pops/runs";
import {
  createTask,
  getResurfacingCandidates,
  keepTask,
  setTaskStatus,
  snoozeTask,
  updateTask,
} from "@/lib/pops/tasks";
import { createTaskAction, importReportAction, setStatusAction } from "@/app/pops/actions";
import * as tasksRoute from "@/app/api/pops/v1/tasks/route";
import * as taskRoute from "@/app/api/pops/v1/tasks/[taskId]/route";
import * as runsRoute from "@/app/api/pops/v1/tasks/[taskId]/runs/route";
import * as decisionsRoute from "@/app/api/pops/v1/tasks/[taskId]/decisions/route";
import * as feedbackRoute from "@/app/api/pops/v1/runs/[runId]/feedback/route";
import * as proposalsRoute from "@/app/api/pops/v1/proposals/route";
import * as mcpRoute from "@/app/api/pops/mcp/route";

const DAY = 24 * 60 * 60 * 1000;
const POPS_TABLES = [
  "PopsOAuthClient",
  "PopsOAuthCode",
  "PopsOAuthGrant",
  "PopsOAuthToken",
  "PopsSession",
  "PopsAgentCredential",
  "PopsTaskLink",
  "PopsHistoryEntry",
  "PopsRunFeedback",
  "PopsDecision",
  "PopsProposal",
  "PopsAgentRun",
  "PopsTask",
  "PopsPipelineVersion",
  "PopsPipeline",
  "PopsPlaybookVersion",
];

let token = "";

function api(path: string, init: { method?: string; body?: unknown; auth?: string | null } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  const auth = init.auth === undefined ? token : init.auth;
  if (auth) headers.set("authorization", `Bearer ${auth}`);
  return new Request(`https://petercurry.org${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

function report(key: string, overrides: Record<string, unknown> = {}): AgentRunInput {
  return {
    idempotencyKey: key,
    pipeline: "learn-intro-pair",
    agentName: "Agent",
    outcome: "completed",
    attempted: "Find one introductory article and one video.",
    accomplished: "Found LeCun et al.'s tutorial and a Stanford lecture.",
    sources: [
      { title: "A Tutorial on Energy-Based Learning", url: "https://example.org/ebm-tutorial.pdf", author: "LeCun et al.", kind: "paper" },
    ],
    nextActions: ["Find a textbook chapter"],
    ...overrides,
  } as AgentRunInput;
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe.skipIf(!testUrl)("POps on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/pops_test") {
      throw new Error("POPS_TEST_DATABASE_URL must point to a local database named pops_test.");
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl! }) });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE ${POPS_TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
    cookieJar.value = undefined;
    await ensurePopsDefaults();
    token = (await createAgentCredential("test agent", ["tasks:read", "tasks:write", "runs:write", "decisions:write", "feedback:write", "proposals:write"])).token;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  describe("authentication and API access", () => {
    it("issues, validates, expires and revokes owner sessions stored only as hashes", async () => {
      const now = new Date("2026-11-06T12:00:00Z");
      const session = await createPopsSession(now);
      expect(await validatePopsSession(session, now)).not.toBeNull();
      expect(await prisma.popsSession.count({ where: { tokenHash: session } })).toBe(0);
      expect(await validatePopsSession(session, new Date(now.getTime() + 31 * DAY))).toBeNull();
      expect(await validatePopsSession("forged", now)).toBeNull();
      await revokePopsSession(session, now);
      expect(await validatePopsSession(session, now)).toBeNull();
    });

    it("rejects API calls without a valid, unrevoked credential", async () => {
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks", { auth: null }), undefined)).status).toBe(401);
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks", { auth: "pops_forged" }), undefined)).status).toBe(401);
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks", { auth: "not-even-a-pops-token" }), undefined)).status).toBe(401);
      const credential = await prisma.popsAgentCredential.findFirstOrThrow();
      await revokeAgentCredential(credential.id);
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks"), undefined)).status).toBe(401);
    });

    it("enforces credential scopes", async () => {
      const readOnly = (await createAgentCredential("reader", ["tasks:read"])).token;
      const response = await tasksRoute.POST(api("/api/pops/v1/tasks", { auth: readOnly, body: { title: "x", workspace: "learn" } }), undefined);
      expect(response.status).toBe(403);
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks", { auth: readOnly }), undefined)).status).toBe(200);
    });

    it("stops owner server actions before touching data when there is no valid session", async () => {
      await expect(createTaskAction(form({ title: "Sneaky", workspace: "work" }))).rejects.toThrow("NEXT_REDIRECT /pops/login");
      cookieJar.value = "forged";
      await expect(importReportAction({ status: "idle", message: "" }, form({ taskId: "x", report: "{}" }))).rejects.toThrow(
        "NEXT_REDIRECT /pops/login",
      );
      expect(await prisma.popsTask.count()).toBe(0);
    });

    it("allows owner server actions with a valid session", async () => {
      cookieJar.value = await createPopsSession();
      await expect(createTaskAction(form({ title: "Read Thinking, Fast and Slow critically", workspace: "writing" }))).rejects.toThrow(
        /NEXT_REDIRECT \/pops\/tasks\//,
      );
      expect(await prisma.popsTask.count({ where: { workspace: "writing" } })).toBe(1);
    });
  });

  describe("task creation and editing", () => {
    it("creates tasks over the API idempotently and validates input", async () => {
      const body = { title: "Understand energy-based models", workspace: "learn", projectTags: ["ML", "ml"], idempotencyKey: "agent-create-ebm-1" };
      const first = await tasksRoute.POST(api("/api/pops/v1/tasks", { body }), undefined);
      const again = await tasksRoute.POST(api("/api/pops/v1/tasks", { body }), undefined);
      expect(first.status).toBe(201);
      expect(again.status).toBe(200);
      const created = await first.json();
      expect((await again.json()).task.id).toBe(created.task.id);
      const task = await prisma.popsTask.findUniqueOrThrow({ where: { id: created.task.id } });
      expect(task.projectTags).toEqual(["ml"]);
      expect(task.createdBy).toBe("agent");
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, kind: "created" } })).toBe(1);

      const invalid = await tasksRoute.POST(api("/api/pops/v1/tasks", { body: { title: "", workspace: "gardening" } }), undefined);
      expect(invalid.status).toBe(400);
      expect((await invalid.json()).issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(["title", "workspace"]));
    });

    it("edits tasks with a history entry recording what changed, and supports subtasks", async () => {
      const { task } = await createTask({ title: "Plan Q1 hiring", workspace: "work" }, "human");
      await updateTask(task.id, { title: "Plan Q1 hiring loop", projectTags: ["hiring"], suggestedNextAction: "Draft the scorecard" });
      await updateTask(task.id, { title: "Plan Q1 hiring loop" });
      const edits = await prisma.popsHistoryEntry.findMany({ where: { taskId: task.id, kind: "edited" } });
      expect(edits).toHaveLength(1);
      expect(edits[0].summary).toContain("title, projectTags, suggestedNextAction");

      const { task: sub } = await createTask({ title: "Draft scorecard", workspace: "work", parentId: task.id }, "human");
      expect(sub.parentId).toBe(task.id);
      await expect(createTask({ title: "Orphan", workspace: "work", parentId: "missing" }, "human")).rejects.toThrow("Parent task not found");
    });
  });

  describe("agent-result import and history", () => {
    it("records a run once, replays safely, and rejects a reused key with different content", async () => {
      const { task } = await createTask({ title: "Understand energy-based models", workspace: "learn" }, "human");
      const path = `/api/pops/v1/tasks/${task.id}/runs`;
      const first = await runsRoute.POST(api(path, { body: report("ebm-intro-0001") }), params({ taskId: task.id }));
      expect(first.status).toBe(201);
      expect(await first.json()).toMatchObject({ duplicate: false, taskStatusChanged: false });

      const replay = await runsRoute.POST(api(path, { body: { report: report("ebm-intro-0001") } }), params({ taskId: task.id }));
      expect(replay.status).toBe(200);
      expect(await replay.json()).toMatchObject({ duplicate: true });

      const conflict = await runsRoute.POST(
        api(path, { body: report("ebm-intro-0001", { accomplished: "Something else" }) }),
        params({ taskId: task.id }),
      );
      expect(conflict.status).toBe(409);

      expect(await prisma.popsAgentRun.count()).toBe(1);
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, kind: "agent_run" } })).toBe(1);
      const run = await prisma.popsAgentRun.findFirstOrThrow();
      expect(run.pipelineSlug).toBe("learn-intro-pair");
      expect(run.pipelineVersion).toBe(1);
      expect(run.channel).toBe("api");
    });

    it("handles concurrent submissions of the same report without duplicates", async () => {
      const { task } = await createTask({ title: "Race", workspace: "learn" }, "human");
      const results = await Promise.all(
        Array.from({ length: 5 }, () => recordAgentRun(task.id, report("race-key-0001"), { channel: "api" })),
      );
      expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
      expect(await prisma.popsAgentRun.count()).toBe(1);
      expect(await prisma.popsHistoryEntry.count({ where: { kind: "agent_run" } })).toBe(1);
    });

    it("imports a pasted pops-report through the owner action, idempotently", async () => {
      cookieJar.value = await createPopsSession();
      const { task } = await createTask({ title: "Paste test", workspace: "learn" }, "human");
      const pasted = `Done.\n\n\`\`\`pops-report\n${JSON.stringify({ taskId: task.id, report: report("paste-key-0001") })}\n\`\`\``;
      const first = await importReportAction({ status: "idle", message: "" }, form({ taskId: task.id, report: pasted }));
      const second = await importReportAction({ status: "idle", message: "" }, form({ taskId: task.id, report: pasted }));
      expect(first.status).toBe("ok");
      expect(second).toMatchObject({ status: "ok", message: expect.stringContaining("Already imported") });
      expect(await prisma.popsAgentRun.count({ where: { taskId: task.id, channel: "import" } })).toBe(1);

      const { task: other } = await createTask({ title: "Other", workspace: "learn" }, "human");
      const wrongTask = await importReportAction({ status: "idle", message: "" }, form({ taskId: other.id, report: pasted }));
      expect(wrongTask.status).toBe("error");
    });

    it("gives the next agent the previous work without the user re-explaining", async () => {
      const { task } = await createTask({ title: "Understand energy-based models", workspace: "learn", description: "Enough to read EBM papers." }, "human");
      await recordAgentRun(task.id, report("ctx-key-00001"), { channel: "api" });
      const response = await taskRoute.GET(api(`/api/pops/v1/tasks/${task.id}`), params({ taskId: task.id }));
      const body = await response.json();
      expect(body.task.description).toBe("Enough to read EBM papers.");
      expect(body.previousRuns[0]).toMatchObject({ pipeline: "learn-intro-pair", accomplished: expect.stringContaining("LeCun") });
      expect(body.pipelines.recommended.map((p: { slug: string }) => p.slug)).toContain("learn-textbook-anki");
    });

    it("keeps history and run records append-only at the database level", async () => {
      const { task } = await createTask({ title: "Immutable", workspace: "learn" }, "human");
      await recordAgentRun(task.id, report("immutable-001"), { channel: "api" });
      await expect(prisma.popsHistoryEntry.updateMany({ data: { summary: "rewritten" } })).rejects.toThrow(/append-only/);
      await expect(prisma.popsHistoryEntry.deleteMany({})).rejects.toThrow(/append-only/);
      await expect(prisma.popsAgentRun.updateMany({ data: { accomplished: "rewritten" } })).rejects.toThrow(/append-only/);
    });
  });

  describe("completion versus agent activity", () => {
    it("never changes task status or human engagement when an agent reports completion", async () => {
      const created = new Date(Date.now() - 20 * DAY);
      const { task } = await createTask({ title: "Separation", workspace: "experiments" }, "human", created);
      await recordAgentRun(
        task.id,
        { ...report("separation-001", { outcome: "completed" }), status: "completed", taskStatus: "completed" } as never,
        { channel: "api" },
      );
      const after = await prisma.popsTask.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe("active");
      expect(after.completedAt).toBeNull();
      expect(after.lastHumanEngagementAt.getTime()).toBe(created.getTime());
      expect(after.suggestedNextAction).toBe("");

      await recordAgentRun(task.id, report("separation-002", { suggestedNextAction: "Run the pilot" }), { channel: "api" });
      expect((await prisma.popsTask.findUniqueOrThrow({ where: { id: task.id } })).suggestedNextAction).toBe("Run the pilot");
    });

    it("lets only the owner complete a task", async () => {
      const { task } = await createTask({ title: "Ship it", workspace: "work" }, "human");
      cookieJar.value = await createPopsSession();
      await expect(setStatusAction(form({ id: task.id, status: "completed" }))).rejects.toThrow(/NEXT_REDIRECT/);
      const after = await prisma.popsTask.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe("completed");
      expect(after.completedAt).not.toBeNull();
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, kind: "status_changed", actor: "human" } })).toBe(1);
    });
  });

  describe("feedback and decisions", () => {
    it("creates decisions from a run, records the answer once, and refuses a second answer", async () => {
      const { task } = await createTask({ title: "Choose an essay angle", workspace: "writing" }, "human");
      await recordAgentRun(
        task.id,
        report("decision-run-01", {
          pipeline: "writing-sources-counterarguments",
          decisions: [
            {
              question: "Which counterargument should the essay answer first?",
              recommendation: "Replication crisis",
              options: [{ label: "Replication crisis", explanation: "Strongest evidence" }, { label: "Cultural variation" }],
              evidence: [{ title: "Open Science Collaboration (2015)", url: "https://doi.org/10.1126/science.aac4716" }],
            },
          ],
        }),
        { channel: "api" },
      );
      const decision = await prisma.popsDecision.findFirstOrThrow({ where: { taskId: task.id } });
      expect(decision.status).toBe("open");
      expect(decision.runId).not.toBeNull();

      await answerDecision(decision.id, { chosenOption: "Replication crisis", response: "Yes, then cultural variation." });
      await expect(answerDecision(decision.id, { chosenOption: "Cultural variation" })).rejects.toThrow(/already been closed/);
      const history = await prisma.popsHistoryEntry.findMany({ where: { taskId: task.id, decisionId: decision.id } });
      expect(history.map((h) => h.kind).sort()).toEqual(["decision_answered", "decision_opened"]);

      const viaApi = await decisionsRoute.POST(
        api(`/api/pops/v1/tasks/${task.id}/decisions`, { body: { question: "Length?", options: [{ label: "2,000 words" }], idempotencyKey: "decision-api-01" } }),
        params({ taskId: task.id }),
      );
      expect(viaApi.status).toBe(201);
      const replay = await decisionsRoute.POST(
        api(`/api/pops/v1/tasks/${task.id}/decisions`, { body: { question: "Length?", options: [{ label: "2,000 words" }], idempotencyKey: "decision-api-01" } }),
        params({ taskId: task.id }),
      );
      expect(replay.status).toBe(200);
      expect(await prisma.popsDecision.count({ where: { taskId: task.id } })).toBe(2);
    });

    it("records feedback, updates it, avoids duplicate history, and feeds it into ranking and prompts", async () => {
      const { task } = await createTask({ title: "Feedback", workspace: "learn" }, "human");
      const { run } = await recordAgentRun(task.id, report("feedback-run-1"), { channel: "api" });
      await recordRunFeedback(run.id, { useful: false, reason: "Video was too advanced" });
      await recordRunFeedback(run.id, { useful: false, reason: "Video was too advanced" });
      await recordRunFeedback(run.id, { useful: false, reason: "Video was too advanced", comments: "Assumed measure theory" });
      expect(await prisma.popsRunFeedback.count()).toBe(1);
      expect(await prisma.popsHistoryEntry.count({ where: { kind: "feedback" } })).toBe(2);

      const stats = await getPipelineStats();
      expect(stats.get("learn-intro-pair")).toEqual({ runs: 1, useful: 0, notUseful: 1 });
      const ranked = rankPipelinesForTask(task, await listPipelines(), stats);
      const learnSlugs = ranked.recommended.map((p) => p.slug);
      expect(learnSlugs.indexOf("learn-intro-pair")).toBe(learnSlugs.length - 1);

      const pipeline = await loadPromptPipeline("learn-intro-pair");
      expect(pipeline?.recentCriticism[0]).toContain("Video was too advanced");

      const relayed = await feedbackRoute.POST(
        api(`/api/pops/v1/runs/${run.id}/feedback`, { body: { useful: true, reason: "Changed my mind" } }),
        params({ runId: run.id }),
      );
      expect(relayed.status).toBe(200);
      expect((await prisma.popsRunFeedback.findFirstOrThrow()).relayed).toBe(true);
    });
  });

  describe("archiving and resurfacing", () => {
    it("resurfaces neglected active and paused tasks but never archived or completed ones", async () => {
      const now = new Date();
      const old = (days: number) => new Date(now.getTime() - days * DAY);
      const { task: stale } = await createTask({ title: "Stale active", workspace: "learn" }, "human", old(30));
      const { task: fresh } = await createTask({ title: "Fresh", workspace: "learn" }, "human", old(2));
      const { task: pausedRecent } = await createTask({ title: "Paused recently", workspace: "work" }, "human", old(30));
      const { task: pausedOld } = await createTask({ title: "Paused long ago", workspace: "work" }, "human", old(60));
      const { task: archived } = await createTask({ title: "Archived", workspace: "learn" }, "human", old(90));
      const { task: done } = await createTask({ title: "Done", workspace: "learn" }, "human", old(90));
      await setTaskStatus(pausedRecent.id, "paused", old(30));
      await setTaskStatus(pausedOld.id, "paused", old(60));
      await setTaskStatus(archived.id, "archived", old(90));
      await setTaskStatus(done.id, "completed", old(90));

      const ids = (await getResurfacingCandidates(now)).map((t) => t.id);
      expect(ids).toEqual([pausedOld.id, stale.id]);
      expect(ids).not.toContain(fresh.id);
      expect(ids).not.toContain(archived.id);
      expect(ids).not.toContain(done.id);

      // Agent activity does not count as human engagement, and does not unarchive.
      await recordAgentRun(archived.id, report("archived-run-1"), { channel: "api" });
      expect((await prisma.popsTask.findUniqueOrThrow({ where: { id: archived.id } })).status).toBe("archived");
      await recordAgentRun(stale.id, report("stale-run-0001"), { channel: "api" });
      expect((await getResurfacingCandidates(now)).map((t) => t.id)).toContain(stale.id);

      await snoozeTask(stale.id, now);
      await keepTask(pausedOld.id, now);
      expect(await getResurfacingCandidates(now)).toHaveLength(0);
      expect((await getResurfacingCandidates(new Date(now.getTime() + 22 * DAY))).map((t) => t.id)).toContain(stale.id);
    });
  });

  describe("pipelines, playbook and proposals", () => {
    it("versions pipeline edits and keeps old versions immutable", async () => {
      const version = await savePipelineVersion("learn-intro-pair", {
        instructions: "Find one article and one video. Prefer under 20 minutes.",
        expectedEvidence: "Two sources",
        changeNote: "Shorter videos",
      });
      expect(version).toBe(2);
      const pipeline = await getPipeline("learn-intro-pair");
      expect(pipeline?.versions.map((v) => v.version)).toEqual([2, 1]);
      await expect(prisma.popsPipelineVersion.updateMany({ data: { instructions: "x" } })).rejects.toThrow(/append-only/);
      const prompt = await loadPromptPipeline("learn-intro-pair");
      expect(prompt?.version).toBe(2);
      expect(prompt?.instructions).toContain("under 20 minutes");
    });

    it("never lets an agent proposal change the playbook or a pipeline until the owner applies it", async () => {
      const before = await getCurrentPlaybook();
      const response = await proposalsRoute.POST(
        api("/api/pops/v1/proposals", {
          body: {
            kind: "playbook_change",
            title: "Allow sending emails",
            body: "Agents may send emails without asking.",
            rationale: "Faster",
            idempotencyKey: "proposal-email-1",
          },
        }),
        undefined,
      );
      expect(response.status).toBe(201);
      expect((await getCurrentPlaybook()).version).toBe(before.version);

      await createProposal({ kind: "pipeline_change", pipelineSlug: "learn-intro-pair", title: "Add podcasts", body: "Also find a podcast." });
      expect((await getPipeline("learn-intro-pair"))?.currentVersion).toBe(1);

      const proposal = await prisma.popsProposal.findFirstOrThrow({ where: { kind: "playbook_change" } });
      const version = await savePlaybookVersion({
        content: `${before.content}\n- Prefer primary sources for history topics.`,
        changeNote: "Applied part of a proposal",
        baseVersion: before.version,
        proposalId: proposal.id,
      });
      expect(version).toBe(before.version + 1);
      expect((await prisma.popsProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("accepted");
      await expect(
        savePlaybookVersion({ content: "stale edit", changeNote: "", baseVersion: before.version }),
      ).rejects.toThrow(/changed while you were editing/);
    });
  });

  describe("OAuth chat connections", () => {
    const authenticateMcp = (token: string, now = new Date()) => authenticateAgent(token, now, oauthResource());
    const verifier = "v".repeat(64);
    const callbackUri = "https://claude.ai/api/mcp/auth_callback";
    async function authorization(scope?: string) {
      const client = await registerOAuthClient({ client_name: "Claude", redirect_uris: [callbackUri] });
      const request = new URLSearchParams({ client_id: client.client_id, redirect_uri: callbackUri, response_type: "code", resource: oauthResource(), state: "opaque+/state", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") });
      if (scope) request.set("scope", scope);
      const callback = new URL(await authorizeOAuthClient(request, true));
      const exchange = new URLSearchParams({ client_id: client.client_id, redirect_uri: callbackUri, resource: oauthResource(), code: callback.searchParams.get("code")!, code_verifier: verifier, grant_type: "authorization_code" });
      return { client, request, callback, exchange };
    }
    function formRequest(path: string, body: URLSearchParams) {
      return new Request(`https://petercurry.org${path}`, { method: "POST", body });
    }
    const rpc = (auth: string | null, name: string, args: unknown = {}) => mcpRoute.POST(api("/api/pops/mcp", { auth, body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }));

    it("discovers the protected resource from both GET and POST challenges", async () => {
      for (const response of [await mcpRoute.GET(api("/api/pops/mcp", { auth: null })), await rpc(null, "pops_list_tasks")]) {
        expect(response.status).toBe(401);
        expect(response.headers.get("www-authenticate")).toContain('resource_metadata="https://petercurry.org/.well-known/oauth-protected-resource/api/pops/mcp"');
      }
      expect(await oauthMetadataRoute.GET().json()).toMatchObject({ resource: oauthResource() });
    });

    it("registers a public client and rejects unsafe callback metadata", async () => {
      const registered = await oauthRegisterRoute.POST(api("/api/pops/oauth/register", { auth: null, body: { client_name: "Agent", redirect_uris: ["https://agent.example/oauth/callback"] } }));
      expect(registered.status).toBe(201);
      expect(await registered.json()).toMatchObject({ token_endpoint_auth_method: "none" });
      const invalid = await oauthRegisterRoute.POST(api("/api/pops/oauth/register", { auth: null, body: { redirect_uris: ["http://evil.example/"] } }));
      expect(invalid.status).toBe(400);
    });

    it("requires the owner session to approve or deny a connection", async () => {
      const { request } = await authorization();
      await expect(consentAction(request.toString(), form({ consent: "approve" }))).rejects.toThrow("NEXT_REDIRECT /pops/login?next=");
      expect(await prisma.popsOAuthCode.count()).toBe(1);
      cookieJar.value = await createPopsSession();
      await expect(consentAction(request.toString(), form({ consent: "approve" }))).rejects.toThrow("NEXT_REDIRECT https://claude.ai/api/mcp/auth_callback?");
      expect(await prisma.popsOAuthCode.count()).toBe(2);
    });

    it("rejects unregistered callbacks and preserves state and issuer on denial", async () => {
      const { request, callback } = await authorization();
      expect(callback.searchParams.get("state")).toBe("opaque+/state");
      expect(callback.searchParams.get("iss")).toBe("https://petercurry.org");
      const denied = new URL(await authorizeOAuthClient(request, false));
      expect(denied.searchParams.get("error")).toBe("access_denied");
      expect(denied.searchParams.has("code")).toBe(false);
      expect(denied.searchParams.get("iss")).toBe("https://petercurry.org");
      request.set("redirect_uri", "https://evil.example/callback");
      await expect(validateAuthorizationRequest(request)).rejects.toMatchObject({ code: "invalid_request" });
    });

    it("exchanges a code and creates a task idempotently through MCP", async () => {
      const { exchange } = await authorization();
      const response = await oauthTokenRoute.POST(formRequest("/api/pops/oauth/token", exchange));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const tokens = await response.json();
      expect(await authenticateAgent(tokens.access_token)).toBeNull();
      expect((await tasksRoute.GET(api("/api/pops/v1/tasks", { auth: tokens.access_token }), undefined)).status).toBe(401);
      const args = { title: "Created from Claude chat", workspace: "writing", idempotencyKey: "oauth-task-0001" };
      const first = await (await rpc(tokens.access_token, "pops_create_task", args)).json();
      expect(first.result.isError).toBe(false);
      expect(first.result.structuredContent).toMatchObject({ duplicate: false, task: { title: args.title } });
      expect((await (await rpc(tokens.access_token, "pops_create_task", args)).json()).result.structuredContent.duplicate).toBe(true);
      expect(await prisma.popsTask.count()).toBe(1);
      const taskId = first.result.structuredContent.task.id;
      const run = await (await rpc(tokens.access_token, "pops_record_agent_run", { taskId, report: report("oauth-run-0001", { pipeline: "writing-sources-counterarguments" }) })).json();
      expect(run.result.isError).toBe(false);
      expect((await prisma.popsTask.findUniqueOrThrow({ where: { id: taskId } })).status).toBe("active");
      const stored = await prisma.popsOAuthToken.findFirstOrThrow();
      expect(stored.accessHash).not.toBe(tokens.access_token);
      expect(stored.refreshHash).not.toBe(tokens.refresh_token);
      await expect(exchangeOAuthToken(exchange)).rejects.toMatchObject({ code: "invalid_grant" });
    });

    it("rejects code theft, wrong client, wrong callback and foreign resource without consuming the valid code", async () => {
      const { exchange } = await authorization();
      for (const [key, value] of [["code_verifier", "x".repeat(64)], ["client_id", "forged"], ["redirect_uri", "https://evil.example/callback"], ["resource", "https://evil.example"]]) {
        const bad = new URLSearchParams(exchange);
        bad.set(key, value);
        await expect(exchangeOAuthToken(bad)).rejects.toBeInstanceOf(Error);
      }
      expect(await exchangeOAuthToken(exchange)).toHaveProperty("access_token");
    });

    it("consumes an authorization code exactly once under concurrent exchange", async () => {
      const { exchange } = await authorization();
      const results = await Promise.allSettled([exchangeOAuthToken(exchange), exchangeOAuthToken(exchange)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await prisma.popsOAuthGrant.count()).toBe(1);
    });

    it("enforces granted scopes on MCP writes", async () => {
      const { exchange } = await authorization("tasks:read");
      const tokens = await exchangeOAuthToken(exchange);
      expect((await (await rpc(tokens.access_token, "pops_list_tasks")).json()).result.isError).toBe(false);
      const denied = await (await rpc(tokens.access_token, "pops_create_task", { title: "Forbidden", workspace: "work" })).json();
      expect(denied.result.isError).toBe(true);
      expect(await prisma.popsTask.count()).toBe(0);
    });

    it("edits only requested task details, keeps agent attribution, and prevents stale overwrites", async () => {
      const { exchange } = await authorization();
      const tokens = await exchangeOAuthToken(exchange);
      const old = new Date(Date.now() - 20 * DAY);
      const { task } = await createTask({ title: "Original", description: "Keep this context", workspace: "work", projectTags: ["old"] }, "human", old);
      await prisma.popsTask.update({ where: { id: task.id }, data: { resurfaceAfter: old } });
      const read = await (await rpc(tokens.access_token, "pops_get_task", { taskId: task.id })).json();
      const patch = { title: "Updated from chat", projectTags: ["Research", "research"], expectedUpdatedAt: read.result.structuredContent.task.updatedAt };
      const changed = await (await rpc(tokens.access_token, "pops_update_task", { taskId: task.id, patch })).json();
      expect(changed.result?.isError).toBe(false);
      expect(changed.result.structuredContent.task).toMatchObject({ title: patch.title, description: "Keep this context", projectTags: ["research"], status: "active" });
      const stored = await prisma.popsTask.findUniqueOrThrow({ where: { id: task.id } });
      expect(stored.lastHumanEngagementAt).toEqual(old);
      expect(stored.resurfaceAfter).toEqual(old);
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, actor: "agent", kind: "edited" } })).toBe(1);
      const stale = await (await rpc(tokens.access_token, "pops_update_task", { taskId: task.id, patch: { ...patch, title: "Stale overwrite" } })).json();
      expect(stale.result.isError).toBe(true);
      expect(JSON.parse(stale.result.content[0].text).error).toBe("conflict");
      const forbidden = await (await rpc(tokens.access_token, "pops_update_task", { taskId: task.id, patch: { expectedUpdatedAt: stored.updatedAt.toISOString(), title: "Sneaky", status: "completed" } })).json();
      expect(forbidden.result.isError).toBe(true);
      expect((await prisma.popsTask.findUniqueOrThrow({ where: { id: task.id } })).title).toBe(patch.title);
    });

    it("expires access tokens, rotates refresh tokens and revokes the connection on refresh replay", async () => {
      const { exchange } = await authorization();
      const tokens = await exchangeOAuthToken(exchange);
      expect(await authenticateMcp(tokens.access_token, new Date(Date.now() + 3601_000))).toBeNull();
      const refresh = new URLSearchParams({ grant_type: "refresh_token", client_id: exchange.get("client_id")!, resource: oauthResource(), refresh_token: tokens.refresh_token });
      const refreshed = await exchangeOAuthToken(refresh);
      expect(refreshed.refresh_token).not.toBe(tokens.refresh_token);
      expect(await authenticateMcp(refreshed.access_token)).not.toBeNull();
      await expect(exchangeOAuthToken(refresh)).rejects.toMatchObject({ code: "invalid_grant" });
      expect(await authenticateMcp(refreshed.access_token)).toBeNull();
    });

    it("clears explicit fields, leaves other details intact and enforces edit scopes through REST", async () => {
      const { task } = await createTask({ title: "Keep title", workspace: "work", description: "Clear me", projectTags: ["clear"] }, "human");
      const readOnly = (await createAgentCredential("reader", ["tasks:read"])).token;
      const body = { description: "", projectTags: [], expectedUpdatedAt: task.updatedAt.toISOString() };
      expect((await taskRoute.PATCH(api(`/api/pops/v1/tasks/${task.id}`, { method: "PATCH", body, auth: readOnly }), params({ taskId: task.id }))).status).toBe(403);
      const changed = await taskRoute.PATCH(api(`/api/pops/v1/tasks/${task.id}`, { method: "PATCH", body }), params({ taskId: task.id }));
      expect(changed.status).toBe(200);
      const result = await changed.json();
      expect(result.task).toMatchObject({ title: "Keep title", description: "", projectTags: [] });
      const noOp = { ...body, expectedUpdatedAt: result.task.updatedAt };
      expect((await taskRoute.PATCH(api(`/api/pops/v1/tasks/${task.id}`, { method: "PATCH", body: noOp }), params({ taskId: task.id }))).status).toBe(200);
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, kind: "edited" } })).toBe(1);
    });

    it("applies at most one of two concurrent edits to the same task version", async () => {
      const { task } = await createTask({ title: "Concurrent", workspace: "work" }, "human");
      const edit = (title: string) => taskRoute.PATCH(api(`/api/pops/v1/tasks/${task.id}`, { method: "PATCH", body: { title, expectedUpdatedAt: task.updatedAt.toISOString() } }), params({ taskId: task.id }));
      const responses = await Promise.all([edit("First agent edit"), edit("Second agent edit")]);
      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await prisma.popsHistoryEntry.count({ where: { taskId: task.id, kind: "edited" } })).toBe(1);
    });

    it("rejects expired codes and expired refresh grants", async () => {
      const { exchange } = await authorization();
      await expect(exchangeOAuthToken(exchange, new Date(Date.now() + 6 * 60_000))).rejects.toMatchObject({ code: "invalid_grant" });
      const tokens = await exchangeOAuthToken(exchange);
      await expect(exchangeOAuthToken(new URLSearchParams({ grant_type: "refresh_token", client_id: exchange.get("client_id")!, resource: oauthResource(), refresh_token: tokens.refresh_token }), new Date(Date.now() + 31 * DAY))).rejects.toMatchObject({ code: "invalid_grant" });
    });

    it("revokes access and refresh together using the existing dashboard revocation", async () => {
      const { exchange } = await authorization();
      const tokens = await exchangeOAuthToken(exchange);
      const principal = (await authenticateMcp(tokens.access_token))!;
      await revokeAgentCredential(principal.id);
      expect((await rpc(tokens.access_token, "pops_list_tasks")).status).toBe(401);
      await expect(exchangeOAuthToken(new URLSearchParams({ grant_type: "refresh_token", client_id: exchange.get("client_id")!, resource: oauthResource(), refresh_token: tokens.refresh_token }))).rejects.toMatchObject({ code: "invalid_grant" });
    });

    it("supports client revocation without exposing unknown tokens", async () => {
      const { exchange } = await authorization();
      const tokens = await exchangeOAuthToken(exchange);
      const revoke = (value: string) => oauthRevokeRoute.POST(formRequest("/api/pops/oauth/revoke", new URLSearchParams({ client_id: exchange.get("client_id")!, token: value })));
      expect((await revoke("unknown")).status).toBe(200);
      expect(await authenticateMcp(tokens.access_token)).not.toBeNull();
      expect((await revoke(tokens.refresh_token)).status).toBe(200);
      expect(await authenticateMcp(tokens.access_token)).toBeNull();
    });
  });

  describe("MCP endpoint", () => {
    it("initialises, lists tools and records a run through the same validation", async () => {
      const rpc = (body: unknown, auth: string | null = token) => mcpRoute.POST(api("/api/pops/mcp", { body, auth }));
      expect((await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, null)).status).toBe(401);

      const init = await (await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })).json();
      expect(init.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "pops" } });
      expect((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);

      const tools = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
      expect(tools.result.tools.map((t: { name: string }) => t.name)).toContain("pops_record_agent_run");

      const { task } = await createTask({ title: "MCP", workspace: "work" }, "human");
      const call = (key: string) =>
        rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "pops_record_agent_run", arguments: { taskId: task.id, report: report(key, { pipeline: "work-investigate-problem" }) } } });
      const recorded = await (await call("mcp-run-00001")).json();
      expect(recorded.result.isError).toBe(false);
      expect(recorded.result.structuredContent).toMatchObject({ duplicate: false });
      expect((await (await call("mcp-run-00001")).json()).result.structuredContent).toMatchObject({ duplicate: true });

      const bad = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "pops_record_agent_run", arguments: { taskId: task.id, report: { outcome: "nope" } } } })).json();
      expect(bad.result.isError).toBe(true);
      expect(await prisma.popsAgentRun.count({ where: { channel: "mcp" } })).toBe(1);
    });
  });

  describe("workflow demonstration across the four workspaces", () => {
    const scenarios = [
      { workspace: "learn", title: "Understand energy-based models", pipeline: "learn-textbook-anki" },
      { workspace: "writing", title: "Essay: is the replication crisis overstated?", pipeline: "writing-sources-counterarguments" },
      { workspace: "experiments", title: "Does prompt ordering change LLM grading?", pipeline: "experiment-design" },
      { workspace: "work", title: "Investigate flaky Reading River digest cron", pipeline: "work-investigate-problem" },
    ] as const;

    for (const scenario of scenarios) {
      it(`${scenario.workspace}: create → prompt → agent writes back → decide → second pipeline sees it`, async () => {
        // 1. An agent creates the task.
        const created = await (
          await tasksRoute.POST(api("/api/pops/v1/tasks", { body: { title: scenario.title, workspace: scenario.workspace, idempotencyKey: `demo-${scenario.workspace}-1` } }), undefined)
        ).json();
        const taskId = created.task.id as string;

        // 2. The owner selects a pipeline and gets a complete prompt.
        const loaded = (await loadPromptContext(taskId))!;
        const pipeline = (await loadPromptPipeline(scenario.pipeline))!;
        const playbook = await getCurrentPlaybook();
        const prompt = buildPipelinePrompt({ context: loaded.context, pipeline, playbook, idempotencyKey: `${taskId}.${scenario.pipeline}.demo0001`, apiBaseUrl: "https://petercurry.org", includePipelineReview: true });
        expect(prompt).toContain(scenario.title);
        expect(prompt).toContain(`\`${scenario.pipeline}\` v1`);

        // 3–4. The agent does the work and writes back, raising a decision.
        const cards =
          scenario.workspace === "learn"
            ? [{ title: "Three cards", kind: "anki_cards", cards: [{ id: "energy-based-model-energy-function-20261106", front: "In LeCun et al. (2006), what does an energy-based model assign to each configuration of variables?", back: "A scalar energy\n\nLower energy means more compatible.\n\nFurther reading:\nLeCun et al. (2006): https://example.org/ebm-tutorial.pdf" }] }]
            : [];
        const recorded = await runsRoute.POST(
          api(`/api/pops/v1/tasks/${taskId}/runs`, {
            body: report(`${taskId}.${scenario.pipeline}.demo0001`, {
              pipeline: scenario.pipeline,
              artefacts: cards,
              decisions: [{ question: "Proceed to the next pipeline?", options: [{ label: "Yes" }, { label: "Not yet" }], recommendation: "Yes" }],
              pipelineReview: "Instructions were clear.",
            }),
          }),
          params({ taskId }),
        );
        expect(recorded.status).toBe(201);

        // 5–6. POps shows the decision; the owner answers; the next prompt carries it.
        const decision = await prisma.popsDecision.findFirstOrThrow({ where: { taskId, status: "open" } });
        await answerDecision(decision.id, { chosenOption: "Yes", response: "Go on." });
        const next = buildPipelinePrompt({
          context: (await loadPromptContext(taskId))!.context,
          pipeline: (await loadPromptPipeline("general-next-step"))!,
          playbook,
          idempotencyKey: `${taskId}.general-next-step.demo0002`,
          apiBaseUrl: "https://petercurry.org",
          includePipelineReview: false,
        });
        expect(next).toContain("Decided — Proceed to the next pipeline?: Yes. Go on.");
        expect(next).toContain("Found LeCun et al.'s tutorial");
        const task = await prisma.popsTask.findUniqueOrThrow({ where: { id: taskId } });
        expect(task.status).toBe("active");
      });
    }
  });
});
