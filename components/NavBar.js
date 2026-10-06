import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/contact", label: "Contact" }
];

export default function NavBar() {
  const router = useRouter();

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
            aria-current={router.pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </nav>
  );
}
