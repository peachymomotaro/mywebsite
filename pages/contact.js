import Head from "next/head";
import EmailButton from "../components/EmailButton";

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
        <div className="contact-actions">
          <EmailButton className="button" />
          <a
            className="button"
            href="https://www.linkedin.com/in/peter-curry-5a2138153/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </section>
    </>
  );
}
