import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
  return (
    <nav className="nav" aria-label="Primary">
      <Link className="nav-title" href="/">
        Peter Curry
      </Link>
      <div className="nav-links">
        <Link href="/about">About</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/podcasts">Podcasts</Link>
        <Link href="/contact">Contact</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
