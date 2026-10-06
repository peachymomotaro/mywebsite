import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiWarningsWrittenByAiPage from "@/pages/ai-warnings-written-by-ai";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("AI warnings written by AI page", () => {
  it("renders as an unlisted standalone collection", () => {
    render(<AiWarningsWrittenByAiPage />);

    expect(AiWarningsWrittenByAiPage.hideSiteLayout).toBe(true);
    expect(
      screen.getByRole("heading", {
        name: "List of People Writing Warnings About the Dangers of AI But The Warning Is Entirely Written By AI",
      }),
    ).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex,nofollow,noarchive",
    );
  });

  it("starts with the supplied Dissent article", () => {
    render(<AiWarningsWrittenByAiPage />);

    expect(screen.getByRole("link", { name: "Life Under the Algorithm" })).toHaveAttribute(
      "href",
      "https://dissentmagazine.org/article/algorithmic-pricing-surveillance-wage-discrimination/",
    );
    expect(screen.getByText(/Veena Dubal and Katie J\. Wells/)).toBeInTheDocument();
    expect(screen.getByText("Dissent Magazine")).toBeInTheDocument();
  });
});
