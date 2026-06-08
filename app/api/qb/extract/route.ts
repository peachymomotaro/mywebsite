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
        You are creating original ICC-style quiz questions from QBReader search results.

        The user searched for: ${body.query ?? "the supplied term"}

        Use the QBReader material as a quiz-canon map. It tells you which answerlines, clues, works, people, places, movements, dynasties, events, institutions, scientific concepts, and cultural objects are closely associated with the searched term.

        Your job is not to write Anki flashcards, pyramid tossups, or generic study notes. Write polished direct-answer quiz questions in the style of compact ICC bonus parts.

        CORE RULES:

        Do not copy quiz-bowl wording.
        Do not write tossups.
        Do not write Anki flashcards.
        Do not include explanations, source notes, analysis, translations, pronunciation guides, or metadata.
        Do not mention QBReader in the questions.
        Do not invent facts that are not supported by the QBReader material or by very basic common knowledge.
        Every question must have one clear answerline.

        Write exactly three direct-answer questions.

        RELATIONSHIP BETWEEN THE THREE QUESTIONS:
        QUESTION ONE: the answer must be the original searched term.
        QUESTION TWO: the answer should be a closely bound neighbouring answerline that appears in, or is strongly implied by, the QBReader material.
        QUESTION THREE: the answer should be based on the original searched term but should focus on a distinctive, concrete, slightly less obvious aspect of it.

        QUESTION STYLE:

        Each question should be one compact paragraph.
        Use 2 sentences where possible; 3 sentences maximum.
        Each question should usually be around 45–95 words.
        Start naturally with “Which…”, “What…”, “Name this…”, “Who…”, “In what…”, or a similar direct-answer prompt.
        The question should feel like an ICC bonus part, not a quiz-bowl tossup.
        Do not use “FTP”, “for 10 points”, “this man”, “this work”, or other tossup-style phrasing.
        Prefer fluent, natural wording over tortuous attempts to hide the answer.
        Avoid vague clue-piles. Every clue should help identify the answer.
        Use concrete, answer-identifying clues: named works, people, dates, places, quotations, scenes, institutions, doctrines, battles, mechanisms, or canonical examples.
        The question should be self-contained and understandable without seeing the original material.
        The final result should sound like something a human quiz editor would actually write.

        ANSWERLINE HANDLING:

        Preserve the answerline exactly unless a small cleanup is needed for spelling, accents, capitalization, or obvious formatting.
        Avoid using the exact answerline in the question text.
        Avoid using a distinctive part of the answerline if there is an easy, natural alternative.
        Do not contort the question to avoid every possible answer word.
        Generic category words are fine: “river”, “author”, “dynasty”, “movement”, “instrument”, “language family”, “disease”, “era”, “city”, “work”, “painting”, and similar.
        If avoiding an answer word would make the question awkward, vague, or misleading, prefer a natural question even if one answer-related word appears.

        GOOD MODEL EXAMPLES:

        QUESTION:
        Which Eugene O’Neill play is set in the living room of the Tyrone family’s summer home, whose stage directions specify shelves of books by authors such as Shakespeare, Balzac, Zola, Schopenhauer, Nietzsche, and Marx? Near the end of the play, Mary Tyrone comes downstairs carrying her old wedding dress, lost in a morphine-induced memory of practicing piano as a convent schoolgirl.
        ANS: Long Day’s Journey into Night

        QUESTION:
        What recurring weather phenomenon in Long Day’s Journey into Night is repeatedly noticed by Mary and Edmund Tyrone? Mary tells Cathleen that she loves this thing because “it hides you from the world and the world from you,” and it is often read as symbolising the family’s evasions and addictions.
        ANS: fog

        QUESTION:
        Which Middle English verse romance, surviving in the same manuscript as Pearl, Cleanness, and Patience, begins when a green stranger challenges Arthur’s court to exchange axe-blows? Its title knight later travels to the Green Chapel to receive the return stroke in that beheading game.
        ANS: Sir Gawain and the Green Knight

        QUESTION:
        Which Venezuelan president first became nationally known after leading a failed 1992 coup against Carlos Andrés Pérez? After winning power, he used oil revenues to fund leftist social programmes called the Bolivarian Missions, and he was succeeded after his death by Nicolás Maduro.
        ANS: Hugo Chávez

        BEFORE FINAL OUTPUT, SILENTLY CHECK:

        Does the answer correctly answer the question?
        Is the question phrased as a proper direct-answer quiz question?
        Does the question avoid giving away the full answerline?
        Does it sound like a compact ICC bonus part rather than a tossup or flashcard?
        Are the clues concrete rather than vague?

        OUTPUT FORMAT EXACTLY:

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