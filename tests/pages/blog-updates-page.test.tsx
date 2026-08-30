import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BlogUpdates from "@/pages/blog-updates";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Blog updates page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/blog-updates");
  });

  it("collapses each blog-post update by default", () => {
    render(<BlogUpdates />);

    const entry = document.getElementById(
      "review-essay-why-greatness-cannot-be-planned"
    );

    expect(entry).toBeInstanceOf(HTMLDetailsElement);
    expect((entry as HTMLDetailsElement).open).toBe(false);
  });

  it("opens a directly linked update and separates the discussion", async () => {
    window.history.replaceState(
      {},
      "",
      "/blog-updates#review-essay-why-greatness-cannot-be-planned"
    );

    render(<BlogUpdates />);

    const entry = document.getElementById(
      "review-essay-why-greatness-cannot-be-planned"
    ) as HTMLDetailsElement;

    await waitFor(() => expect(entry.open).toBe(true));

    expect(
      screen.getByRole("link", {
        name: "Direct link to updates for Review Essay: Why Greatness Cannot Be Planned",
      })
    ).toHaveAttribute(
      "href",
      "#review-essay-why-greatness-cannot-be-planned"
    );

    const question = screen.getByRole("region", {
      name: "Question from Derek James",
    });
    const response = screen.getByRole("region", {
      name: "Response from Peter Curry",
    });

    expect(within(question).getByText("Derek James")).toBeInTheDocument();
    expect(
      within(question).getByText(/aren't search paradigms like novelty/i)
    ).toBeInTheDocument();
    expect(within(response).getByText("Peter Curry")).toBeInTheDocument();
    expect(
      within(response).getByText(/So if we move back into that space/i)
    ).toBeInTheDocument();
    expect(
      question.compareDocumentPosition(response) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders the Levels on Levels addition with formatted blockquotes", async () => {
    window.history.replaceState(
      {},
      "",
      "/blog-updates#levels-on-levels-on-levels"
    );

    render(<BlogUpdates />);

    const entry = document.getElementById(
      "levels-on-levels-on-levels"
    ) as HTMLDetailsElement;

    await waitFor(() => expect(entry?.open).toBe(true));

    expect(within(entry).getByRole("link", { name: "review" })).toHaveAttribute(
      "href",
      "https://openyls.law.yale.edu/server/api/core/bitstreams/056e791f-4cfe-4061-a3ea-95a1dd37dfa1/content"
    );
    expect(within(entry).getByText("Anarchy, State and Utopia").tagName).toBe(
      "EM"
    );

    const quotations = within(entry).getAllByRole("blockquote");

    expect(quotations).toHaveLength(2);
    expect(quotations[0]).toHaveTextContent(
      "Nozick defends the procedure in a section entitled"
    );
    expect(quotations[1]).toHaveTextContent(
      "Sometimes it is proper to force people to do something"
    );
    expect(entry).not.toHaveTextContent("&#x20;");
    expect(entry).not.toHaveTextContent("> Nozick");
  });
});
