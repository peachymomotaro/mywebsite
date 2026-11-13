/** Persisted, owner-controlled items are separate from task completion and agent output. */
export type ChecklistItem = {
  id: string;
  title: string;
  url: string | null;
  done: boolean;
};

export function safeChecklistUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function readChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ChecklistItem[] => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.done !== "boolean") return [];
    return [{ id: item.id, title: item.title, url: safeChecklistUrl(typeof item.url === "string" ? item.url : null), done: item.done }];
  }).slice(0, 100);
}

/** Only explicit Markdown bullet points are imported; a prose agent handoff is not a checklist. */
export function itemsFromSuggestedAction(source: string): Omit<ChecklistItem, "id" | "done">[] {
  return source.split(/\r?\n/).flatMap((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)\s*$/);
    if (!bullet) return [];
    const body = bullet[1].trim();
    const linked = body.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*[—–-]\s*(.+))?$/);
    const title = linked ? [linked[1].replace(/[\*_]/g, ""), linked[3]].filter(Boolean).join(" — ") : body.replace(/\*\*/g, "");
    if (!title.trim()) return [];
    return [{ title: title.slice(0, 300), url: linked ? safeChecklistUrl(linked[2]) : null }];
  }).slice(0, 30);
}
