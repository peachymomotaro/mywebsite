import { siteBaseUrl } from "@/lib/pops/agent-ops";

const id = { type: "string" };
const str = { type: "string" };
const strArr = { type: "array", items: str };
const taskPatch = {
  type: "object",
  additionalProperties: false,
  required: ["expectedUpdatedAt"],
  anyOf: [{ required: ["title"] }, { required: ["description"] }, { required: ["projectTags"] }, { required: ["workspace"] }],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 8000 },
    projectTags: { type: "array", maxItems: 12, items: { type: "string", maxLength: 40 }, description: "Replace all tags; use [] to clear them." },
    workspace: { type: "string", enum: ["learn", "writing", "experiments", "work", "personal"], description: "Move a task to another workspace without changing its id, status, or history." },
    expectedUpdatedAt: { type: "string", format: "date-time", description: "Copy task.updatedAt from getTask. If it changed, read the task again before editing." },
  },
};
const source = {
  type: "object",
  required: ["title"],
  properties: { title: str, url: str, author: str, kind: str, note: str },
};
const decision = {
  type: "object",
  required: ["question", "options"],
  properties: {
    question: str,
    recommendation: str,
    options: { type: "array", items: { type: "object", required: ["label"], properties: { label: str, explanation: str } } },
    explanation: str,
    evidence: { type: "array", items: source },
    idempotencyKey: str,
  },
};
const proposal = {
  type: "object",
  required: ["kind", "title", "body"],
  properties: {
    kind: { type: "string", enum: ["playbook_observation", "playbook_change", "pipeline_change", "new_pipeline"] },
    pipelineSlug: str,
    taskId: str,
    title: str,
    body: str,
    rationale: str,
    idempotencyKey: str,
  },
};
const report = {
  type: "object",
  required: ["idempotencyKey", "outcome", "attempted", "accomplished"],
  properties: {
    idempotencyKey: { type: "string", description: "Copy exactly from the POps prompt. Replays are safe." },
    pipeline: str,
    pipelineVersion: { type: "integer" },
    agentName: str,
    outcome: { type: "string", enum: ["completed", "partial", "blocked", "failed"] },
    attempted: str,
    accomplished: str,
    sources: { type: "array", items: source },
    artefacts: {
      type: "array",
      items: {
        type: "object",
        required: ["title"],
        properties: {
          title: str,
          kind: str,
          url: str,
          summary: str,
          cards: {
            type: "array",
            items: { type: "object", required: ["id", "front", "back"], properties: { version: { type: "integer" }, id: str, deck: str, front: str, back: str } },
          },
        },
      },
    },
    uncertainties: str,
    blockers: str,
    nextActions: strArr,
    suggestedNextAction: str,
    decisions: { type: "array", items: decision },
    proposals: { type: "array", items: proposal },
    pipelineReview: str,
  },
};
const ok = { "200": { description: "OK" }, "201": { description: "Created" } };
const taskIdParam = [{ name: "taskId", in: "path", required: true, schema: id }];

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "POps agent API",
      version: "1.1.0",
      description:
        "Private API for agents working on Peter Curry's POps tasks. Requires a POps agent credential as a bearer token. Agents cannot change task status, edit the playbook or edit pipelines directly.",
    },
    servers: [{ url: `${siteBaseUrl()}/api/pops/v1` }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
    security: [{ bearer: [] }],
    paths: {
      "/tasks": {
        get: {
          operationId: "listTasks",
          summary: "List tasks (active and paused by default)",
          parameters: [
            { name: "workspace", in: "query", schema: { type: "string", enum: ["learn", "writing", "experiments", "work", "personal"] } },
            { name: "status", in: "query", schema: { type: "string", enum: ["active", "paused", "completed", "archived"] } },
            { name: "tag", in: "query", schema: str },
          ],
          responses: ok,
        },
        post: {
          operationId: "createTask",
          summary: "Create a task (idempotent with idempotencyKey)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "workspace"],
                  properties: {
                    title: str,
                    description: str,
                    workspace: { type: "string", enum: ["learn", "writing", "experiments", "work", "personal"] },
                    projectTags: strArr,
                    parentId: str,
                    suggestedNextAction: str,
                    recommendedPipelines: strArr,
                    idempotencyKey: str,
                  },
                },
              },
            },
          },
          responses: ok,
        },
      },
      "/tasks/{taskId}": {
        get: { operationId: "getTask", summary: "Task context: details, previous runs, decisions, notes, pipelines", parameters: taskIdParam, responses: ok },
        patch: {
          operationId: "updateTask",
          summary: "Edit task title, description, tags, or workspace when Peter asks; read the current task first",
          parameters: taskIdParam,
          requestBody: { required: true, content: { "application/json": { schema: taskPatch } } },
          responses: { ...ok, "409": { description: "Task changed since it was read; fetch it again before editing" } },
        },
      },
      "/tasks/{taskId}/prompt": {
        get: {
          operationId: "getTaskPrompt",
          summary: "Status-only task brief or complete handoff with a reusable workflow",
          parameters: [...taskIdParam, { name: "pipeline", in: "query", required: false, schema: str }],
          responses: ok,
        },
      },
      "/tasks/{taskId}/runs": {
        post: {
          operationId: "recordAgentRun",
          summary: "Record the result of an agent run (idempotent)",
          parameters: taskIdParam,
          requestBody: { required: true, content: { "application/json": { schema: report } } },
          responses: { ...ok, "409": { description: "idempotencyKey reused with different content" } },
        },
      },
      "/tasks/{taskId}/decisions": {
        post: {
          operationId: "createDecision",
          summary: "Ask Peter to make a decision",
          parameters: taskIdParam,
          requestBody: { required: true, content: { "application/json": { schema: decision } } },
          responses: ok,
        },
      },
      "/runs/{runId}/feedback": {
        post: {
          operationId: "relayRunFeedback",
          summary: "Relay Peter's own feedback on a run",
          parameters: [{ name: "runId", in: "path", required: true, schema: id }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", required: ["useful"], properties: { useful: { type: "boolean" }, reason: str, comments: str } },
              },
            },
          },
          responses: ok,
        },
      },
      "/proposals": {
        post: {
          operationId: "proposeChange",
          summary: "Propose a pipeline or playbook change, or record an observation (reviewed by Peter)",
          requestBody: { required: true, content: { "application/json": { schema: proposal } } },
          responses: ok,
        },
      },
      "/playbook": { get: { operationId: "getPlaybook", summary: "Current shared agent playbook", responses: ok } },
      "/pipelines": { get: { operationId: "listPipelines", summary: "Pipeline templates with current instructions", responses: ok } },
    },
  };
}
