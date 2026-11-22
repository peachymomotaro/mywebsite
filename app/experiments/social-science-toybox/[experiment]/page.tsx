import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { experiments, TOYBOX_PATH } from "@/lib/social-science-toybox/games";
import { ExperimentGame } from "../_components/experiment-game";
import styles from "../toybox.module.css";

type Props = { params: Promise<{ experiment: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return experiments.map(({ id }) => ({ experiment: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment } = await params;
  const definition = experiments.find(({ id }) => id === experiment);
  if (!definition) notFound();
  return { title: `${definition.title} · Social Science Toybox`, description: definition.teaser };
}

export default async function ExperimentPage({ params }: Props) {
  const { experiment } = await params;
  const definition = experiments.find(({ id }) => id === experiment);
  if (!definition) notFound();

  return (
    <main className={`${styles.main} ${styles.experimentMain}`}>
      <Link href={TOYBOX_PATH} className={styles.backLink}>← All experiments</Link>
      <ExperimentGame key={definition.id} experiment={definition} />
    </main>
  );
}
