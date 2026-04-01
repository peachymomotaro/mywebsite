"use client";

import { usePathname } from "next/navigation";
import { readingRiverPath } from "@/lib/reading-river/routes";

type ShellNavProps = {
  isAdmin?: boolean;
};

export function ShellNav({ isAdmin = false }: ShellNavProps) {
  const pathname = usePathname();

  if (pathname === readingRiverPath("/history")) {
    return null;
  }

  return (
    <nav className="river-shell-nav" aria-label="Primary">
      <a href={readingRiverPath("/history")} className="river-shell-nav-link">
        Read history
      </a>
      {isAdmin ? (
        <a href={readingRiverPath("/admin")} className="river-shell-nav-link">
          Admin
        </a>
      ) : null}
    </nav>
  );
}
