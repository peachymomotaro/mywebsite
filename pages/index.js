import Head from "next/head";
import Link from "next/link";
import featuredPost from "../data/featuredPost";

const FEED_URL = "https://kingcnut.substack.com/feed";
const SUBSTACK_URL = "https://kingcnut.substack.com";
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

export default function Home({ latestPost }) {
  const featured = latestPost || featuredPost;

  return (
    <>
      <Head>
        <title>Peter Curry — Research, Podcasts, AI Tools</title>
        <meta
          name="description"
          content="The personal site of Peter Curry: research, podcast production, and applied AI scenario work."
        />
      </Head>
      <section>
        <h1>Hi, I’m Peter Curry.</h1>
        <p className="lead">
          I work at the intersection of research, podcast production, and AI
          tools. I translate complex ideas into clear narratives and concrete tools. 
        </p>
        <p className="lead">
          This site is a hub for my background, writing, audio projects,
          and scenario experiments.
        </p>
      </section>

      <section className="section-grid" aria-label="Quick links">
        <article className="card">
          <h3 className="card-title">About &amp; CV</h3>
          <p className="card-meta">Background, experience, and focus areas.</p>
          <Link href="/about">Go to About</Link>
        </article>
        <article className="card">
          <h3 className="card-title">Blog</h3>
          <p className="card-meta">Selected writing hosted off-site.</p>
          <Link href="/blog">View writing</Link>
        </article>
        <article className="card">
          <h3 className="card-title">Projects</h3>
          <p className="card-meta">AI scenarios and prototype work.</p>
          <Link href="/projects">Explore projects</Link>
        </article>
        <article className="card">
          <h3 className="card-title">Podcasts</h3>
          <p className="card-meta">Shows I’ve produced, edited, or hosted.</p>
          <Link href="/podcasts">See podcasts</Link>
        </article>
      </section>

      <section>
        <h2>Featured writing</h2>
        <article className="card post-card">
          <div className="post-content">
            <div className="card-meta">{formatDate(featured.date)}</div>
            <h3 className="card-title">{featured.title}</h3>
            {featured.snippet ? <p>{featured.snippet}</p> : null}
            <a href={featured.url} target="_blank" rel="noopener noreferrer">
              Read the latest post
            </a>
          </div>
          {featured.image ? (
            <a
              className="post-image-link"
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${featured.title}`}
            >
              <img
                className="post-image"
                src={featured.image}
                alt=""
                loading="lazy"
              />
            </a>
          ) : null}
        </article>
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
    const firstItem = (feed.items || [])[0];

    if (!firstItem) {
      return {
        props: {
          latestPost: null
        },
        revalidate: 3600
      };
    }

    const content =
      firstItem.contentSnippet ||
      firstItem.content ||
      firstItem["content:encoded"] ||
      "";

    const latestPost = {
      title: firstItem.title || featuredPost.title,
      date: firstItem.isoDate || firstItem.pubDate || featuredPost.date,
      snippet: firstItem.contentSnippet || featuredPost.snippet,
      url: firstItem.link || SUBSTACK_URL,
      image: getImageUrl(firstItem)
    };

    if (!latestPost.snippet && content) {
      latestPost.snippet = toSnippet(content);
    }

    return {
      props: {
        latestPost
      },
      revalidate: 3600
    };
  } catch (error) {
    return {
      props: {
        latestPost: null
      },
      revalidate: 3600
    };
  }
}
