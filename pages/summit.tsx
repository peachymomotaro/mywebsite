import Head from "next/head";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
import SummitGame from "@/components/summit/SummitGame";
import styles from "@/styles/summit.module.css";

const display = Cormorant_Garamond({
  subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"],
  variable: "--font-cormorant", display: "swap",
});
const body = EB_Garamond({
  subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"],
  variable: "--font-garamond", display: "swap",
});

function SummitPage() {
  return (
    <>
      <Head>
        <title>Summit</title>
        <meta
          name="description"
          content="One subject a day. Ten questions from the foothills to the summit. One wrong answer and you fall."
        />
        <meta name="theme-color" content="#adb4b3" />
      </Head>
      <main className={`${styles.root} ${display.variable} ${body.variable}`}>
        <SummitGame />
      </main>
    </>
  );
}

SummitPage.hideSiteLayout = true;

export default SummitPage;
