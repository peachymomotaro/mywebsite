import { agentRunSchema, formatZodError } from "@/lib/pops/validation";

export type ParsedImport =
  | { ok: true; taskId: string | null; report: unknown }
  | { ok: false; error: string; issues?: { path: string; message: string }[] };

/**
 * Accepts what ChatGPT prints when it cannot call POps directly: a fenced
 * `pops-report` (or json) block, or bare JSON. Either `{ taskId, report }`
 * or the report object itself.
 */
export function parsePastedReport(text: string): ParsedImport {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Paste the pops-report block from ChatGPT." };
  if (trimmed.length > 200_000) return { ok: false, error: "That paste is too large." };

  const fenced =
    /```pops-report\s*\n([\s\S]*?)```/i.exec(trimmed) ?? /```(?:json)?\s*\n([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { ok: false, error: "Could not find valid JSON in the paste." };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "The report must be a JSON object." };

  const wrapper = parsed as { taskId?: unknown; report?: unknown };
  const report = wrapper.report && typeof wrapper.report === "object" ? wrapper.report : parsed;
  const taskId = typeof wrapper.taskId === "string" ? wrapper.taskId : null;

  const check = agentRunSchema.safeParse(report);
  if (!check.success) {
    return { ok: false, error: "The report is incomplete or malformed.", issues: formatZodError(check.error) };
  }
  return { ok: true, taskId, report };
}
