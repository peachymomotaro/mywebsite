import "../styles/globals.css";
import Layout from "../components/Layout";
import { EB_Garamond, Fira_Code } from "next/font/google";

const serif = EB_Garamond({
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
      {Component.hideSiteLayout ? page : <Layout>{page}</Layout>}
    </div>
  );
}
