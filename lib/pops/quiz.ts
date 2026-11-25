import type { PopsQuizMark } from "@prisma/client";
import { z } from "zod";
import { getPopsDb } from "@/lib/pops/db";

/**
 * Quiz marking. Quiz Trainer's weekly job uploads parsed quiz papers through
 * the agent API; Peter marks each question at /pops/quiz; the job reads the
 * marks back. Re-uploading a paper updates its wording but never its marks.
 */

export const QUIZ_MARKS = ["knew", "guessed", "tip_of_tongue", "no_idea", "skipped"] as const satisfies readonly PopsQuizMark[];

export const QUIZ_MARK_LABELS: Record<PopsQuizMark, string> = {
  knew: "Knew it",
  guessed: "Guessed",
  tip_of_tongue: "Tip of my tongue",
  no_idea: "No idea",
  skipped: "Skip",
};

export function isQuizMark(value: unknown): value is PopsQuizMark {
  return typeof value === "string" && (QUIZ_MARKS as readonly string[]).includes(value);
}

const text = (max: number) => z.string().trim().max(max);

export const quizQuestionSchema = z.object({
  position: z.number().int().min(1).max(500),
  section: text(80).default(""),
  label: text(40).default(""),
  text: z.string().trim().min(1).max(4000),
  answer: z.string().trim().min(1).max(1000),
});

export const quizPaperSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,100}$/, "Use 3-101 letters, numbers, '.', '_' or '-'"),
  circuit: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  setBy: text(200).default(""),
  editedBy: text(200).default(""),
  playedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullish(),
  sourceUrl: text(500).default(""),
  questions: z
    .array(quizQuestionSchema)
    .min(1)
    .max(500)
    .refine((qs) => new Set(qs.map((q) => q.position)).size === qs.length, "Question positions must be unique"),
});

export const quizUploadSchema = z.object({ papers: z.array(quizPaperSchema).min(1).max(20) });

export type QuizPaperInput = z.infer<typeof quizPaperSchema>;

export async function upsertQuizPapers(papers: QuizPaperInput[]) {
  const db = getPopsDb();
  let questions = 0;
  for (const paper of papers) {
    const playedOn = paper.playedOn ? new Date(`${paper.playedOn}T00:00:00Z`) : null;
    const fields = {
      circuit: paper.circuit,
      title: paper.title,
      setBy: paper.setBy,
      editedBy: paper.editedBy,
      playedOn,
      sourceUrl: paper.sourceUrl,
    };
    await db.$transaction(async (tx) => {
      await tx.popsQuizPaper.upsert({ where: { id: paper.id }, create: { id: paper.id, ...fields }, update: fields });
      for (const q of paper.questions) {
        const content = { section: q.section, label: q.label, text: q.text, answer: q.answer };
        await tx.popsQuizQuestion.upsert({
          where: { paperId_position: { paperId: paper.id, position: q.position } },
          create: { paperId: paper.id, position: q.position, ...content },
          update: content,
        });
      }
    });
    questions += paper.questions.length;
  }
  return { papers: papers.length, questions };
}

export async function listQuizMarks(args: { since?: Date | null; limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 500, 1), 2000);
  const rows = await getPopsDb().popsQuizQuestion.findMany({
    where: { markedAt: args.since ? { gt: args.since } : { not: null } },
    orderBy: [{ markedAt: "asc" }, { id: "asc" }],
    take: limit,
    select: { paperId: true, position: true, label: true, mark: true, markedAt: true },
  });
  return {
    marks: rows.map((r) => ({ ...r, markedAt: r.markedAt?.toISOString() ?? null })),
    next: rows.length === limit ? rows[rows.length - 1].markedAt?.toISOString() ?? null : null,
  };
}

export async function listQuizPapers() {
  const db = getPopsDb();
  const papers = await db.popsQuizPaper.findMany({
    where: { archivedAt: null },
    orderBy: [{ playedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
  });
  const counts = await db.popsQuizQuestion.groupBy({
    by: ["paperId"],
    where: { paperId: { in: papers.map((p) => p.id) } },
    _count: { _all: true, mark: true },
  });
  const byPaper = new Map(counts.map((c) => [c.paperId, { total: c._count._all, marked: c._count.mark }]));
  return papers.map((p) => ({ ...p, ...(byPaper.get(p.id) ?? { total: 0, marked: 0 }) }));
}

export async function getQuizPaper(id: string) {
  return getPopsDb().popsQuizPaper.findUnique({
    where: { id },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

export async function setQuizMark(questionId: string, mark: PopsQuizMark | null, now = new Date()) {
  const result = await getPopsDb().popsQuizQuestion.updateMany({
    where: { id: questionId },
    data: { mark, markedAt: now },
  });
  if (!result.count) throw new Error("That question no longer exists.");
}

export async function setQuizPaperArchived(id: string, archived: boolean, now = new Date()) {
  await getPopsDb().popsQuizPaper.updateMany({ where: { id }, data: { archivedAt: archived ? now : null } });
}

/** Counts per mark for a paper's summary. */
export function summariseMarks(questions: { mark: PopsQuizMark | null }[]) {
  const summary: Record<PopsQuizMark | "unmarked", number> = {
    knew: 0,
    guessed: 0,
    tip_of_tongue: 0,
    no_idea: 0,
    skipped: 0,
    unmarked: 0,
  };
  for (const q of questions) summary[q.mark ?? "unmarked"] += 1;
  return summary;
}
