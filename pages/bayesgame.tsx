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
            The player and a toy Gaussian-process optimiser search the same hidden
            two-dimensional landscape. You choose experiments by hand; the
            optimiser chooses its own points using a small portfolio of acquisition
            strategies. At the end, the true landscape is revealed.
          </p>
        </div>
        <BayesGame />
      </section>
    </>
  );
}

BayesGamePage.hideSiteLayout = true;

export default BayesGamePage;
