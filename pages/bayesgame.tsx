import fs from "fs/promises";
import Head from "next/head";
import Link from "next/link";
import path from "path";
import BayesGame from "@/components/BayesGame";

type BayesGamePageProps = {
  explanationMarkdown: string;
};

type ExplanationBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "rule" };

function parseExplanation(markdown: string): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  let paragraphLines: string[] = [];
  let hasHeading = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    paragraphLines = [];
  };

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (trimmed === "---") {
      flushParagraph();
      blocks.push({ type: "rule" });
      return;
    }

    if (!hasHeading) {
      blocks.push({ type: "heading", text: trimmed });
      hasHeading = true;
      return;
    }

    paragraphLines.push(trimmed);
  });

  flushParagraph();
  return blocks;
}

function BayesExplanation({ markdown }: { markdown: string }) {
  const blocks = parseExplanation(markdown);

  return (
    <section
      className="bayes-explanation-section"
      id="whats-going-on"
      aria-labelledby="whats-going-on-title"
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 id="whats-going-on-title" key={`${block.type}-${index}`}>
              {block.text}
            </h2>
          );
        }

        if (block.type === "rule") {
          return <hr key={`${block.type}-${index}`} />;
        }

        return <p key={`${block.type}-${index}`}>{block.text}</p>;
      })}
    </section>
  );
}

function BayesGamePage({ explanationMarkdown }: BayesGamePageProps) {
  return (
    <>
      <Head>
        <title>Bayesian Optimisation Game - Peter Curry</title>
        <meta
          name="description"
          content="Browser game about Bayesian optimisation."
        />
      </Head>
      <section className="bayes-game-page">
        <a className="bayes-explanation-link" href="#whats-going-on">
          What’s going on?
        </a>
        <Link className="bayes-return-link" href="/projects">
          Return to my website
        </Link>
        <div className="bayes-game-intro">
          <h1>Beat the Bayesian optimiser</h1>
          <p className="lead">
            The player and a nefarious AI known as the Optimiser search the same hidden
            landscape for the highest point. Click anywhere in the grid, and try to
            score higher than the AI.
          </p>
        </div>
        <BayesGame />
        <BayesExplanation markdown={explanationMarkdown} />
      </section>
    </>
  );
}

export async function getStaticProps() {
  const explanationPath = path.join(
    process.cwd(),
    "Bayesian_Optimisation",
    "Bayesian_Optimisation.md"
  );
  const explanationMarkdown = await fs.readFile(explanationPath, "utf8");

  return {
    props: {
      explanationMarkdown,
    },
  };
}

BayesGamePage.hideSiteLayout = true;

export default BayesGamePage;
