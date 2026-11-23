import Link from "next/link";
import { experiments, TOYBOX_PATH } from "@/lib/social-science-toybox/games";
import { PARK_PAPER } from "@/lib/social-science-toybox/results";
import styles from "./toybox.module.css";

export default function ToyboxPage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div>
          <p className={styles.kicker}>A companion to <cite>Simulations and Simulacra</cite></p>
          <h1>Social Science<br />{" "}Toybox</h1>
          <p className={styles.lede}>Make a choice, then see what people and their AI counterparts chose in the same experiment.</p>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.orangeDisc} />
          <div className={styles.purpleTile} />
          <div className={styles.greenDisc} />
        </div>
      </div>
      <section aria-labelledby="choose-experiment">
        <div className={styles.sectionHeading}>
          <h2 id="choose-experiment">Choose an experiment</h2>
          <p>About 1–2 minutes each</p>
        </div>
        <ul className={styles.catalogue}>
          {experiments.map(({ id, title, teaser, category }) => (
            <li key={id}>
              <Link href={`${TOYBOX_PATH}/${id}`} className={styles.experimentLink}>
                <span className={styles.category}>{category}</span>
                <span className={styles.cardTitle}>{title}</span>
                <span>{teaser}</span>
                <span className={styles.cardArrow} aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className={styles.sourceNote}>
        Based on <a href={PARK_PAPER}>Park et al.’s November 2026 study</a>.
      </p>
    </main>
  );
}
