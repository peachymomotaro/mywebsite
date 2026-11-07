import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fira_Code, Literata } from "next/font/google";
import "./pops.css";

const serif = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const mono = Fira_Code({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "POps", template: "%s · POps" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PopsRootLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${mono.variable} app pops`}>{children}</div>;
}
