import type { Metadata } from "next";
import { Fira_Code, Literata } from "next/font/google";
import Layout from "@/components/Layout";
import "./preference-cascades.css";

const serif = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const mono = Fira_Code({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Preference cascades — Peter Curry",
  description: "Explore Kuran’s stable equilibrium, then see when one person’s public threshold can unlock a cascade.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ExperimentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${serif.variable} ${mono.variable} app`}>
      <Layout wideContent>{children}</Layout>
    </div>
  );
}
