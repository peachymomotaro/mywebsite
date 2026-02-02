import EmailLink from "./EmailLink";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div>© {year} Peter Curry</div>
        <div className="footer-links">
          <EmailLink label="Email" />
          <a href="https://www.linkedin.com/in/peter-curry-5a2138153/" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
