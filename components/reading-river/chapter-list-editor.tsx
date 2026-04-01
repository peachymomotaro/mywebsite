"use client";

import { useState } from "react";

type ChapterRow = {
  id: string;
  title: string;
  estimatedMinutes: string;
};

const INITIAL_ROWS: ChapterRow[] = [
  { id: "chapter-1", title: "", estimatedMinutes: "" },
  { id: "chapter-2", title: "", estimatedMinutes: "" },
];

export function ChapterListEditor() {
  const [rows, setRows] = useState(INITIAL_ROWS);

  return (
    <div className="editorial-panel-soft space-y-6">
      <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Chapters</h2>
          <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            Add each chapter as a lighter line in the ledger so the stream can rank it separately.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setRows((currentRows) => [
              ...currentRows,
              {
                id: `chapter-${currentRows.length + 1}`,
                title: "",
                estimatedMinutes: "",
              },
            ])
          }
          className="border-b border-[hsl(var(--border))] px-0 py-1 text-sm text-[hsl(var(--muted-foreground))]"
        >
          Add chapter
        </button>
      </div>

      <div className="divide-y divide-[hsl(var(--border))]">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-6 py-6 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
          >
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Chapter title</span>
              <input
                name="chapterTitle"
                type="text"
                defaultValue={row.title}
                placeholder={`Chapter ${index + 1}`}
                className="border-0 border-b border-[hsl(var(--border))] bg-transparent px-0 py-3 text-base shadow-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-0"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Minutes</span>
              <input
                name="chapterMinutes"
                type="number"
                min="0"
                defaultValue={row.estimatedMinutes}
                placeholder="15"
                className="border-0 border-b border-[hsl(var(--border))] bg-transparent px-0 py-3 text-base shadow-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-0"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setRows((currentRows) =>
                    currentRows.length > 1
                      ? currentRows.filter((currentRow) => currentRow.id !== row.id)
                      : currentRows,
                )
              }
                className="pb-3 text-sm text-[hsl(var(--muted-foreground))] underline-offset-4 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
