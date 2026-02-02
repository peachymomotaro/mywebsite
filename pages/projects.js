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
const TYPE_SPEED_MS = 18;

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
      <section className="project-hero">
        <div className="project-hero-text">
          <h1>Projects</h1>
          <p className="lead">
            I am currently working for the Sustainability Accelerator at
            Chatham House on a project to create positive and optimistic visions
            of future worlds.
          </p>
          <p>
            <Link href="/contact">Contact me</Link> if you are interested in a demo or a walkthrough of the
            scenario-building workflow and supporting research, or read my blogs about future thinking both{" "}
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
      </section>

      <section>
        <h2>Scenario builder</h2>
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
      </section>

      <section className="generator-section">
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
      </section>

    </>
  );
}
