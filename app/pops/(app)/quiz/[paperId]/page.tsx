import Link from "next/link";
import { notFound } from "next/navigation";
import { QuizPlayer } from "@/components/pops/QuizPlayer";
import { formatDate } from "@/lib/pops/format";
import { getQuizPaper } from "@/lib/pops/quiz";

export const metadata = { title: "Mark quiz" };

export default async function QuizPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const paper = await getQuizPaper(paperId);
  if (!paper) notFound();

  return (
    <>
      <p className="pops-small"><Link href="/pops/quiz">← All quizzes</Link></p>
      <h1>{paper.title}</h1>
      <p className="pops-meta">
        {[paper.circuit, paper.playedOn ? formatDate(paper.playedOn) : null, paper.setBy ? `set by ${paper.setBy}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <QuizPlayer
        paperTitle={paper.title}
        questions={paper.questions.map((q) => ({
          id: q.id,
          position: q.position,
          section: q.section,
          label: q.label,
          text: q.text,
          answer: q.answer,
          mark: q.mark,
        }))}
      />
    </>
  );
}
