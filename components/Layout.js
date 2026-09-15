import NavBar from "./NavBar";
import Footer from "./Footer";

export default function Layout({ children, wideContent = false }) {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <NavBar />
        </div>
      </header>
      <main id="content">
        <div className={wideContent ? "container container-wide" : "container"}>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
