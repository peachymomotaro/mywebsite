import Head from "next/head";
import Link from "next/link";

export default function Projects() {
  return (
    <>
      <Head>
        <title>Projects — Peter Curry</title>
        <meta
          name="description"
          content="Projects by Peter Curry, including machine-learning experiments and Reading River."
        />
      </Head>
      <header className="project-page-header">
        <h1>Projects</h1>
      </header>

      <section className="reading-river-project" id="reading-river">
        <div className="reading-river-project-copy">
          <div className="project-kicker">Personal tool</div>
          <h2>Reading River</h2>
          <p className="lead">
            Reading River is a way to lower the pressure to read everything.
            It is for people who save more articles than they can read.
          </p>
          <p>
            The idea comes from Oliver Burkeman: a reading list should be
            more like a river than a bucket. You wade in, choose something
            that interests you, and let the rest pass.
          </p>
        </div>
        <div className="reading-river-panels">
          <section className="reading-river-panel">
            <h3>How it works</h3>
            <p>
              Save a link directly or use the Chrome or Firefox extension.
              Each day, 16 articles are drawn from your collection. They float
              past as paper boats in a three-dimensional riverside scene. You
              can walk along the bank, look at their titles, and open one.
            </p>
            <p>
              Opening an article moves it to the <em>eddies</em>, a pool that
              holds up to five pieces you have started reading. You can return
              to them later or send them back to the river. Finish an article
              and a golden tree grows on the bank. The trees stay where they
              were planted; you can walk up to one to reread its article.
            </p>
            <p>
              The river borrows details from paintings. Monet&apos;s Japanese
              bridge crosses the water, and Turner&apos;s <em>Fighting Temeraire</em>
              is towed downstream. There is also a daily email containing
              an article from your saved collection.
            </p>
          </section>

          <section className="reading-river-panel">
            <h3>The philosophy</h3>
            <p>
              Something can seem urgent when you first come across it.
              Leave a link for a few days and you may no longer want to read it.
              I wanted a reading list that I could return to without feeling
              that I had a backlog to clear.
            </p>
            <ul className="reading-river-source-list">
              <li>
                <a
                  href="https://www.oliverburkeman.com/river"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Oliver Burkeman on the river
                </a>
                <p>The source of the river-not-bucket idea.</p>
              </li>
              <li>
                <a
                  href="https://davidepstein.substack.com/p/how-to-improve-your-information-diet"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  David Epstein, How To Improve Your Information Diet
                </a>
                <p>On being deliberate about what you read.</p>
              </li>
              <li>
                <a
                  href="https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Andy Matuschak on programming attention
                </a>
                <p>On using spaced repetition to direct attention over time.</p>
              </li>
            </ul>
          </section>
        </div>
        <div className="reading-river-contact-box">
          <p>
            You can try the guest river without an account. Each visit
            shows 15 articles chosen from a fixed pool of 30. To start saving
            your own links, join the beta waiting list.
          </p>
          <Link className="button reading-river-guest-link" href="/reading-river/guest">
            Explore the guest river
          </Link>
          <p>
            <Link href="/reading-river/waiting-list">Join the beta waiting list</Link>
            {" · "}
            <Link href="/reading-river/how-it-works">How Reading River works</Link>
          </p>
        </div>
      </section>

      <section className="capstone-project" id="exploring-bayesian-optimisers">
        <span id="capstone-bo" className="legacy-anchor" aria-hidden="true" />
        <div className="project-kicker">Machine learning capstone</div>
        <h2>Exploring Bayesian Optimisers</h2>
        <p className="lead">
          Bayesian optimisation and Gaussian Processes.
        </p>
        <p>
          From 2025 to 2026, I completed a Machine Learning course at Imperial College 
          in order to develop my ML skills. One of the required outputs was a black-box 
          optimisation (BBO) challenge, which involved optimising eight functions. Each 
          function took a continuous input vector and returned a single output score. We had no 
          information on the functions except for a series of previous inputs and output. 
        </p>
        <p>
          A classic problem in both machine learning and life is the explore-exploit trade-off.
          Is it worth listening to a new album that you might enjoy, or relistening to an old album 
          that you know you love? This project offered a gamified way of thinking about that trade-off. 
          Should we explore new areas or exploit areas that already seemed promising?
        </p>
        <p>
          There are plenty of scenarios where these decisions matter in the real world. 
          Let's say we could send ten robots to Mars because we want to drill and collect a sample.
          Where should we land these robots so that our last robot gives us the highest
          possible yield of our sample? To give a more concrete example, choosing the hyperparameter 
          settings of a neural network can be modelled in this way. 
        </p>
        <p className="lead">
          Play the Game.
        </p>
        <p>
          If you're interested in the technical side, you can read the notes below or you 
          can see the{" "}
          <a
            href="https://github.com/peachymomotaro/capstone/"
            target="_blank"
            rel="noopener noreferrer"
          >
            entire code on my GitHub
          </a>. 
          But to make this more fun, I also built a small browser game where you too can 
          try to beat a Bayesian Optimiser. 
        </p>
        <p>
          In the game, the player and a Gaussian-process optimiser search the same hidden 
          two-dimensional landscape. The player chooses points manually. The optimiser chooses 
          points using different strategies. At the end, the shape of the landscape is revealed.
        </p>
        <p>
          This demo is simpler than what a real project in this space might involve. 
          Firstly, it's two-dimensional, so you can actually see the landscape - everything is 
          harder in more dimensions! Secondly, it uses a lightweight Gaussian process rather 
          than a full BoTorch workflow. But the game is just to give you a flavour of the project.
        </p>
        <Link className="button capstone-game-link" href="/bayesgame">
          Play the Bayesian optimisation game
        </Link>
        <img
          className="capstone-game-preview"
          src="/BayesianOptimiser.png"
          alt="Bayesian optimisation game preview"
          loading="lazy"
        />
        <div className="capstone-technical-note">
          <h3>Technical note</h3>
          <p>
            The model uses a Gaussian process with an additive linear plus Matérn kernel, 
            and output transformations such as Box-Cox, sign-flipped Box-Cox, or Yeo-Johnson 
            where useful. The functions were small-data, continuous, and expensive to query, 
            so a Gaussian process was a natural starting point.
          </p>
          <p>
            Once the surrogate is fitted, the pipeline generates a mixed pool of
            candidate points:
          </p>
          <ul>
            <li>Global Sobol samples, designed to preserve broad coverage of the search space.</li>
            <li>Trust-region candidates, concentrating search around the current most promising area.</li>
            <li>Elite-region candidates, which look around several of the best observed points, preserving promising alternatives.</li>
          </ul>
          <p>
            Each candidate is then scored using several acquisition-style signals, 
            including expected improvement (EI), log expected improvement (logEI), 
            probability of improvement (PI), upper confidence bound set with a range 
            of betas (UCB), Thompson-style scores, posterior uncertainty, and novelty. 
          </p>
          <p>
            <a
              href="https://github.com/peachymomotaro/capstone/blob/main/docs/Model_Card.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to the Model Card
            </a>
          </p>
        </div>
      </section>


    </>
  );
}

Projects.wideContent = true;
