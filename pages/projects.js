import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import scenarios from "../data/scenarios";

const TOOL_IMAGES = [
    {
    src: "/tool-preview-2.jpg",
    alt: "Mission Statement",
    label: "Building alternative futures",
    title: "Mission Statement",
    caption: "Traditional approaches to the future are stuck in familiar sets of assumptions. We need new tools to help us break free."
  },
  {
    src: "/tool-preview-1.jpg",
    alt: "Scenario builder interface showing prompts and scenario settings.",
    label: "Scenario builder",
    title: "Design your scenario",
    caption: "Define signals and seeds of the future and set parameters for generation."
  },
];

const CHATHAM_LOGO = "/chatham-house-logo.png";
const READING_RIVER_IMAGE = "/ReadingRiver.png";
const TYPE_SPEED_MS = 18;
const PROJECT_LINKS = [
  {
    label: "Scenario Builder",
    href: "#chatham-house",
  },
  {
    label: "Exploring Bayesian Optimisers",
    href: "#exploring-bayesian-optimisers",
  },
  {
    label: "Reading River",
    href: "#reading-river",
  },
];

const buildStoryText = (story) => {
  const lines = [];
  story.paragraphs.forEach((paragraph) => {
    lines.push(paragraph);
    lines.push("");
  });
  return lines.join("\n").trim();
};

export default function Projects() {
  const [output, setOutput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const timerRef = useRef(null);
  const storyCount = scenarios.length;
  const activeStyleLabel =
    isTyping && selectedIndex !== null ? scenarios[selectedIndex]?.title : "";

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  const pickRandomIndex = (max, avoidIndex) => {
    if (max <= 1) {
      return 0;
    }
    let next = Math.floor(Math.random() * max);
    while (next === avoidIndex) {
      next = Math.floor(Math.random() * max);
    }
    return next;
  };

  const handleGenerate = () => {
    if (isTyping || storyCount === 0) {
      return;
    }

    const chosenIndex = pickRandomIndex(storyCount, selectedIndex);
    const story = scenarios[chosenIndex];
    const text = buildStoryText(story);
    let index = 0;

    setOutput("");
    setIsTyping(true);
    setSelectedIndex(chosenIndex);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      index += 1;
      setOutput(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsTyping(false);
      }
    }, TYPE_SPEED_MS);
  };

  return (
    <>
      <Head>
        <title>Projects — Peter Curry</title>
        <meta
          name="description"
          content="AI scenario short stories created for a Chatham House project, plus a live sample generator."
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

      <section className="chatham-project" id="chatham-house">
        <div className="project-hero">
          <div className="project-hero-text">
            <h2>Scenario Builder</h2>
          <p className="lead">
            I am currently working with The Fizz, a start-up that have partnered with the
            Sustainability Accelerator at Chatham House. We're working on a project to create
            positive visions of future worlds. If you'd like to read more about
            the project, you can find write-ups from both Chatham House's
            Sustainability Accelerator{" "}
            <a
              href="https://accelerator.chathamhouse.org/article/ghosts-of-christmas-future-seasonal-sketches-from-the-fizz"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>{" "}
            and from the futurist David Bent{" "}
            <a
              href="https://exploringwhatsnext.substack.com/p/atelier-update-7-dec-2025?open=false#%C2%A7the-fizz"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>.
          </p>
          <p>
            <Link href="/contact">Contact me</Link>{" "}
            if you are interested in a demo or a walkthrough of the
            scenario-building workflow and supporting research, or read my blogs
            about future thinking both{" "}
            <a
              href="https://kingcnut.substack.com/p/future-thinking-an-introduction"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>{" "}
            and{" "}
            <a
              href="https://kingcnut.substack.com/p/future-thinking-the-default-mode"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>.
          </p>
          </div>
          <aside className="project-hero-panel">
            <div className="partner-label">In collaboration with</div>
            <img
              className="chatham-logo"
              src={CHATHAM_LOGO}
              alt="Chatham House logo"
            />
            <div className="partner-meta">
              Sustainability Accelerator · London, UK
            </div>
          </aside>
        </div>

        <div className="scenario-builder-preview">
          <p className="lead">
            A preview of the tool and the output.
          </p>
          <div className="snapshot-stack">
            {TOOL_IMAGES.map((image) => (
              <article className="snapshot-card" key={image.src}>
                <button
                  className="media-button snapshot-image"
                  type="button"
                  onClick={() => setActiveImage(image)}
                  aria-label={`Expand ${image.alt}`}
                >
                  <img src={image.src} alt={image.alt} loading="lazy" />
                </button>
                <div className="snapshot-content">
                  <div className="snapshot-label">{image.label}</div>
                  <h3 className="card-title">{image.title}</h3>
                  <p className="card-meta">{image.caption}</p>
                </div>
              </article>
            ))}
          </div>
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
        </div>

        <div className="generator-section">
          <h2>Generate a sample short story</h2>
          <p className="lead">
            Press the button to watch the tool draft a story from a future world.
          </p>
          <div className="generator-actions">
            <button
              className="button"
              type="button"
              onClick={handleGenerate}
              disabled={isTyping}
            >
              Generate
            </button>
            <span className="generator-status">{isTyping ? "Writing..." : ""}</span>
          </div>
          <div className="card typewriter-card" aria-live="polite">
            {isTyping && activeStyleLabel ? (
              <div className="style-chip-inline">{activeStyleLabel}</div>
            ) : null}
            {output ? (
              <div className="typewriter-output">{output}</div>
            ) : (
              <p className="card-meta">
                Click the button to generate a sample scenario.
              </p>
            )}
          </div>
        </div>
      </section>

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

    </>
  );
}
