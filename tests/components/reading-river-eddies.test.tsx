import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EddiesSection } from "@/components/reading-river/eddies-section";
import { EddyArticleActions } from "@/components/reading-river/eddy-article-actions";
import { EDDIES_FULL_MESSAGE } from "@/lib/reading-river/eddy-state";

const change = vi.hoisted(() => vi.fn());
vi.mock("@/app/reading-river/actions/eddies", () => ({ changeEddyArticle: change }));
const item = (id: string) => ({ id, title: `Article ${id}`, sourceUrl: `https://example.com/${id}`, siteName: "Literary Review", estimatedMinutes: 12 });

describe("In the eddies", () => {
  beforeEach(() => {
    change.mockReset();
    change.mockResolvedValue({ status: "success", message: "Kept in the eddies." });
  });
  it("renders the quiet empty state and preselected intake link", () => {
    render(<EddiesSection items={[]} />);
    expect(screen.getByRole("heading", { name: "In the eddies" })).toBeInTheDocument();
    expect(screen.getByText("0 of 10")).toBeInTheDocument();
    expect(screen.getByText("Keep up to ten articles here when you want to give them your attention.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add an article" })).toHaveAttribute("href", "/reading-river/add?eddies=1");
  });
  it("shows ten articles, explains capacity and leaves ordinary intake available", () => {
    render(<EddiesSection items={Array.from({ length: 10 }, (_, i) => item(String(i)))} />);
    expect(screen.getByText("10 of 10")).toBeInTheDocument();
    expect(screen.getByText(EDDIES_FULL_MESSAGE)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("link", { name: "Add to stream" })).toHaveAttribute("href", "/reading-river/add");
  });
  it("preserves supplied newest-first order, metadata and source links without truncation", () => {
    const { container } = render(<EddiesSection items={[item("new"), item("old")]} />);
    const rows = screen.getAllByRole("article");
    expect(within(rows[0]).getByRole("link", { name: "Article new" })).toHaveAttribute("href", "https://example.com/new");
    expect(within(rows[1]).getByRole("heading", { name: "Article old" })).toBeInTheDocument();
    expect(within(rows[0]).getByText("Literary Review · 12 min")).toBeInTheDocument();
    expect(container.querySelector(".river-spotlight-title-clamp")).not.toBeInTheDocument();
  });
  it("shows inline failure, announces it, and enables retry without claiming success", async () => {
    change.mockResolvedValue({ status: "error", message: EDDIES_FULL_MESSAGE });
    render(<EddyArticleActions id="article" inEddies={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep in the eddies" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(EDDIES_FULL_MESSAGE));
    expect(change).toHaveBeenCalledWith("article", "add", { status: "idle" }, expect.any(FormData));
    expect(screen.getByRole("button", { name: "Keep in the eddies" })).toBeEnabled();
  });
  it("disables both row controls while saving and uses the read action", async () => {
    let resolve!: (value: { status: "success"; message: string }) => void;
    change.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<EddiesSection items={[item("a")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove from eddies" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
    expect(change).toHaveBeenCalledWith("a", "read", { status: "idle" }, expect.any(FormData));
    resolve({ status: "success", message: "Marked as read." });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Marked as read."));
  });
  it("removes membership with a separate action", async () => {
    render(<EddyArticleActions id="article" inEddies />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from eddies" }));
    await waitFor(() => expect(change).toHaveBeenCalledWith("article", "remove", { status: "idle" }, expect.any(FormData)));
  });
});
