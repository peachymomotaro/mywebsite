/**
 * Seeds representative POps tasks for local demos and screenshots ONLY.
 * Refuses to run against anything but a local database whose name contains
 * "demo" — it must never populate the production backlog.
 *
 *   DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_demo \
 *     npx tsx scripts/pops-demo-seed.ts
 *
 * Local demo login: set POPS_PASSWORD=local-demo-password for `npm run dev`.
 */
import { createTask, setTaskStatus, linkTasks, addTaskNote } from "@/lib/pops/tasks";
import { ensurePopsDefaults, createProposal } from "@/lib/pops/library";
import { recordAgentRun, recordRunFeedback } from "@/lib/pops/runs";
import { getPopsDb } from "@/lib/pops/db";

const DAY = 24 * 60 * 60 * 1000;

function assertLocalDemoDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set.");
  const url = new URL(raw);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.pathname.includes("demo")) {
    throw new Error("Refusing to seed: DATABASE_URL must be a local database whose name contains 'demo'.");
  }
}

async function main() {
  assertLocalDemoDatabase();
  if ((await getPopsDb().popsTask.count()) > 0) {
    console.log("Demo database already has tasks; nothing to do.");
    return;
  }
  await ensurePopsDefaults();
  const now = Date.now();
  const at = (days: number) => new Date(now - days * DAY);

  const { task: ebm } = await createTask(
    {
      title: "Understand energy-based models",
      description: "Build enough intuition to read recent EBM and score-based diffusion papers without getting lost in notation.",
      workspace: "learn",
      projectTags: ["ml", "generative-models"],
      recommendedPipelines: ["learn-intro-pair", "learn-textbook-anki", "learn-advanced"],
    },
    "human",
    at(6),
  );
  const { run: introRun } = await recordAgentRun(
    ebm.id,
    {
      idempotencyKey: `${ebm.id}.learn-intro-pair.demo0001`,
      pipeline: "learn-intro-pair",
      agentName: "ChatGPT",
      outcome: "completed",
      attempted: "Find one introductory article and one introductory video by credible experts.",
      accomplished: "Chose LeCun et al.'s 2006 tutorial (article) and Stefano Ermon's CS236 lecture on EBMs (video).",
      sources: [
        { title: "A Tutorial on Energy-Based Learning", author: "LeCun, Chopra, Hadsell, Ranzato, Huang (2006)", kind: "paper", url: "http://yann.lecun.com/exdb/publis/pdf/lecun-06.pdf", note: "Sections 1–2 are the gentlest entry point." },
        { title: "Stanford CS236: Deep Generative Models — Energy-based models", author: "Stefano Ermon", kind: "lecture", url: "https://deepgenerativemodels.github.io/", note: "Assumes familiarity with VAEs." },
      ],
      uncertainties: "The lecture assumes you have seen normalising flows.",
      nextActions: ["Find a textbook chapter and write three grounded Anki cards"],
      suggestedNextAction: "Run the textbook → Anki pipeline",
    },
    { channel: "import", now: at(5) },
  );
  await recordRunFeedback(introRun.id, { useful: true, reason: "Good picks, right level" }, { now: at(5) });
  await recordAgentRun(
    ebm.id,
    {
      idempotencyKey: `${ebm.id}.learn-textbook-anki.demo0002`,
      pipeline: "learn-textbook-anki",
      agentName: "ChatGPT",
      outcome: "completed",
      attempted: "Find a textbook chapter on EBMs and write three introductory cards grounded in it.",
      accomplished: "Used Murphy, Probabilistic Machine Learning: Advanced Topics, ch. 24, and wrote three cards on energy functions, the partition function and contrastive divergence.",
      sources: [{ title: "Probabilistic Machine Learning: Advanced Topics, ch. 24 'Energy-based models'", author: "Kevin P. Murphy (2023)", kind: "textbook", url: "https://probml.github.io/pml-book/book2.html" }],
      artefacts: [
        {
          title: "Three introductory EBM cards",
          kind: "anki_cards",
          cards: [
            {
              version: 1,
              id: "energy-based-model-partition-function-20261106",
              deck: "Learning::1Injection::ButtressCards",
              front: "Kevin Murphy (2023) notes that an energy-based model defines p(x) ∝ exp(−E(x)). What normalising quantity makes maximum-likelihood training of EBMs hard?",
              back: "The partition function, Z\n\nZ = ∫ exp(−E(x)) dx sums the unnormalised density over every possible input, so it is intractable for images or text.\n\nIts gradient is an expectation under the model itself, which is why training needs samples from the model (for example via MCMC).\n\nFurther reading:\nMurphy (2023), Probabilistic Machine Learning: Advanced Topics, ch. 24: https://probml.github.io/pml-book/book2.html",
            },
          ],
        },
      ],
      uncertainties: "Card 3 on contrastive divergence simplifies Hinton's original argument.",
      nextActions: ["Review the cards", "Decide whether to go deeper on score matching"],
      decisions: [
        {
          question: "Go deeper on score matching now, or finish the textbook chapter first?",
          recommendation: "Finish the chapter first",
          options: [
            { label: "Finish the chapter first", explanation: "Score matching builds on §24.3" },
            { label: "Score matching now", explanation: "Closer to diffusion papers you want to read" },
          ],
          explanation: "Section 24.3 introduces the gradient-of-log-density view that score matching relies on.",
          evidence: [{ title: "Hyvärinen (2005), Estimation of Non-Normalized Statistical Models by Score Matching", url: "https://jmlr.org/papers/v6/hyvarinen05a.html" }],
        },
      ],
      pipelineReview: "Asking for the supporting section per card worked well.",
    },
    { channel: "api", now: at(1) },
  );
  await createTask({ title: "Contrastive divergence from first principles", workspace: "learn", parentId: ebm.id }, "human", at(4));

  const { task: essay } = await createTask(
    {
      title: "Essay: is the replication crisis overstated?",
      description: "Working claim: the crisis is real but concentrated in a few subfields. Need primary sources and the strongest opposing case.",
      workspace: "writing",
      projectTags: ["essays"],
      suggestedNextAction: "Run primary sources and counterarguments",
    },
    "human",
    at(3),
  );
  await addTaskNote(essay.id, { text: "My Obsidian note 'Replication' has the Many Labs links.", url: "obsidian://open?vault=Main&file=Replication" }, "human", at(3));

  const { task: experiment } = await createTask(
    {
      title: "Does answer ordering change LLM grading of quiz answers?",
      description: "Hypothesis: graders favour the first of two equally correct answers.",
      workspace: "experiments",
      projectTags: ["llm-eval"],
      recommendedPipelines: ["experiment-design", "experiment-cost-feasibility"],
    },
    "human",
    at(2),
  );
  await linkTasks(experiment.id, ebm.id, "", at(2));

  const { task: digest } = await createTask(
    {
      title: "Investigate duplicate Reading River digest emails",
      description: "Two crons fire at 07:00 and 08:00 UTC; some users get two emails around the clocks change.",
      workspace: "work",
      projectTags: ["reading-river"],
      recommendedPipelines: ["work-investigate-problem", "work-plan-change"],
    },
    "human",
    at(20),
  );
  await createProposal({
    kind: "playbook_observation",
    taskId: digest.id,
    title: "Prefer linking exact lines over quoting code",
    body: "Peter's feedback on two Work runs preferred permalinks to quoted snippets.",
  });

  const { task: paused } = await createTask({ title: "Read 'The Structure of Scientific Revolutions' critically", workspace: "writing" }, "human", at(70));
  await setTaskStatus(paused.id, "paused", at(60));
  const { task: done } = await createTask({ title: "Retire the Canon Explorer", workspace: "work" }, "human", at(9));
  await setTaskStatus(done.id, "completed", at(1));

  console.log("Seeded demo tasks.");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
