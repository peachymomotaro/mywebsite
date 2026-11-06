import { WORKSPACES } from "@/lib/pops/constants";
import type { PopsWorkspace } from "@prisma/client";

type Option = { label: string; explanation?: string };
type Evidence = { title: string; url?: string };

/** Text to paste into ChatGPT when Peter wants help deciding. */
export function buildDecisionCopy(input: {
  task: { id: string; title: string; description: string; workspace: PopsWorkspace; suggestedNextAction: string };
  decision: { id: string; question: string; recommendation: string; options: Option[]; explanation: string; evidence: Evidence[] };
  recentWork: string[];
  baseUrl: string;
}) {
  const { task, decision } = input;
  const lines = [
    `I need to make a decision on a task in POps, my task system. Help me think it through briefly; do not decide for me.`,
    ``,
    `Task: ${task.title} (${WORKSPACES[task.workspace].label}, id ${task.id})`,
    task.description.trim() ? `Description: ${task.description.trim()}` : null,
    task.suggestedNextAction ? `Current suggested next action: ${task.suggestedNextAction}` : null,
    input.recentWork.length ? `Recent work:\n${input.recentWork.map((w) => `- ${w}`).join("\n")}` : null,
    ``,
    `Question: ${decision.question}`,
    `Options:`,
    ...decision.options.map(
      (o, i) => `${i + 1}. ${o.label}${o.label === decision.recommendation ? " (recommended)" : ""}${o.explanation ? ` — ${o.explanation}` : ""}`,
    ),
    decision.explanation ? `Context: ${decision.explanation}` : null,
    decision.evidence.length ? `Evidence:\n${decision.evidence.map((e) => `- ${e.title}${e.url ? ` ${e.url}` : ""}`).join("\n")}` : null,
    ``,
    `When I have decided, I will record it at ${input.baseUrl}/pops/tasks/${task.id}#decision-${decision.id}. Do not record the decision for me.`,
  ];
  return lines.filter((line) => line !== null).join("\n");
}
