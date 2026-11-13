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

      <section className="reading-river-project" id="reading-river">
        <div className="reading-river-project-copy">
          <div className="project-kicker">Personal tool</div>
          <h2>Reading River</h2>
          <p className="lead">
            Reading River is a way to lower the pressure to read everything.
            It is for people who save more than they can possibly read, and
            want to make calmer choices about what deserves their attention.
          </p>
          <p>
            The idea, borrowed from Oliver Burkeman, is to treat your reading
            list as a river rather than a bucket. You wade in, choose something
            that catches your eye, and let the rest keep moving.
          </p>
        </div>
        <div className="reading-river-panels">
          <section className="reading-river-panel">
            <h3>Take a walk, not a queue</h3>
            <p>
              Save an article with the Chrome or Firefox extension, or add a link
              directly. Each day, a small selection from your collection drifts
              past as paper boats in a painted, three-dimensional riverside
              landscape. Walk along the bank, see what catches your eye, and
              choose how much reading time you have. There is no ranked list to
              work through and no search box demanding that you find the
              &ldquo;right&rdquo; thing.
            </p>
            <p>
              When you start reading, the piece moves into the <em>eddies</em>,
              a quiet pool where up to five unfinished articles wait for you.
              Finish one and its boat becomes a tree on the bank. Over time you
              grow a forest of what you have read, and you can return to those
              pieces later.
            </p>
            <p>
              One article from your river also arrives by email each day: a
              gentle invitation to read, not another digest to catch up on.
              The landscape takes small visual cues from paintings by Monet,
              Constable, Turner and others.
            </p>
          </section>

          <section className="reading-river-panel">
            <h3>The philosophy</h3>
            <p>
              Things can seem urgent when we first encounter them. Saving a
              link gives you permission not to read it now; letting it drift
              past later makes it easier to decide whether it still matters.
              Reading River is intentionally less efficient than a searchable
              backlog. The point is to spend more attention on reading, and
              less on managing things to read.
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
                <p>The original river-not-bucket idea, and the main inspiration for Reading River.</p>
              </li>
              <li>
                <a
                  href="https://davidepstein.substack.com/p/how-to-improve-your-information-diet"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  David Epstein, How To Improve Your Information Diet
                </a>
                <p>On making intentional choices about what information we consume.</p>
              </li>
              <li>
                <a
                  href="https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Andy Matuschak on programming attention
                </a>
                <p>Saving something can be a decision to pay attention later, rather than immediately.</p>
              </li>
            </ul>
          </section>
        </div>
        <div className="reading-river-contact-box">
          <p>
            You can explore the river without an account: the guest version lets
            you wander among 15 articles drawn from a fixed collection of 30.
            Reading River is also running a small beta for people who want
            their own river.
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

    </>
  );
}

Projects.wideContent = true;
