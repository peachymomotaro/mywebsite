"use client";

import Link from "next/link";
import { readingRiverPath } from "@/lib/reading-river/routes";

type ShellNavProps = {
  isAdmin?: boolean;
};

export function ShellNav({ isAdmin = false }: ShellNavProps) {
  return (
    <nav className="river-shell-nav" aria-label="Primary">
      <Link href={readingRiverPath("/how-it-works")} className="river-shell-nav-link">
        How It Works
      </Link>
      <Link href={readingRiverPath("/changelog")} className="river-shell-nav-link">
        Changelog
      </Link>
      <Link href={readingRiverPath("/preferences")} className="river-shell-nav-link">
        Preferences
      </Link>
      <Link href={readingRiverPath("/history")} className="river-shell-nav-link">
        Read history
      </Link>
      {isAdmin ? (
        <Link href={readingRiverPath("/admin")} className="river-shell-nav-link">
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
