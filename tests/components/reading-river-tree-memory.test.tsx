import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TreeMemory } from "@/components/reading-river/tree-memory";

const article = {
  id: "article-1", title: "What a river remembers", siteName: "The Paris Review",
  sourceUrl: "https://example.com/river", readAt: "2026-11-08T12:00:00.000Z",
};

describe("discovering a tree's article", () => {
  it("shows the article as a paper label only while you are near the tree", () => {
    const view = render(<TreeMemory article={null} />);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    view.rerender(<TreeMemory article={article} />);
    const label = screen.getByRole("complementary", { name: "Finished article" });
    expect(label).toHaveTextContent("The Paris Review");
    expect(label).toHaveAttribute("data-article-id", article.id);
    expect(label.querySelector("button.glade-card")).toHaveTextContent(article.title);
    view.rerender(<TreeMemory article={null} />);
    expect(screen.queryByText(article.title)).not.toBeInTheDocument();
  });

  it("opens into a sheet with a Re-read link, like the boats on the river", () => {
    render(<TreeMemory article={article} />);
    expect(screen.queryByRole("link", { name: /Re-read/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(article.title) }));
    expect(screen.getByRole("group", { name: `Finished: ${article.title}` })).toHaveClass("glade-card", "glade-sheet");
    const reread = screen.getByRole("link", { name: /Re-read/ });
    expect(reread).toHaveAttribute("href", article.sourceUrl);
    expect(reread).toHaveAttribute("target", "_blank");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: /Re-read/ })).not.toBeInTheDocument();
  });

  it("puts the sheet away when you click elsewhere", () => {
    render(<TreeMemory article={article} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(article.title) }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("link", { name: /Re-read/ })).not.toBeInTheDocument();
  });

  it("still identifies a finished article with no saved link", () => {
    render(<TreeMemory article={{ ...article, sourceUrl: null, siteName: null }} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(article.title) }));
    expect(screen.getByRole("heading", { name: article.title })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("asks before uprooting a tree", () => {
    const onUproot = vi.fn();
    render(<TreeMemory article={article} onUproot={onUproot} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(article.title) }));
    fireEvent.click(screen.getByRole("button", { name: "Uproot" }));
    expect(onUproot).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Uproot this tree?" })).toHaveTextContent(/leave your read history/);

    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("link", { name: /Re-read/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Uproot" }));
    fireEvent.click(screen.getByRole("button", { name: "Uproot it" }));
    expect(onUproot).toHaveBeenCalledWith(article);
  });

  it("offers no Uproot where uprooting isn't possible", () => {
    render(<TreeMemory article={article} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(article.title) }));
    expect(screen.queryByRole("button", { name: "Uproot" })).not.toBeInTheDocument();
  });
});
