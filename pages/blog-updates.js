import Head from "next/head";
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

  const parts = text.split(tokenRegex);

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

export default function BlogUpdates() {
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
          Things I&apos;ve come across after publishing: later thoughts, new
          evidence, corrections, connections and developments that add to
          earlier posts.
        </p>

        {entries.length ? (
          <div className="list">
            {entries.map((entry) => (
              <article
                className="card"
                id={entry.id}
                key={entry.postUrl}
                >
                <div className="card-meta">Following up on</div>

                <p>
                  <a
                    href={entry.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>{entry.postTitle}</strong>
                  </a>
                </p>

                {entry.updates.map((update, index) => (
                  <div key={`${entry.postUrl}-${update.date}-${index}`}>
                    <div className="card-meta">
                      {formatDate(update.date)}
                    </div>

                    {update.note.split("\n\n").map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>
                            {renderInlineText(paragraph)}
                        </p>
                        ))}

                    {update.sourceUrl ? (
                      <p>
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
              </article>
            ))}
          </div>
        ) : (
          <p>No updates yet.</p>
        )}
      </section>
    </>
  );
}