"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/contact", label: "Contact" }
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Primary">
      <Link className="nav-title" href="/">
        Peter Curry
      </Link>
      <div className="nav-links">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </nav>
  );
}
