import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReadingItemCard } from "@/components/reading-river/reading-item-card";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(async () => ({ id: "reader-1" })),
  findMany: vi.fn(async () => [
    {
      id: "event-1",
      readAt: new Date("2026-10-18T00:00:00Z"),
      readingItem: {
        id: "item-1",
        title: "Previously read article",
        sourceUrl: "https://example.com/history",
        siteName: "Example",
      },
    },
  ]),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: () => ({ readEvent: { findMany: mocks.findMany } }),
}));

describe("Reading River external article links", () => {
  it("opens a stream article in a new tab, without changing non-link entries", () => {
    const props = {
      title: "Article in stream",
      sourceUrl: "https://example.com/article",
      siteName: "Example",
      estimatedMinutes: 8,
      priorityScore: 7,
      status: "unread",
      pinned: false,
      tags: [],
    };

    const { rerender } = render(<ul><ReadingItemCard {...props} /></ul>);
    const link = screen.getByRole("link", { name: props.title });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    rerender(<ul><ReadingItemCard {...props} sourceUrl={null} /></ul>);
    expect(screen.queryByRole("link", { name: props.title })).not.toBeInTheDocument();
  });

  it("opens an article from reading history in a new tab", async () => {
    const { default: HistoryPage } = await import("@/app/reading-river/history/page");
    render(await HistoryPage());

    const link = screen.getByRole("link", { name: "Previously read article" });
    expect(link).toHaveAttribute("href", "https://example.com/history");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
