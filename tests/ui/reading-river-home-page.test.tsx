import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUserMock: vi.fn(async () => ({
    id: "user-1",
    email: "reader@example.com",
    displayName: "River Reader",
    passwordHash: "hash",
    status: "active",
    isAdmin: false,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
  })),
  getHomePageDataMock: vi.fn(async ({ timeBudgetMinutes }: { timeBudgetMinutes: number | null }) => ({
    priorityRead: {
      id: "item-1",
      title: "Live stream article",
      siteName: "Example",
      estimatedMinutes: 9,
      priorityScore: 8,
      status: "unread",
      pinned: false,
      sourceUrl: "https://example.com/live-stream",
      tags: ["focus"],
    },
    streamRead: {
      id: "item-2",
      title: "Daily stream pick",
      siteName: null,
      estimatedMinutes: 5,
      priorityScore: 6,
      status: "reading",
      pinned: false,
      sourceUrl: "https://example.com/daily-stream",
      tags: ["ideas"],
    },
    bookRoulettePick: {
      id: "book-1",
      title: "Small Gods",
      author: "Terry Pratchett",
      notes: "A gentle nudge from the shelf.",
    },
    selectedTimeBudgetMinutes: timeBudgetMinutes,
  })),
  markAsReadMock: vi.fn(async () => {}),
  skipReadingItemMock: vi.fn(async () => {}),
  deleteReadingItemMock: vi.fn(async () => {}),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a data-next-link="true" href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUserMock,
}));

vi.mock("@/lib/reading-river/homepage-data", () => ({
  getHomePageData: mocks.getHomePageDataMock,
}));

vi.mock("@/app/reading-river/actions/reading-items", () => ({
  markAsRead: mocks.markAsReadMock,
  skipReadingItem: mocks.skipReadingItemMock,
  deleteReadingItem: mocks.deleteReadingItemMock,
}));

describe("ReadingRiverHomePage", () => {
  it("renders the merged Reading River homepage with the real data flow", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage({ searchParams: { time: "15" } });

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Pick your next read" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to stream" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to stream" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByText("Next priority read")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Live stream article" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Edit Live stream article" }),
    ).toBeInTheDocument();
    expect(screen.getByText("focus")).toBeInTheDocument();
    expect(screen.getByText("From the stream")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Daily stream pick" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Edit Daily stream pick" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ideas")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Skip" })).toSatisfy((buttons) =>
      buttons.every((button) => button.className.includes("river-spotlight-action-secondary")),
    );
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    expect(container.querySelectorAll(".river-spotlight-body-copy")).toHaveLength(2);
    expect(container.querySelectorAll(".river-spotlight-body-actions")).toHaveLength(2);
    expect(screen.getByText("Choose a time")).toBeInTheDocument();
    expect(screen.getByText("Book Roulette")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Small Gods" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Terry Pratchett")).toBeInTheDocument();
    expect(mocks.getHomePageDataMock).toHaveBeenCalledWith({
      userId: "user-1",
      timeBudgetMinutes: 15,
    });
    expect(
      screen.queryByText("A calm reading triage space for choosing the next worthwhile thing to read."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("The fully personalized stream will appear here after the rest of the app is ported."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("This landing page is now inside the Reading River shell and route scope."),
    ).not.toBeInTheDocument();
  });

  it("unfolds and folds book roulette notes when the book is clicked", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage();

    render(page);

    const bookButton = screen.getByRole("button", { name: "Small Gods" });

    expect(screen.queryByText("A gentle nudge from the shelf.")).not.toBeInTheDocument();

    fireEvent.click(bookButton);

    expect(screen.getByText("A gentle nudge from the shelf.")).toBeInTheDocument();
    expect(bookButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(bookButton);

    expect(screen.queryByText("A gentle nudge from the shelf.")).not.toBeInTheDocument();
    expect(bookButton).toHaveAttribute("aria-expanded", "false");
  });

  it("marks spotlight titles so overlong URLs can wrap inside the card", async () => {
    mocks.getHomePageDataMock.mockResolvedValueOnce({
      priorityRead: {
        id: "item-1",
        title: "https://example.com/reallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallylong-title-without-breaks",
        siteName: null,
        estimatedMinutes: 9,
        priorityScore: 8,
        status: "unread",
        pinned: false,
        sourceUrl: "https://example.com/reallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallylong-title-without-breaks",
        tags: [],
      },
      streamRead: null,
      bookRoulettePick: {
        id: "book-2",
        title: "A Book Without Notes",
        author: null,
        notes: null,
      },
      selectedTimeBudgetMinutes: null,
    });

    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage();

    const { container } = render(page);

    const longTitleLink = screen.getByRole("link", {
      name: "https://example.com/reallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallyreallylong-title-without-breaks",
    });

    expect(longTitleLink).toBeInTheDocument();
    expect(container.querySelector(".river-spotlight-link")).toHaveClass("river-spotlight-title-wrap");
    expect(container.querySelector(".river-spotlight-link")).toHaveClass("river-spotlight-title-clamp");
    const bookButton = screen.getByRole("button", { name: "A Book Without Notes" });

    expect(bookButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(bookButton);

    expect(
      screen.getByText("Your notes about why you wanted to read this book would go here!"),
    ).toBeInTheDocument();
  });
});
