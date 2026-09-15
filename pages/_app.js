import "../styles/globals.css";
import Layout from "../components/Layout";
import { Fira_Code, Literata } from "next/font/google";

const serif = Literata({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

const mono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export default function App({ Component, pageProps }) {
  const page = <Component {...pageProps} />;

  return (
    <div className={`${serif.variable} ${mono.variable} app`}>
      {Component.hideSiteLayout ? (
        page
      ) : (
        <Layout wideContent={Component.wideContent}>{page}</Layout>
      )}
    </div>
  );
}
