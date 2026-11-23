import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { experiments, NEWSLETTER_URL, TOYBOX_PATH } from "@/lib/social-science-toybox/games";
import styles from "./toybox.module.css";

export const metadata: Metadata = {
  title: "Social Science Toybox · Peter Curry",
  description: `Try ${experiments.length} experiments and compare your choices with people and AI agents from a published study.`,
};

export default function ToyboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.toybox}>
      <div className={styles.shell}>
        <header className={styles.masthead}>
          <Link href={TOYBOX_PATH} className={styles.wordmark}>Social Science Toybox</Link>
          <Link href="/">Peter Curry</Link>
        </header>
        {children}
        <footer className={styles.footer}>
          <p>Your answers stay on this page. We don’t collect or save them.</p>
          <a href={NEWSLETTER_URL}>Peter’s Substack ↗</a>
        </footer>
      </div>
    </div>
  );
}
