"use server";

import type { PopsWorkspace } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAgentCredential, revokeAgentCredential } from "@/lib/pops/agent-auth";
import { isTaskStatus, isWorkspace } from "@/lib/pops/constants";
import { createPipeline, reviewProposal, savePipelineVersion, savePlaybookVersion, setPipelineArchived } from "@/lib/pops/library";
import { parsePastedReport } from "@/lib/pops/report-import";
import { answerDecision, recordAgentRun, recordRunFeedback, withdrawDecision } from "@/lib/pops/runs";
import { requireOwner } from "@/lib/pops/session";
import { addTaskNote, createTask, keepTask, linkTasks, setTaskStatus, snoozeTask, updateTask } from "@/lib/pops/tasks";
import { formatZodError } from "@/lib/pops/validation";
import { ZodError } from "zod";

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const tags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
const taskPath = (id: string) => `/pops/tasks/${id}`;

function withError(path: string, error: unknown): never {
  const message =
    error instanceof ZodError
      ? formatZodError(error).map((i) => `${i.path || "input"}: ${i.message}`).join("; ")
      : error instanceof Error
        ? error.message
        : "Something went wrong.";
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message.slice(0, 300))}`);
}

function refresh(...paths: string[]) {
  revalidatePath("/pops", "layout");
  for (const path of paths) revalidatePath(path);
}

// --- Tasks -----------------------------------------------------------------

export async function createTaskAction(formData: FormData) {
  await requireOwner();
  const workspace = str(formData, "workspace");
  const back = str(formData, "back") || "/pops";
  let id: string;
  try {
    const { task } = await createTask(
      {
        title: str(formData, "title"),
        description: str(formData, "description"),
        workspace: isWorkspace(workspace) ? workspace : "learn",
        projectTags: tags(str(formData, "tags")),
        parentId: str(formData, "parentId") || undefined,
      },
      "human",
    );
    id = task.id;
  } catch (error) {
    withError(back, error);
  }
  refresh();
  redirect(taskPath(id));
}

export async function addSubtaskAction(formData: FormData) {
  await requireOwner();
  const parentId = str(formData, "parentId");
  const workspace = str(formData, "workspace");
  try {
    await createTask(
      { title: str(formData, "title"), workspace: isWorkspace(workspace) ? workspace : "learn", parentId },
      "human",
    );
  } catch (error) {
    withError(taskPath(parentId), error);
  }
  refresh(taskPath(parentId));
  redirect(taskPath(parentId));
}

export async function updateTaskAction(formData: FormData) {
  await requireOwner();
  const id = str(formData, "id");
  const workspace = str(formData, "workspace");
  try {
    await updateTask(id, {
      title: str(formData, "title"),
      description: String(formData.get("description") ?? ""),
      workspace: isWorkspace(workspace) ? (workspace as PopsWorkspace) : undefined,
      projectTags: tags(str(formData, "tags")),
      suggestedNextAction: str(formData, "suggestedNextAction"),
      recommendedPipelines: formData.getAll("recommendedPipelines").map(String).filter(Boolean),
    });
  } catch (error) {
    withError(taskPath(id), error);
  }
  refresh(taskPath(id));
  redirect(taskPath(id));
}

export async function setStatusAction(formData: FormData) {
  await requireOwner();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!isTaskStatus(status)) withError(taskPath(id), new Error("Unknown status"));
  await setTaskStatus(id, status);
  refresh(taskPath(id));
  redirect(str(formData, "back") || taskPath(id));
}

export async function addNoteAction(formData: FormData) {
  await requireOwner();
  const id = str(formData, "id");
  const url = str(formData, "url");
  try {
    if (url && !/^(https?|obsidian):\/\//i.test(url)) throw new Error("Links must start with http(s):// or obsidian://");
    await addTaskNote(id, { text: String(formData.get("text") ?? ""), url: url || undefined });
  } catch (error) {
    withError(taskPath(id), error);
  }
  refresh(taskPath(id));
  redirect(`${taskPath(id)}#history`);
}

export async function linkTaskAction(formData: FormData) {
  await requireOwner();
  const id = str(formData, "id");
  try {
    await linkTasks(id, str(formData, "targetId"), str(formData, "note"));
  } catch (error) {
    withError(taskPath(id), error);
  }
  refresh(taskPath(id));
  redirect(taskPath(id));
}

export async function snoozeAction(formData: FormData) {
  await requireOwner();
  await snoozeTask(str(formData, "id"));
  refresh();
  redirect(str(formData, "back") || "/pops");
}

export async function keepAction(formData: FormData) {
  await requireOwner();
  await keepTask(str(formData, "id"));
  refresh();
  redirect(str(formData, "back") || "/pops");
}

// --- Agent results, decisions, feedback ----------------------------------------

export type ImportState = {
  status: "idle" | "ok" | "error";
  message: string;
  issues?: { path: string; message: string }[];
};

export async function importReportAction(_previous: ImportState, formData: FormData): Promise<ImportState> {
  await requireOwner();
  const taskId = str(formData, "taskId");
  const parsed = parsePastedReport(String(formData.get("report") ?? ""));
  if (!parsed.ok) return { status: "error", message: parsed.error, issues: parsed.issues };
  if (parsed.taskId && parsed.taskId !== taskId) {
    return { status: "error", message: `This report is for task ${parsed.taskId}, not this one.` };
  }
  try {
    const { duplicate } = await recordAgentRun(taskId, parsed.report as never, { channel: "import" });
    refresh(taskPath(taskId));
    return {
      status: "ok",
      message: duplicate ? "Already imported — nothing was duplicated." : "Imported. The run is now in the history below.",
    };
  } catch (error) {
    if (error instanceof ZodError) return { status: "error", message: "The report is malformed.", issues: formatZodError(error) };
    return { status: "error", message: error instanceof Error ? error.message : "Import failed." };
  }
}

export async function answerDecisionAction(formData: FormData) {
  await requireOwner();
  const taskId = str(formData, "taskId");
  try {
    await answerDecision(str(formData, "decisionId"), {
      chosenOption: str(formData, "chosenOption"),
      response: String(formData.get("response") ?? ""),
    });
  } catch (error) {
    withError(taskPath(taskId), error);
  }
  refresh(taskPath(taskId));
  redirect(`${taskPath(taskId)}#decisions`);
}

export async function withdrawDecisionAction(formData: FormData) {
  await requireOwner();
  const taskId = str(formData, "taskId");
  await withdrawDecision(str(formData, "decisionId"));
  refresh(taskPath(taskId));
  redirect(`${taskPath(taskId)}#decisions`);
}

export async function feedbackAction(formData: FormData) {
  await requireOwner();
  const taskId = str(formData, "taskId");
  const runId = str(formData, "runId");
  try {
    await recordRunFeedback(runId, {
      useful: str(formData, "useful") === "yes",
      reason: str(formData, "reason"),
      comments: String(formData.get("comments") ?? ""),
    });
  } catch (error) {
    withError(taskPath(taskId), error);
  }
  refresh(taskPath(taskId));
  redirect(`${taskPath(taskId)}#run-${runId}`);
}

// --- Pipelines and playbook ------------------------------------------------------

function workspaceOrNull(value: string): PopsWorkspace | null {
  return isWorkspace(value) ? value : null;
}

export async function savePipelineAction(formData: FormData) {
  await requireOwner();
  const slug = str(formData, "slug");
  const path = `/pops/pipelines/${slug}`;
  try {
    await savePipelineVersion(slug, {
      name: str(formData, "name"),
      summary: str(formData, "summary"),
      workspace: workspaceOrNull(str(formData, "workspace")),
      instructions: String(formData.get("instructions") ?? ""),
      expectedEvidence: String(formData.get("expectedEvidence") ?? ""),
      changeNote: str(formData, "changeNote"),
      proposalId: str(formData, "proposalId") || undefined,
    });
  } catch (error) {
    withError(`${path}?edit=1`, error);
  }
  refresh(path, "/pops/pipelines");
  redirect(path);
}

export async function createPipelineAction(formData: FormData) {
  await requireOwner();
  const slug = str(formData, "slug").toLowerCase();
  try {
    await createPipeline({
      slug,
      name: str(formData, "name"),
      summary: str(formData, "summary"),
      workspace: workspaceOrNull(str(formData, "workspace")),
      instructions: String(formData.get("instructions") ?? ""),
      expectedEvidence: String(formData.get("expectedEvidence") ?? ""),
      changeNote: str(formData, "changeNote"),
      proposalId: str(formData, "proposalId") || undefined,
    });
  } catch (error) {
    const proposalId = str(formData, "proposalId");
    withError(`/pops/pipelines/new${proposalId ? `?proposal=${proposalId}` : ""}`, error);
  }
  refresh("/pops/pipelines");
  redirect(`/pops/pipelines/${slug}`);
}

export async function archivePipelineAction(formData: FormData) {
  await requireOwner();
  const slug = str(formData, "slug");
  await setPipelineArchived(slug, str(formData, "archived") === "true");
  refresh("/pops/pipelines", `/pops/pipelines/${slug}`);
  redirect(`/pops/pipelines/${slug}`);
}

export async function savePlaybookAction(formData: FormData) {
  await requireOwner();
  try {
    await savePlaybookVersion({
      content: String(formData.get("content") ?? ""),
      changeNote: str(formData, "changeNote"),
      baseVersion: Number(str(formData, "baseVersion")),
      proposalId: str(formData, "proposalId") || undefined,
    });
  } catch (error) {
    withError("/pops/playbook?edit=1", error);
  }
  refresh("/pops/playbook");
  redirect("/pops/playbook");
}

export async function reviewProposalAction(formData: FormData) {
  await requireOwner();
  const decision = str(formData, "decision");
  await reviewProposal(
    str(formData, "proposalId"),
    decision === "accept" ? "accepted" : "rejected",
    str(formData, "reviewNote") || (decision === "accept" ? "Noted" : "Rejected"),
  );
  const back = str(formData, "back") || "/pops/playbook";
  refresh(back);
  redirect(back);
}

// --- Agent credentials -------------------------------------------------------------

export type CredentialState = { token: string | null; error: string | null };

export async function createCredentialAction(_previous: CredentialState, formData: FormData): Promise<CredentialState> {
  await requireOwner();
  try {
    const { token } = await createAgentCredential(str(formData, "name"), formData.getAll("scopes").map(String));
    revalidatePath("/pops/connect");
    return { token, error: null };
  } catch (error) {
    return { token: null, error: error instanceof Error ? error.message : "Could not create the credential." };
  }
}

export async function revokeCredentialAction(formData: FormData) {
  await requireOwner();
  await revokeAgentCredential(str(formData, "id"));
  refresh("/pops/connect");
  redirect("/pops/connect");
}
