import type { PopsWorkspace } from "@prisma/client";
import { ANKI_DEFAULT_DECK, ANKI_INBOX_PATH, ANKI_INBOX_REPO } from "@/lib/pops/constants";

export type DefaultPipeline = {
  slug: string;
  name: string;
  workspace: PopsWorkspace | null;
  summary: string;
  instructions: string;
  expectedEvidence: string;
};

export const DEFAULT_PIPELINES: DefaultPipeline[] = [
  {
    slug: "learn-intro-pair",
    name: "Introductory article and video",
    workspace: "learn",
    summary: "One introductory article and one introductory video by credible human experts.",
    instructions: `Find exactly one introductory article and one introductory video on the task's topic.

- Prefer material made by identifiable experts: university lecturers, textbook authors, researchers, or long-standing educational producers. Check the author's credentials.
- Favour resources deliberately structured for teaching over news, listicles, SEO pages and AI-generated explainers.
- Check that each resource is genuinely introductory: state its assumed background and length.
- If the obvious choice is weak, say why and give the better alternative.
- Do not write your own explanation of the topic beyond two sentences of orientation.`,
    expectedEvidence: "Two sources (article, video) with author, credentials, URL, length and assumed background; one sentence each on why it was chosen over alternatives.",
  },
  {
    slug: "learn-textbook-anki",
    name: "Textbook chapter → three Anki cards",
    workspace: "learn",
    summary: "Find an appropriate textbook chapter and write three introductory cards grounded in it.",
    instructions: `Find one appropriate textbook chapter (or lecture-notes chapter by a named academic) on the topic, then write three introductory Anki cards grounded in that chapter.

Source:
- Identify book, edition, author, chapter and section numbers, and a link (publisher page, author's free copy, or library record).
- Prefer standard texts used in university courses. Say who uses it.

Cards — match Peter's existing detailed style:
- Front: a precise question, often anchored to a named source or quotation, with exactly one clear answer.
- Back: the answer alone on the first line. Then short paragraphs separated by blank lines: the core idea, a concrete example, a common confusion or contrast, and a limitation or caveat.
- End the back with "Further reading:" followed by one citation per line in the form "Author (year), Title: URL". The chapter must be cited.
- Every factual claim must be supported by the chapter or another cited, identifiable source. Do not rely on your own unsourced explanation.
- Card ids: lowercase-hyphenated topic plus a date stamp YYYYMMDD, 8–80 characters, e.g. "energy-based-model-partition-function-20261106".
- Deck: "${ANKI_DEFAULT_DECK}" unless the task says otherwise.

Put the cards in the report as an artefact of kind "anki_cards". Each card uses the Quiz Trainer inbox format: {"version":1,"id","deck","front","back"}.
If you have a GitHub connector and Peter explicitly confirms in this conversation, you may create one file per card at ${ANKI_INBOX_PATH}/<id>.json in ${ANKI_INBOX_REPO} on main. Never overwrite existing files.`,
    expectedEvidence: "The chapter citation with link; three cards in the anki_cards artefact; for each card, which section supports it.",
  },
  {
    slug: "learn-advanced",
    name: "Advanced treatment and original sources",
    workspace: "learn",
    summary: "A more advanced treatment, its prerequisites, and the original sources.",
    instructions: `Find one advanced treatment of the topic (graduate text, review article, or advanced lecture series), its prerequisites, and the original source(s) where the key idea was introduced.

- List prerequisites as concrete topics with one good resource each, only where Peter is unlikely to already know them given previous work on this task.
- For original sources give full citations and links; note if the modern formulation differs from the original.
- Note any active debate or known errors in the literature.`,
    expectedEvidence: "One advanced treatment, a short prerequisite list with resources, and original-source citations with links.",
  },
  {
    slug: "explore-related-question",
    name: "Investigate a related question",
    workspace: "learn",
    summary: "Pick one interesting adjacent question or knowledge gap and investigate it briefly.",
    instructions: `Propose up to three interesting questions adjacent to the task, choose the one most likely to deepen understanding, and investigate it.

- Prefer questions that connect the topic to something Peter has worked on (see previous work and tags).
- Answer with sources, not speculation. Mark clearly where the evidence is thin.
- If the question deserves its own task, recommend creating one in nextActions.`,
    expectedEvidence: "The candidate questions, the chosen question with a sourced answer, and whether it deserves a separate task.",
  },
  {
    slug: "writing-sources-counterarguments",
    name: "Primary sources and counterarguments",
    workspace: "writing",
    summary: "Find primary sources, the strongest counterarguments, and unexpected connections for an argument.",
    instructions: `For the essay or argument described in the task:

1. Restate the central claim in one sentence. If it is unclear, raise a decision instead of guessing.
2. Find primary sources that bear directly on it (original texts, data, first-hand accounts). Quote briefly and cite precisely.
3. Find the two or three strongest counterarguments made by serious people, with citations. Steelman them.
4. Note one or two non-obvious connections to other fields or thinkers.

Do not write the essay. If Peter has shared Obsidian notes, read them only; never write to the vault.`,
    expectedEvidence: "Primary sources with exact locations (page, section, timestamp), counterarguments with their authors, and connection notes.",
  },
  {
    slug: "writing-book-critique",
    name: "Research and critique a book",
    workspace: "writing",
    summary: "Situate a book, summarise its argument, and gather the best critical responses.",
    instructions: `For the book named in the task:

- Summarise its central argument in at most five sentences, with chapter references.
- Gather the most substantive reviews and critical responses (academic reviews, expert critics), with links.
- Identify factual claims that have been contested, and what the evidence now says.
- Suggest two or three angles for Peter's own critique, each with supporting evidence.`,
    expectedEvidence: "Reviews and responses with links and authors, contested claims with sources, and candidate critique angles.",
  },
  {
    slug: "experiment-design",
    name: "Design an experiment",
    workspace: "experiments",
    summary: "Turn an idea into a concrete experiment with hypotheses and evaluation criteria.",
    instructions: `Turn the experimental idea into a design:

- Hypotheses: explicit, falsifiable, with the expected direction of effect.
- Method: materials, procedure, controls and baselines.
- Evaluation: metrics, success and failure criteria decided in advance, and the analysis plan.
- Prior work: closest existing experiments, with citations, and how this differs.
- Risks and confounds.

Do not run anything that costs money or uses paid compute. If running a cheap pilot would help, describe it and raise a decision.`,
    expectedEvidence: "A design (hypotheses, method, evaluation criteria) and cited prior work.",
  },
  {
    slug: "experiment-cost-feasibility",
    name: "Estimate cost and feasibility",
    workspace: "experiments",
    summary: "Estimate money, compute and time, and judge whether the experiment is feasible.",
    instructions: `Estimate what the experiment would require:

- Compute: hardware, hours, and current list prices with links and the date checked.
- Money: total range, with the assumptions that drive it.
- Time: Peter's hands-on time versus waiting time.
- Feasibility verdict and the cheapest version that still answers the main question.

Never purchase, reserve, sign up, or start any paid resource.`,
    expectedEvidence: "Cost table with sources for prices, assumptions, and a feasibility verdict.",
  },
  {
    slug: "experiment-review-results",
    name: "Review experiment results",
    workspace: "experiments",
    summary: "Check results against the pre-registered criteria and recommend what to do next.",
    instructions: `Review the results Peter has provided against the evaluation criteria recorded in previous work.

- Did the results meet the success criteria? Say so plainly.
- Check for analysis errors, leakage, confounds and multiple-comparison problems.
- Separate what the results show from what they suggest.
- Recommend the next experiment or a stop, as a decision if judgement is needed.`,
    expectedEvidence: "Criterion-by-criterion assessment, identified problems, and a recommended next step.",
  },
  {
    slug: "work-investigate-problem",
    name: "Investigate a technical or operational problem",
    workspace: "work",
    summary: "Find the cause of a problem with evidence, and propose fixes.",
    instructions: `Investigate the problem described in the task.

- Reproduce or locate it: logs, code, issues, documentation. Link to exact lines, commits or issues.
- Distinguish observed facts from hypotheses.
- Propose fixes ranked by risk and effort.
- Use GitHub and other tools read-only unless Peter explicitly authorises a write in this conversation. Never merge, deploy or message anyone.`,
    expectedEvidence: "Links to code, logs or issues supporting the diagnosis; ranked fix options.",
  },
  {
    slug: "work-plan-change",
    name: "Plan a software change",
    workspace: "work",
    summary: "An implementation plan, affected files, tests and a draft PR description.",
    instructions: `Plan the software change described in the task.

- Read the relevant code first. List affected files with links.
- Give a step-by-step plan, the tests that should change, and migration or rollout risks.
- Draft a pull request description.
- You may open a draft PR only if Peter explicitly asks in this conversation. Never merge, deploy or push to a shared branch.`,
    expectedEvidence: "Plan, affected files with links, test plan, and draft PR text (or the draft PR link if authorised).",
  },
  {
    slug: "work-prepare-decision",
    name: "Prepare a decision, meeting or message",
    workspace: "work",
    summary: "A short brief: the question, options, evidence and a draft message if needed.",
    instructions: `Prepare what Peter needs for the decision, meeting or communication in the task.

- State the question to be decided and the deadline if known.
- Give two to four options with consequences and evidence.
- Recommend one only where the evidence justifies it.
- If a message is needed, draft it in Peter's plain style. Never send it.
Record the core choice as a decision in the report.`,
    expectedEvidence: "A decision with options and evidence; any draft message as an artefact.",
  },
  {
    slug: "general-next-step",
    name: "Clarify and propose the next step",
    workspace: null,
    summary: "For a vague task: clarify what done means and propose the smallest useful next step.",
    instructions: `The task may be loosely specified.

- Propose what "done" means in one or two sentences.
- Suggest two or three subtasks and which existing pipeline suits each.
- Identify the single smallest next step that would most reduce the remaining work.
- Raise a decision if a choice of direction is needed before work can start.`,
    expectedEvidence: "A definition of done, suggested subtasks with pipelines, and the recommended next step.",
  },
];

export const DEFAULT_PLAYBOOK = `# POps agent playbook

## What useful assistance means
The aim is to minimise the human work remaining to achieve something, not to maximise output. A good run leaves Peter with fewer, clearer things to do: a found source, a checked fact, a narrowed decision. A long report that Peter must read and verify is often worse than a short one.

## Source quality
- Prefer material deliberately structured by human experts: textbooks, lectures, peer-reviewed papers, essays by recognised authors, official documentation.
- Prefer original sources to summaries of them. Give exact locations (chapter, page, timestamp, line).
- Treat LLM-generated explanations, content farms and unattributed pages as unreliable. Never cite yourself.
- When sources disagree, say so and say which is stronger.

## Brevity and output standards
- Lead with what was accomplished. One short paragraph is usually enough.
- Link evidence instead of restating it.
- Separate facts, inferences and guesses.
- Use British English.

## Autonomy and permissions
- Do the work that can be done without Peter. Ask only when a choice genuinely needs his judgement, and ask as a decision with options.
- The foundational permission boundaries in every prompt are absolute and outrank this playbook.

## Preferred methods by task type
- Learning: find, then ground. Search for expert-made material before explaining anything.
- Writing: material and critique, not finished prose.
- Experiments: design and estimate before anything runs.
- Work: read code and evidence before proposing; draft but never send, merge or deploy.

## Feedback-derived preferences
(Add preferences here as feedback accumulates.)
`;
