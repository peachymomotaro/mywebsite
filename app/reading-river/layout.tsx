import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShellNav } from "@/components/reading-river/shell-nav";
import { readingRiverPath } from "@/lib/reading-river/routes";
import "./reading-river.css";

export const metadata: Metadata = {
  title: {
    default: "Reading River",
    template: "%s · Reading River",
  },
  description: "Pick your next read from the stream.",
  applicationName: "Reading River",
};

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
        <a href={readingRiverPath()} className="river-shell-brand">
          Reading River
        </a>
        <ShellNav isAdmin={isAdmin} />
      </header>
      {children}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="editorial-shell">
        <EditorialShell>{children}</EditorialShell>
      </body>
    </html>
  );
}
