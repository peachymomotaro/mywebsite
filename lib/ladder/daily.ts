export type LadderQuestion = {
  id: string;
  leadin: string;
  text: string;
  answerHtml: string;
  answer: string;
  letters: string;
  clue: string | null;
  difficulty: number;
  set: string;
  year: number | null;
};

export type LadderRung = {
  rung: number;
  level: string;
  question: LadderQuestion;
  swap: LadderQuestion;
};

export type Ladder = {
  number: number;
  date: string;
  topic: string;
  path: string;
  rungs: LadderRung[];
};

const DAY_MS = 86_400_000;

/** The player's local calendar date as YYYY-MM-DD. */
export function localDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Latest date anyone on Earth can be on (UTC+14), so nobody gets a future ladder early. */
export function latestAllowedDate(now = new Date()): string {
  return new Date(now.getTime() + 14 * 3_600_000).toISOString().slice(0, 10);
}

/** Ladder number for a date, and which stored file serves it (they wrap yearly). */
export function ladderFor(date: string, start: string, stored: number) {
  const number = daysBetween(start, date) + 1;
  if (number < 1) return null;
  return { number, file: ((number - 1) % stored) + 1 };
}
