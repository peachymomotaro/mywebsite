"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readingRiverPath } from "@/lib/reading-river/routes";

type ShellNavProps = {
  isAdmin?: boolean;
  isSignedIn?: boolean;
};

/**
 * The Reading River pages. On most pages they sit in a row along the top; on
 * the glade they fold into the little river mark in the corner, which opens
 * them when you tap it.
 */
export function ShellNav({ isAdmin = false, isSignedIn = false }: ShellNavProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="river-shell-menu" data-open={open ? "" : undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="river-shell-menu-toggle"
        aria-expanded={open}
        aria-controls="river-shell-nav"
        onClick={() => setOpen((current) => !current)}
      >
        <Image alt="" aria-hidden="true" height={32} src="/reading-river-boat-logo.png" width={32} />
        <span className="river-sr-only">Reading River menu</span>
      </button>
      <nav id="river-shell-nav" className="river-shell-nav" aria-label="Primary">
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
        {isSignedIn ? (
          // A form rather than a link, so nothing can sign you out just by prefetching it.
          <form method="post" action={readingRiverPath("/logout")} className="river-shell-signout">
            <button type="submit" className="river-shell-nav-link river-shell-nav-button">
              Sign out
            </button>
          </form>
        ) : null}
      </nav>
    </div>
  );
}
