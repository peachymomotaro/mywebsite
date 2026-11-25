import Head from "next/head";
import LadderGame from "@/components/ladder/LadderGame";
import styles from "@/styles/ladder.module.css";

function LadderPage() {
  return (
    <>
      <Head>
        <title>Ladder - Peter Curry</title>
        <meta
          name="description"
          content="A daily quiz: ten questions on one topic, climbing from easy to fiendish."
        />
      </Head>
      <section className={styles.page}>
        <header className={styles.masthead}>
          <h1>Ladder</h1>
          <p>One topic a day. Ten questions, each harder than the last. How high can you climb?</p>
        </header>
        <LadderGame />
        <p className={styles.credits}>
          Questions come from <a href="https://www.qbreader.org">QB Reader</a>, written by
          quizbowl writers for real tournaments; each one credits its set. Difficulty is QB
          Reader&rsquo;s tournament level. Topics come from Matthew Spry&rsquo;s QB-curricula
          model, which files every history answer into its period and ranks how well known it is.
        </p>
      </section>
    </>
  );
}

LadderPage.wideContent = true;

export default LadderPage;
