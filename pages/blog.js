import Head from "next/head";

const FEED_URL = "https://kingcnut.substack.com/feed";
const SUBSTACK_URL = "https://kingcnut.substack.com";
const SUBSCRIBE_URL = "https://kingcnut.substack.com/subscribe";
const MAX_SNIPPET_LENGTH = 220;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const stripHtml = (value) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const extractFirstImage = (html) => {
  if (!html) {
    return "";
  }
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
};

const readUrl = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.url || value.href || value.src || value["$"]?.url || value["$"]?.href || "";
};

const getImageUrl = (item) => {
  const candidates = [
    readUrl(item.enclosure),
    readUrl(item["media:thumbnail"]),
    readUrl(item["media:content"]),
    readUrl(item["itunes:image"]),
    readUrl(item.image)
  ];
  const fromContent = extractFirstImage(
    item["content:encoded"] || item.content || ""
  );

  return candidates.find(Boolean) || fromContent;
};

const toSnippet = (value) => {
  const text = stripHtml(value || "");
  if (!text) {
    return "";
  }
  if (text.length <= MAX_SNIPPET_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_SNIPPET_LENGTH).trim()}…`;
};

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

export default function Blog({ posts, hasError }) {
  const hasPosts = posts && posts.length > 0;

  return (
    <>
      <Head>
        <title>Blog — Peter Curry</title>
        <meta
          name="description"
          content="Selected writing by Peter Curry, hosted off-site with the latest Substack posts highlighted here."
        />
      </Head>
      <section>
        <h1>Blog</h1>
        <p className="lead">
          My longer-form writing lives on Substack, feel free to click any of the links to have a read.
        </p>
        {hasError ? (
          <p>
            The RSS feed is unavailable at the moment. You can still browse the
            full archive on Substack.
          </p>
        ) : null}

        {hasPosts ? (
          <div className="list" aria-label="Substack post previews">
            {posts.map((post) => (
              <article className="card post-card" key={post.url}>
                <div className="post-content">
                  <div className="card-meta">{formatDate(post.date)}</div>
                  <h3 className="card-title">{post.title}</h3>
                  {post.snippet ? <p>{post.snippet}</p> : null}
                  <a href={post.url} target="_blank" rel="noopener noreferrer">
                    Read on Substack
                  </a>
                </div>
                {post.image ? (
                  <a
                    className="post-image-link"
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${post.title}`}
                  >
                    <img
                      className="post-image"
                      src={post.image}
                      alt=""
                      loading="lazy"
                    />
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p>New posts will appear here once the feed is loaded.</p>
        )}

        <div className="button-row">
          <a
            className="button"
            href={SUBSTACK_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read on Substack
          </a>
          <a
            className="button"
            href={SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Subscribe
          </a>
        </div>
      </section>
    </>
  );
}

export async function getStaticProps() {
  try {
    const { default: Parser } = await import("rss-parser");
    const parser = new Parser({
      customFields: {
        item: [
          "content:encoded",
          "enclosure",
          "media:thumbnail",
          "media:content",
          "itunes:image",
          "image"
        ]
      }
    });
    const feed = await parser.parseURL(FEED_URL);

    const posts = (feed.items || [])
      .map((item) => {
        const content =
          item.contentSnippet || item.content || item["content:encoded"] || "";
        return {
          title: item.title || "Untitled post",
          date: item.isoDate || item.pubDate || "",
          snippet: item.contentSnippet || toSnippet(content),
          url: item.link || SUBSTACK_URL,
          image: getImageUrl(item)
        };
      })
      .filter((post) => post.url);

    return {
      props: {
        posts,
        hasError: false
      },
      revalidate: 3600
    };
  } catch (error) {
    return {
      props: {
        posts: [],
        hasError: true
      },
      revalidate: 3600
    };
  }
}
