import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/pages/_app";

const { literataMock } = vi.hoisted(() => ({
  literataMock: vi.fn(() => ({ variable: "serif-font" })),
}));

vi.mock("next/font/google", () => ({
  Literata: literataMock,
  Fira_Code: () => ({ variable: "mono-font" }),
}));

vi.mock("@/components/Layout", () => ({
  default: ({
    children,
    wideContent,
  }: {
    children: React.ReactNode;
    wideContent?: boolean;
  }) => (
    <div data-testid="site-layout" data-wide-content={String(Boolean(wideContent))}>
      <nav>Site navigation</nav>
      {children}
    </div>
  ),
}));

describe("App layout", () => {
  it("loads Literata as the site serif font", () => {
    expect(literataMock).toHaveBeenCalledWith({
      subsets: ["latin"],
      variable: "--font-serif",
      display: "swap",
    });
  });

  it("can render pages without the normal site layout", () => {
    const BarePage = () => <main>Full screen page</main>;
    BarePage.hideSiteLayout = true;

    render(<App Component={BarePage} pageProps={{}} />);

    expect(screen.getByText("Full screen page")).toBeInTheDocument();
    expect(screen.queryByText("Site navigation")).toBeNull();
  });

  it("passes a page's wide-content preference to the site layout", () => {
    const WidePage = () => <main>Wide page</main>;
    WidePage.wideContent = true;

    render(<App Component={WidePage} pageProps={{}} />);

    expect(screen.getByTestId("site-layout")).toHaveAttribute(
      "data-wide-content",
      "true"
    );
  });
});
