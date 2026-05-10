import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/pages/_app";

vi.mock("next/font/google", () => ({
  EB_Garamond: () => ({ variable: "serif-font" }),
  Fira_Code: () => ({ variable: "mono-font" }),
}));

vi.mock("@/components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>
      <nav>Site navigation</nav>
      {children}
    </div>
  ),
}));

describe("App layout", () => {
  it("can render pages without the normal site layout", () => {
    const BarePage = () => <main>Full screen page</main>;
    BarePage.hideSiteLayout = true;

    render(<App Component={BarePage} pageProps={{}} />);

    expect(screen.getByText("Full screen page")).toBeInTheDocument();
    expect(screen.queryByText("Site navigation")).toBeNull();
  });
});
