import Head from "next/head";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import SummitGame from "@/components/summit/SummitGame";
import styles from "@/styles/summit.module.css";

const display = Big_Shoulders({
  subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display", display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono", display: "swap",
});

function SummitPage() {
  return (
    <>
      <Head>
        <title>Summit - a daily quiz climb</title>
        <meta
          name="description"
          content="One subject a day. Ten questions from the trailhead to the summit. One wrong answer and you fall."
        />
        <meta name="theme-color" content="#0b1230" />
      </Head>
      <main className={`${styles.root} ${display.variable} ${plex.variable} ${plexMono.variable}`}>
        <SummitGame />
      </main>
    </>
  );
}

SummitPage.hideSiteLayout = true;

export default SummitPage;
