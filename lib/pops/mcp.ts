import type { AgentPrincipal } from "@/lib/pops/agent-auth";
import { agentOps, describeError } from "@/lib/pops/agent-ops";
import { buildOpenApiDocument } from "@/lib/pops/openapi";

/**
 * A deliberately small, stateless MCP server (Streamable HTTP transport, JSON
 * responses only). It exposes the same operations as the REST API through the
 * same validation and permission checks.
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const paths = buildOpenApiDocument().paths as Record<string, Record<string, { requestBody?: { content: { "application/json": { schema: object } } } }>>;
const bodySchema = (path: string, method = "post") => paths[path][method].requestBody!.content["application/json"].schema;

const taskId = { taskId: { type: "string", description: "POps task id" } };

export const MCP_TOOLS = [
  {
    name: "pops_list_tasks",
    description: "List POps tasks. Defaults to active and paused tasks.",
    inputSchema: { type: "object", properties: { workspace: { type: "string", enum: ["learn", "writing", "experiments", "work", "personal"] }, status: { type: "string" }, tag: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_get_task",
    description: "Get a task's full context: description, previous agent runs, decisions, notes and suitable pipelines.",
    inputSchema: { type: "object", required: ["taskId"], properties: taskId },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_get_task_brief",
    description: "Get a portable task status with history and decisions but no workflow instructions.",
    inputSchema: { type: "object", required: ["taskId"], properties: taskId },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_get_pipeline_prompt",
    description: "Get the complete instructions for running one pipeline on one task, including the idempotencyKey to report with.",
    inputSchema: { type: "object", required: ["taskId", "pipeline"], properties: { ...taskId, pipeline: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_list_pipelines",
    description: "List pipeline templates with their current instructions.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_get_playbook",
    description: "Read the shared agent playbook.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "pops_create_task",
    description: "Create a POps task when Peter asks for one. Supply an idempotencyKey so retries do not duplicate it.",
    inputSchema: bodySchema("/tasks"),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "pops_update_task",
    description: "Edit only the title, description, tags, or workspace Peter asks you to change. Read pops_get_task first and copy task.updatedAt into patch.expectedUpdatedAt. Omitted fields stay unchanged; projectTags replaces all tags. If the task changed, read it again before editing. Cannot change task status.",
    inputSchema: { type: "object", required: ["taskId", "patch"], properties: { ...taskId, patch: bodySchema("/tasks/{taskId}", "patch") } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  {
    name: "pops_record_agent_run",
    description: "Record the result of your work on a task, exactly once, using the idempotencyKey from the prompt. Never changes task status.",
    inputSchema: { type: "object", required: ["taskId", "report"], properties: { ...taskId, report: bodySchema("/tasks/{taskId}/runs") } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "pops_create_decision",
    description: "Ask Peter to decide something about a task.",
    inputSchema: { type: "object", required: ["taskId", "decision"], properties: { ...taskId, decision: bodySchema("/tasks/{taskId}/decisions") } },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "pops_relay_feedback",
    description: "Record feedback Peter gave you about a previous run, in his words.",
    inputSchema: {
      type: "object",
      required: ["runId", "useful"],
      properties: { runId: { type: "string" }, useful: { type: "boolean" }, reason: { type: "string" }, comments: { type: "string" } },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "pops_propose",
    description: "Propose a new pipeline, a pipeline change, a playbook change, or record an observation. Peter reviews it before it takes effect.",
    inputSchema: bodySchema("/proposals"),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
] as const;

async function callTool(principal: AgentPrincipal, name: string, args: Record<string, unknown>) {
  const s = (key: string) => (typeof args[key] === "string" ? (args[key] as string) : "");
  switch (name) {
    case "pops_list_tasks":
      return agentOps.listTasks(principal, { workspace: s("workspace") || undefined, status: s("status") || undefined, tag: s("tag") || undefined });
    case "pops_get_task":
      return agentOps.getTask(principal, s("taskId"));
    case "pops_get_task_brief":
      return agentOps.getTaskBrief(principal, s("taskId"));
    case "pops_get_pipeline_prompt":
      return agentOps.getPipelinePrompt(principal, s("taskId"), s("pipeline"));
    case "pops_list_pipelines":
      return agentOps.listPipelines(principal);
    case "pops_get_playbook":
      return agentOps.getPlaybook(principal);
    case "pops_create_task":
      return agentOps.createTask(principal, args as never);
    case "pops_update_task":
      return agentOps.updateTask(principal, s("taskId"), args.patch as never);
    case "pops_record_agent_run":
      return agentOps.recordRun(principal, s("taskId"), args.report as never, "mcp");
    case "pops_create_decision":
      return agentOps.createDecision(principal, s("taskId"), args.decision as never);
    case "pops_relay_feedback":
      return agentOps.recordFeedback(principal, s("runId"), { useful: args.useful === true, reason: s("reason"), comments: s("comments") });
    case "pops_propose":
      return agentOps.propose(principal, args as never);
    default:
      return undefined;
  }
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error: { code, message } };
}

export async function handleMcpMessage(principal: AgentPrincipal, message: JsonRpcRequest) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(message?.id, -32600, "Invalid request");
  }
  const isNotification = message.id === undefined;

  switch (message.method) {
    case "initialize": {
      const requested = String(message.params?.protocolVersion ?? "");
      return rpcResult(message.id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "pops", version: "1.1.0" },
        instructions:
          "POps is Peter Curry's personal task system. Read a task with pops_get_task before working on it. Record results once with pops_record_agent_run. Never change task status; the permission boundaries in each prompt are absolute.",
      });
    }
    case "ping":
      return rpcResult(message.id, {});
    case "tools/list":
      return rpcResult(message.id, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = String(message.params?.name ?? "");
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(principal, name, args);
        if (result === undefined) return rpcError(message.id, -32602, `Unknown tool: ${name}`);
        return rpcResult(message.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (error) {
        const described = describeError(error);
        return rpcResult(message.id, { content: [{ type: "text", text: JSON.stringify(described.body) }], isError: true });
      }
    }
    default:
      if (isNotification) return null;
      return rpcError(message.id, -32601, `Method not found: ${message.method}`);
  }
}
