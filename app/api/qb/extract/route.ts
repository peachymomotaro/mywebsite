import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    });
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
        model: "gpt-5-mini",
        input: `
        You are creating original quiz questions from QBReader search results.

        The user searched for: ${body.query ?? "the supplied term"}

        Use the QBReader material as a quiz-canon map. It tells you which answerlines, clues, works, people, places, movements, dynasties, events, institutions, scientific concepts, and cultural objects are closely associated with the searched term.

        Do not copy quiz-bowl wording.
        Do not write tossups.
        Do not write Anki flashcards.
        Do not include explanations, headings beyond the required question labels, source notes, analysis, translations, pronunciation guides, or metadata.
        Do not mention QBReader in the questions.
        Do not invent facts that are not supported by the QBReader material or by very basic common knowledge.

        Write exactly three direct-answer questions.

        Relationship between the three questions:

        QUESTION ONE: the answer must be the original searched term.
        QUESTION TWO: the answer should be a closely bound neighbouring answerline that appears in, or is strongly implied by, the QBReader material.
        QUESTION THREE: the answer should move one step outward into the surrounding quiz canon while remaining clearly connected to the searched term.

        Question style:

        Each question should be one compact paragraph.
        Each question should be around 35-65 words.
        Each question should be self-contained.
        The main “what/which/to what/from what” question should usually appear near the start of the sentence.
        The question should not be pyramidal and should not feel like a quiz-bowl tossup.
        Prefer accessible but interesting clues over long chains of obscure clues.
        Include concrete context where useful: dates, places, named people, works, battles, institutions, dynasties, mechanisms, distinctive cultural details, or canonical examples.
        Avoid incidental clue names unless they are clearly important to the canon neighbourhood.
        The answer must correctly match the question.

        Good question shapes:

        “What [category] was founded / written / composed / built / developed by [person] in [date]?”
        “What [category] contains / includes / depicts / describes [concrete clue]?”
        “To what [category] do [examples] belong?”
        “From what [source/work/place] did [person/work] take its title/name?”
        “[Named work/event/object] was created by what [category of answer]?”

        Answerline handling:

        The question should not simply give away the answer.
        Avoid using the exact answerline in the question text.
        Avoid using a distinctive part of the answerline if there is an easy, natural alternative.
        Do not contort the question to avoid every possible answer word.
        Generic category words are fine: “river”, “author”, “dynasty”, “movement”, “instrument”, “language family”, “disease”, “era”, “city”, “work”, “painting”, and similar.
        If avoiding an answer word would make the question awkward, vague, or misleading, prefer a natural question even if one answer-related word appears.
        The final question should read like a real quiz question, not like a disguised flashcard.

        Answer style:

        Each answer should be short: usually one person, place, event, work, group, movement, dynasty, language family, disease, instrument, or concept.

        Before producing the final output, silently check each question:

        Does the answer correctly answer the question?
        Is the question phrased as a proper direct-answer quiz question?
        Does the question accidentally give away the full answerline?

        If a question gives away the full answerline, rewrite it. If avoiding a partial answer word would make the question worse, keep the natural wording.

        Output format exactly:

        QUESTION ONE
        Question text?
        ANS: Answer

        QUESTION TWO
        Question text?
        ANS: Answer

        QUESTION THREE
        Question text?
        ANS: Answer

        QBReader material:

        ${questionText}
        `,
        });

  return NextResponse.json({
    output: response.output_text,
  });
}