import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
    <div className="editorial-shell-frame">
      <header className="river-shell-header">
        <Link href={readingRiverPath()} className="river-shell-brand">
          Reading River
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
      <html lang="en">
        <body className="editorial-shell">
          <EditorialShell isAdmin={currentUser?.isAdmin ?? false}>
            {children}
          </EditorialShell>
        </body>
      </html>
    );
  });
}
