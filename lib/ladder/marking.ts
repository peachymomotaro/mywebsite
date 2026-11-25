import checkAnswer from "qb-answer-checker";

export type Verdict = "accept" | "prompt" | "reject";

// Words a player can leave out: "Dien Bien Phu" for "Battle of Dien Bien Phu",
// "Turkey" for "Republic of Turkey". Never numerals: Henry VII != Henry VIII.
const GENERIC = new Set([
  "a", "an", "the", "of", "and", "battle", "siege", "treaty", "kingdom",
  "empire", "dynasty", "republic", "state", "states", "pope", "saint", "st",
  "king", "queen", "emperor", "empress", "president", "sir", "lord", "lady",
  "general", "admiral", "prince", "princess", "duke", "tsar", "czar", "shah",
  "sultan", "caliph", "pharaoh", "chief", "justice", "prime", "minister",
  "operation", "reforms", "reform", "movement", "party", "system", "river",
  "city", "island", "islands", "people", "peoples", "culture", "civilization",
]);

const ROMAN = /^(?=[ivxlcdm]+$)m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return fold(text).split(" ").filter(Boolean);
}

function numerals(words: string[]): string {
  return words.filter((w) => /^\d+$/.test(w) || (w.length <= 5 && ROMAN.test(w) && w !== "i"))
    .sort()
    .join(" ");
}

function core(words: string[]): string {
  const kept = words.filter((w) => !GENERIC.has(w));
  return (kept.length ? kept : words).join(" ");
}

/** Optimal-string-alignment distance (Levenshtein plus adjacent swaps). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function close(guess: string, target: string): boolean {
  if (!guess || !target) return false;
  if (guess === target) return true;
  const len = Math.max(guess.length, target.length);
  if (len < 5) return false;
  const allowed = Math.min(3, Math.floor(len / 5));
  return editDistance(guess.replace(/ /g, ""), target.replace(/ /g, "")) <= allowed;
}

/** Answer forms worth matching: the printed head, each underlined span, and
 *  each "or"/"accept" alternate. */
export function answerForms(answerHtml: string): { accept: string[]; reject: string[] } {
  const accept = new Set<string>();
  const reject: string[] = [];
  for (const m of answerHtml.matchAll(/<u>(.*?)<\/u>/gi)) accept.add(m[1]);
  const plain = answerHtml.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const [head, ...rest] = plain.split(/[[(]/);
  accept.add(head.replace(/\(.*?\)/g, ""));
  const bracket = rest.join("(");
  for (const clause of bracket.split(/[;\])]/)) {
    const c = clause.trim();
    if (/^(?:do not accept|do not take|reject|don't accept)/i.test(c)) {
      for (const part of c.replace(/^(?:do not accept|do not take|reject|don't accept)\s*(?:or)?/i, "")
        .split(/\bor\b|,/)) reject.push(part.replace(/["“”]/g, "").trim());
    } else if (/^(?:or|accept|also accept)\b/i.test(c)) {
      for (const part of c.replace(/^(?:also accept|accept|or)\s*/i, "").split(/\bor\b|,/)) {
        const p = part.replace(/["“”]/g, "").replace(/\b(?:until|before|after) .*$/i, "").trim();
        if (p) accept.add(p);
      }
    }
  }
  return { accept: [...accept].filter((s) => fold(s)), reject: reject.filter((s) => fold(s)) };
}

/**
 * Judge a typed answer. QB Reader's own checker goes first (it knows
 * "prompt on" and "do not accept"); then a lenient pass forgives generic words
 * and small typos, in the spirit of Catfishing. Explicit rejects always win.
 */
export function judge(answerHtml: string, guess: string): Verdict {
  const given = guess.trim();
  if (!given) return "reject";
  const official = checkAnswer(answerHtml, given).directive as Verdict;
  if (official === "accept" || official === "prompt") return official;

  const { accept, reject } = answerForms(answerHtml);
  const g = tokens(given);
  const gCore = core(g);
  const gFull = g.join(" ");
  if (reject.some((r) => tokens(r).join(" ") === gFull || core(tokens(r)) === gCore)) {
    return "reject";
  }
  for (const form of accept) {
    const t = tokens(form);
    if (numerals(t) && numerals(t) !== numerals(g)) continue;
    if (close(gFull, t.join(" ")) || close(gCore, core(t))) return "accept";
  }
  return "reject";
}
