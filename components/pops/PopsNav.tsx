"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const PRIMARY = [
  { href: "/pops", label: "Everything" },
  { href: "/pops/learn", label: "Learn" },
  { href: "/pops/writing", label: "Writing" },
  { href: "/pops/experiments", label: "Experiments" },
  { href: "/pops/work", label: "Work" },
  { href: "/pops/personal", label: "Personal" },
];

const SECONDARY = [
  { href: "/pops/pipelines", label: "Pipelines" },
  { href: "/pops/playbook", label: "Playbook" },
  { href: "/pops/connect", label: "Connect" },
];

export function PopsNav() {
  const pathname = usePathname() ?? "/pops";
  const current = (href: string) =>
    href === "/pops" ? pathname === "/pops" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="pops-nav" aria-label="POps">
      <Link href="/pops" className="pops-brand">POps</Link>
      <ul className="pops-nav-primary">
        {PRIMARY.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={current(item.href) ? "page" : undefined}>{item.label}</Link>
          </li>
        ))}
      </ul>
      <ul className="pops-nav-secondary">
        {SECONDARY.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={current(item.href) ? "page" : undefined}>{item.label}</Link>
          </li>
        ))}
        <li>
          <form action="/pops/logout" method="post">
            <button type="submit" className="pops-link-button">Log out</button>
          </form>
        </li>
        <li><ThemeToggle /></li>
      </ul>
    </nav>
  );
}
