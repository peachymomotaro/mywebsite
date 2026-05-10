import Head from "next/head";
import Link from "next/link";
import BayesGame from "@/components/BayesGame";

function BayesGamePage() {
  return (
    <>
      <Head>
        <title>Bayesian Optimisation Game - Peter Curry</title>
        <meta
          name="description"
          content="Play a small browser game about Bayesian optimisation, exploration, exploitation, and scarce feedback."
        />
      </Head>
      <section className="bayes-game-page">
        <Link className="bayes-return-link" href="/projects">
          Return to my website
        </Link>
        <div className="bayes-game-intro">
          <p className="partner-label">Interactive capstone demo</p>
          <h1>Beat the Bayesian optimiser</h1>
          <p className="lead">
            The player and a nefarious AI known as the Optimiser search the same hidden
            landscape for the highest point. Click anywhere in the grid, and try to
            score higher than the AI.
          </p>
        </div>
        <BayesGame />
      </section>
    </>
  );
}

BayesGamePage.hideSiteLayout = true;

export default BayesGamePage;
