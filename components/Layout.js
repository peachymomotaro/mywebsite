import NavBar from "./NavBar";
import Footer from "./Footer";

export default function Layout({ children }) {
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
        <div className="container">{children}</div>
      </main>
      <Footer />
    </>
  );
}
