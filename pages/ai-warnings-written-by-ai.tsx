import Head from "next/head";
import styles from "../styles/AiWarningsWrittenByAi.module.css";

type WarningEntry = {
  title: string;
  href: string;
  publication: string;
  authors: string;
  date: string;
  commentary?: string;
};

const warningEntries: WarningEntry[] = [
  {
    title: "Life Under the Algorithm",
    href: "https://dissentmagazine.org/article/algorithmic-pricing-surveillance-wage-discrimination/",
    publication: "Dissent Magazine",
    authors: "Veena Dubal and Katie J. Wells",
    date: "Fall 2026",
  },
];

function AiWarningsWrittenByAiPage() {
  return (
    <>
      <Head>
        <title>
          List of People Writing Warnings About the Dangers of AI But The Warning Is Entirely
          Written By AI
        </title>
        <meta
          name="description"
          content="A list of people writing warnings about the dangers of AI when the warning is entirely written by AI."
        />
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="googlebot" content="noindex,nofollow,noarchive" />
      </Head>

      <main className={styles.page}>
        <div className={styles.frame}>
          <header className={styles.masthead}>
            <p className={styles.kicker}>An incomplete list</p>
            <h1 className={styles.title}>
              List of People Writing Warnings About the Dangers of AI But The Warning Is Entirely
              Written By AI
            </h1>
          </header>

          <ol className={styles.list}>
            {warningEntries.map((entry, index) => (
              <li className={styles.listItem} key={entry.href}>
                <article className={styles.entry}>
                  <p className={styles.entryLabel}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true">/</span>
                    <span>{entry.publication}</span>
                  </p>

                  <h2 className={styles.entryTitle}>
                    <a className={styles.entryLink} href={entry.href}>
                      {entry.title}
                      <span className={styles.arrow} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </h2>

                  <p className={styles.entryMeta}>
                    {entry.authors} <span aria-hidden="true">·</span> {entry.date}
                  </p>

                  {entry.commentary ? (
                    <p className={styles.commentary}>{entry.commentary}</p>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </>
  );
}

AiWarningsWrittenByAiPage.hideSiteLayout = true;

export default AiWarningsWrittenByAiPage;
