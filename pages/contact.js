import Head from "next/head";
import EmailLink from "../components/EmailLink";

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact — Peter Curry</title>
        <meta
          name="description"
          content="How to reach Peter Curry for collaborations, speaking, or project demos."
        />
      </Head>
      <section>
        <h1>Contact</h1>
        <p className="lead">
          The best way to reach me is by email. I also respond on LinkedIn.
        </p>
        <div className="list">
          <article className="card">
            <h2 className="card-title">Email</h2>
            <p>
              <EmailLink />
            </p>
          </article>
          <article className="card">
            <h2 className="card-title">LinkedIn</h2>
            <p>
              <a
                href="https://www.linkedin.com/in/peter-curry-5a2138153/"
                target="_blank"
                rel="noopener noreferrer"
              >
                linkedin.com/in/peter-curry-5a2138153
              </a>
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
