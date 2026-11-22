"use client";

import { useMemo, useState } from "react";

export type DiffLine = { kind: "added" | "removed"; text: string };

/** Small, exact line diff. Unchanged lines are omitted from the review. */
export function changedLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > 300_000) {
    let first = 0;
    while (first < a.length && first < b.length && a[first] === b[first]) first++;
    let left = a.length - 1;
    let right = b.length - 1;
    while (left >= first && right >= first && a[left] === b[right]) { left--; right--; }
    return [
      ...a.slice(first, left + 1).map((text) => ({ kind: "removed" as const, text })),
      ...b.slice(first, right + 1).map((text) => ({ kind: "added" as const, text })),
    ];
  }
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const changes: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) changes.push({ kind: "removed", text: a[i++] });
    else changes.push({ kind: "added", text: b[j++] });
  }
  return changes;
}

export function PipelineInstructionEditor({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const diff = useMemo(() => changedLines(current, value), [current, value]);
  const added = diff.filter((line) => line.kind === "added").length;
  const removed = diff.length - added;

  return (
    <>
      <details className="pops-more">
        <summary>Edit exact pipeline instructions</summary>
        <textarea id="p-instr" name="instructions" value={value} onChange={(e) => setValue(e.target.value)} required className="pops-code" aria-label="Pipeline instructions" />
      </details>
      {!diff.length ? (
        <p className="pops-small pops-muted">No instruction changes yet. Select suggestions above, then edit the instructions before saving.</p>
      ) : (
        <details className="pops-more">
          <summary>Exact change: {added} added, {removed} removed {added + removed === 1 ? "line" : "lines"}</summary>
          <div className="pops-pre" aria-label="Instruction changes">
            {diff.map((line, i) => (
              <div key={i} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: line.kind === "added" ? "var(--text)" : "var(--muted)" }}>
                {line.kind === "added" ? "+ " : "− "}{line.text}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
