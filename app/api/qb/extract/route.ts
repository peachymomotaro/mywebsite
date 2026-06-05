import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const questions = body.questions ?? [];

  if (!questions.length) {
    return NextResponse.json(
      { error: "No questions provided" },
      { status: 400 }
    );
  }

  const questionText = questions
    .map((q: any, index: number) => {
      return `
QUESTION ${index + 1}
Set: ${q.set?.year ?? ""} ${q.set?.name ?? ""}
Category: ${q.category ?? ""}
Subcategory: ${q.subcategory ?? ""}
Answer: ${q.answer_sanitized ?? ""}
Text: ${q.question_sanitized ?? ""}
`;
    })
    .join("\n\n");

    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `
        You are creating Anki-style flashcards from QBReader search results.

        The user searched for: ${body.query ?? "the supplied term"}

        Use the QBReader questions as a quiz-canon map.
        Do not copy quiz-bowl wording.
        Do not write tossups.
        Do not include explanation, headings, source notes, numbering, or analysis.

        Write exactly three self-contained flashcards.

        Card structure:
        - Card 1: The answer must be the original searched term.
        - Card 2: The answer should be something closely bound to the searched term, providing valuable context for it.
        - Card 3: The answer should push one step outward into the surrounding quiz canon, while still being clearly connected to the searched term.

        Rules:
        - Each question should be detailed and self-contained, around 25–45 words.
        - Include concrete context: dates, places, named people, works, battles, institutions, dynasties, or distinctive facts where useful.
        - Each answer should be short: usually one person, place, event, work, group, or concept.
        - Prefer relationships and answerlines that appear in the QBReader results.
        - Do not use incidental clue names unless they are clearly important to the canon neighbourhood.
        - The answer must correctly match the question.

        Format exactly like this:

        Question text?
        Answer

        Question text?
        Answer

        Question text?
        Answer

        QBReader material:

        ${questionText}
        `,
        });

  return NextResponse.json({
    output: response.output_text,
  });
}