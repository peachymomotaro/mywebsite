import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const READING_RIVER_IMAGE = "/ReadingRiver.png";
const PROJECT_LINKS = [
  {
    label: "Exploring Bayesian Optimisers",
    href: "#exploring-bayesian-optimisers",
  },
  {
    label: "Reading River",
    href: "#reading-river",
  },
];

export default function Projects() {
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    if (!activeImage) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage]);

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

      <nav className="project-contents" aria-label="Project contents">
        <div className="partner-label">Contents</div>
        <ul>
          {PROJECT_LINKS.map((project) => (
            <li key={project.href}>
              <a href={project.href}>{project.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="capstone-project" id="exploring-bayesian-optimisers">
        <span id="capstone-bo" className="legacy-anchor" aria-hidden="true" />
        <div className="partner-label">Machine learning capstone</div>
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
          A classic problem in both machine learning and life is the explore-exploiit trade-off.
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
          <div className="partner-label">Personal tool</div>
          <h2>Reading River</h2>
          <p className="lead">
            Reading River is a way to lower the pressure to read everything. It 
            is aimed at people who spend a lot of time reading, and who want to make 
            calmer choices about what to read next. 
          </p>
          <p>
            The core idea is that your reading list should be more like a river
            than a bucket. You wade in at a spot, grab something you want to
            read, and then let the rest keep moving.
          </p>
        </div>
        <div className="reading-river-panels">
          {/*
          <section className="reading-river-panel">
            <h3>The Basics</h3>
            <ol>
              <li>Find things that you think are worth reading.</li>
              <li>
                Put them into the river, where they become fiches. Set how
                important each fiche is with the priority setting.
              </li>
              <li>When you want to read something, return to the river.</li>
            </ol>
          </section>
          */}

          <section className="reading-river-panel">
            <h3>The Philosophy and How It Works</h3>
            <p>
              Things often seem much more important than they are when we see them for the
              first time. Letting things sit lets us better assess how worthwhile they are.
              The Reading River can also send out an email including items from your River, 
              creating a small personal newsletter curated by you.
            </p>
            <p>
              If you set how long you have to read, it first winnows your list
              down to pieces that fit that time, falling back to shorter
              options if needed. Then it sorts by a simple equation that
              considers priority, reading time, and age.
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
                <p>The primary inspiration for the philosophy of the site, and the source of the idea that reading should be treated like a river, not a bucket.</p>
              </li>
              <li>
                <a
                  href="https://davidepstein.substack.com/p/how-to-improve-your-information-diet"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  David Epstein, How To Improve Your Information Diet
                </a>
                <p>
                  As David Epstein puts it: "With your information diet, the whole goal is to be intentional about what you’re consuming."
                  The Reading River adds an intentionality to your reading. 
                </p>
              </li>
              <li>
                <a
                  href="https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Andy Matuschak on programming attention
                </a>
                <p>
                  Reading River treats saving a link as a way of deciding to pay
                  attention later, not right now.
                </p>
              </li>
            </ul>
          </section>
        </div>
        <div className="reading-river-contact-box">
          <p>
            If you&apos;d like to join the Reading River beta, just drop me an email saying you'd like to try it and I'll get back to you.
          </p>
          <a href="mailto:curry.peter@googlemail.com?subject=Reading%20River">
            Sign up for the Reading River
          </a>
        </div>
        <button
          className="media-button reading-river-project-image"
          type="button"
          onClick={() =>
            setActiveImage({
              src: READING_RIVER_IMAGE,
              alt: "Reading River app screenshot"
            })
          }
          aria-label="Expand Reading River app screenshot"
        >
          <img
            src={READING_RIVER_IMAGE}
            alt="Reading River app screenshot"
            loading="lazy"
          />
        </button>
      </section>

      {activeImage ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="lightbox-close"
              type="button"
              onClick={() => setActiveImage(null)}
            >
              Close
            </button>
            <img
              className="lightbox-image"
              src={activeImage.src}
              alt={activeImage.alt}
            />
          </div>
        </div>
      ) : null}

    </>
  );
}

Projects.wideContent = true;
