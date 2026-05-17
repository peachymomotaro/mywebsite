import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the Reading River Chrome extension.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.policy}>
        <p className={styles.eyebrow}>Privacy Policy for Reading River</p>
        <h1 className={styles.title}>Privacy Policy</h1>

        <section className={styles.section}>
          <h2>Privacy Policy for Reading River</h2>
          <p>
            Reading River is a reading-list tool that lets users save webpages
            to their Reading River account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What the Chrome extension collects</h2>
          <p>
            When you sign in, the extension sends your email address and
            password to Reading River so your account can be authenticated. The
            extension stores an authentication token locally in your browser so
            you can remain signed in.
          </p>
          <p>
            When you save a page, the extension sends the page URL, page title,
            estimated reading time, and your selected priority setting to your
            Reading River account.
          </p>
          <p>
            The extension may inspect visible page text locally in your browser
            to estimate reading time. The full page text is not sent to Reading
            River by the extension.
          </p>
        </section>

        <section className={styles.section}>
          <h2>How the data is used</h2>
          <p>
            This data is used only to provide the Reading River service. This includes
            signing you in, saving pages to your account, and helping organise your
            reading list.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Data sharing</h2>
          <p>
            Reading River does not sell user data. Reading River does not
            transfer user data to third parties for advertising,
            creditworthiness, lending, or purposes unrelated to Reading
            River&apos;s single purpose.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Data storage</h2>
          <p>
            Saved reading items are stored in your Reading River account. The
            browser extension stores only the local authentication token needed
            to keep you signed in.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            If you have questions about this privacy policy, contact:{" "}
            <a href="mailto:curry.peter@googlemail.com">
              curry.peter@googlemail.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
