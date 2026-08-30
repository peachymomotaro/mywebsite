import Head from "next/head";
import { useEffect } from "react";
import { blogUpdates } from "../data/blogUpdates";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
};

const getLatestUpdateDate = (entry) => {
  const dates = entry.updates
    .map((update) => new Date(update.date).getTime())
    .filter((date) => !Number.isNaN(date));

  return dates.length ? Math.max(...dates) : 0;
};

const renderInlineText = (text) => {
  const tokenRegex =
    /(\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s)]+|\*[^*]+\*)/g;

  const parts = text.replace(/&#x20;/gi, " ").split(tokenRegex);

  const renderItalics = (value, keyPrefix) => {
    const pieces = value.split(/(\*[^*]+\*)/g);

    return pieces.map((piece, index) => {
      if (/^\*[^*]+\*$/.test(piece)) {
        return (
          <em key={`${keyPrefix}-${index}`}>
            {piece.slice(1, -1)}
          </em>
        );
      }

      return piece;
    });
  };

  return parts.map((part, index) => {
    const markdownLink = part.match(
      /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/
    );

    if (markdownLink) {
      const [, label, url] = markdownLink;

      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderItalics(label, `link-${index}`)}
        </a>
      );
    }

    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      );
    }

    return renderItalics(part, `text-${index}`);
  });
};

const renderParagraphs = (text) => {
  const lines = text.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    if (/^>\s?/.test(lines[index])) {
      const quoteLines = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      const quoteParagraphs = quoteLines
        .join("\n")
        .split(/\n\s*\n/)
        .filter(Boolean);
      const blockIndex = blocks.length;

      blocks.push(
        <blockquote
          className="blog-update-quote blog-update-note-quote"
          key={`quote-${blockIndex}`}
        >
          {quoteParagraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>{renderInlineText(paragraph)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const paragraphLines = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^>\s?/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    const blockIndex = blocks.length;

    blocks.push(
      <p key={`paragraph-${blockIndex}`}>
        {renderInlineText(paragraphLines.join("\n"))}
      </p>
    );
  }

  return blocks;
};

export default function BlogUpdates() {
  useEffect(() => {
    const openLinkedEntry = () => {
      const cards = Array.from(
        document.querySelectorAll("details.blog-update-card")
      );

      cards.forEach((card) => {
        card.open = false;
      });

      if (!window.location.hash) {
        return;
      }

      let linkedId;

      try {
        linkedId = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }

      const linkedCard = cards.find((card) => card.id === linkedId);

      if (!linkedCard) {
        return;
      }

      linkedCard.open = true;

      if (typeof linkedCard.scrollIntoView === "function") {
        linkedCard.scrollIntoView({ block: "start" });
      }
    };

    openLinkedEntry();
    window.addEventListener("hashchange", openLinkedEntry);

    return () => window.removeEventListener("hashchange", openLinkedEntry);
  }, []);

  const entries = [...blogUpdates]
    .filter((entry) => entry.updates?.length)
    .sort((a, b) => getLatestUpdateDate(b) - getLatestUpdateDate(a));

  return (
    <>
      <Head>
        <title>Blog Updates — Peter Curry</title>
        <meta
          name="description"
          content="Notes, corrections, new evidence and later thoughts following up on Peter Curry's blog posts."
        />
      </Head>

      <section>
        <h1>Blog Updates</h1>

        <p className="lead">
          Things I&apos;ve thought of after publishing, such as new
          evidence, corrections, connections and developments that add to
          earlier posts.
        </p>

        {entries.length ? (
          <div className="list">
            {entries.map((entry) => {
              const latestUpdateDate = getLatestUpdateDate(entry);
              const updateLabel = `${entry.updates.length} ${
                entry.updates.length === 1 ? "update" : "updates"
              }`;

              return (
                <details
                  className="card blog-update-card"
                  id={entry.id}
                  key={entry.postUrl}
                >
                  <summary className="blog-update-summary">
                    <span className="card-meta blog-update-summary-kicker">
                      Following up on
                    </span>
                    <strong className="blog-update-summary-title">
                      {entry.postTitle}
                    </strong>
                    <span className="blog-update-summary-meta">
                      {updateLabel}
                      {latestUpdateDate
                        ? ` · Latest ${formatDate(latestUpdateDate)}`
                        : ""}
                    </span>
                  </summary>

                  <div className="blog-update-card-content">
                    <p className="blog-update-entry-links">
                      <a
                        href={entry.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read the original post
                      </a>
                      <span aria-hidden="true">·</span>
                      <a
                        href={`#${entry.id}`}
                        aria-label={`Direct link to updates for ${entry.postTitle}`}
                      >
                        Direct link
                      </a>
                    </p>

                    {entry.updates.map((update, index) => (
                      <div
                        className="blog-update"
                        key={`${entry.postUrl}-${update.date}-${index}`}
                      >
                        <div className="card-meta blog-update-date">
                          {formatDate(update.date)}
                        </div>

                        {update.question ? (
                          <div className="blog-update-thread">
                            <section
                              className="blog-update-message blog-update-question"
                              aria-label={`Question from ${
                                update.questionAuthor || "Reader"
                              }`}
                            >
                              <div className="blog-update-message-header">
                                <span className="blog-update-message-kind">
                                  Question
                                </span>
                                <strong>
                                  {update.questionAuthor || "Reader"}
                                </strong>
                              </div>
                              <blockquote className="blog-update-quote">
                                {renderParagraphs(update.question)}
                              </blockquote>
                            </section>

                            <section
                              className="blog-update-message blog-update-response"
                              aria-label={`Response from ${
                                update.responseAuthor || "Peter Curry"
                              }`}
                            >
                              <div className="blog-update-message-header">
                                <span className="blog-update-message-kind">
                                  Response
                                </span>
                                <strong>
                                  {update.responseAuthor || "Peter Curry"}
                                </strong>
                              </div>
                              <div className="blog-update-message-copy">
                                {renderParagraphs(update.note)}
                              </div>
                            </section>
                          </div>
                        ) : (
                          renderParagraphs(update.note)
                        )}

                        {update.sourceUrl ? (
                          <p className="blog-update-source">
                            <a
                              href={update.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {update.sourceTitle || "Source"}
                            </a>
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p>No updates yet.</p>
        )}
      </section>
    </>
  );
}
