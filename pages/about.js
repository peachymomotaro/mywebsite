import Head from "next/head";

export default function About() {
  return (
    <>
      <Head>
        <title>About — Peter Curry</title>
        <meta
          name="description"
          content="Peter Curry is CTO and Co-Founder at Lucid Dot."
        />
      </Head>

      <section>
        <h1>About</h1>
        <p className="lead">I’m CTO and Co-Founder at Lucid Dot.</p>
        <p>
          If you’d like to see more, visit{" "}
          <a
            href="https://www.luciddot.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Lucid Dot
          </a>
          .
        </p>
      </section>
    </>
  );
}
