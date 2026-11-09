import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { gladeFontVariables } from "@/components/reading-river/glade-fonts";
import { ShellNav } from "@/components/reading-river/shell-nav";
import { getCurrentUser } from "@/lib/reading-river/current-user";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";
import "./reading-river.css";

export const metadata: Metadata = {
  title: {
    default: "Reading River",
    template: "%s · Reading River",
  },
  description: "Pick your next read from the stream.",
  applicationName: "Reading River",
  icons: {
    icon: [
      { url: "/reading-river-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/reading-river-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/reading-river-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/reading-river-apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const preferredRegion = "lhr1";

export function EditorialShell({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className={`editorial-shell editorial-shell-frame ${gladeFontVariables}`}>
      <header className="river-shell-header">
        <Link href={readingRiverPath()} className="river-shell-brand">
          <Image
            alt=""
            aria-hidden="true"
            className="river-shell-brand-mark"
            height={40}
            priority
            src="/reading-river-boat-logo.png"
            width={40}
          />
          <span className="river-shell-brand-copy">Reading River</span>
        </Link>
        <ShellNav isAdmin={isAdmin} />
      </header>
      {children}
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return measureReadingRiverTiming("layout.reading-river.render", async () => {
    const currentUser = await getCurrentUser();

    return (
      <EditorialShell isAdmin={currentUser?.isAdmin ?? false}>
        {children}
      </EditorialShell>
    );
  });
}
