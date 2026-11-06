import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preference cascades — interactive experiment",
  description: "Explore how a tiny change in a revolutionary threshold can produce a radically different collective outcome.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ExperimentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
