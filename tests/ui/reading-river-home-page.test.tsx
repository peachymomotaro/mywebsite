import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  getHomePageDataMock: vi.fn(async (_options: { userId: string }) => ({
    priorityRead: null,
    streamRead: null,
    bookRoulettePick: {
      id: "book-1",
      title: "Small Gods",
      author: "Terry Pratchett",
      notes: "A gentle nudge from the shelf.",
    },
    selectedTimeBudgetMinutes: null,
    bookRouletteBooks: [],
  })),
  getDriftViewsMock: vi.fn(async () => {
    const afloat = [
      { id: "item-1", title: "Live stream article", sourceUrl: "https://example.com/live", siteName: "Example", estimatedMinutes: 9, tags: ["focus"], inEddies: false, hasPriority: true, priorityFaded: false },
      { id: "item-2", title: "Daily stream pick", sourceUrl: "https://example.com/daily", siteName: null, estimatedMinutes: 5, tags: [], inEddies: false, hasPriority: false, priorityFaded: true },
      { id: "item-3", title: "A third piece", sourceUrl: null, siteName: "Elsewhere", estimatedMinutes: 12, tags: [], inEddies: false, hasPriority: false, priorityFaded: false },
    ];
    return Object.fromEntries(["any", "5", "10", "15", "30", "45"].map((key) => [
      key, { afloat, inCirculation: 8, snoozed: 0, nextReturn: null },
    ]));
  }),
  getRiverBankMock: vi.fn(async () => ({
    stillReading: [
      { id: "item-9", title: "Half-read essay", sourceUrl: "https://example.com/half", siteName: "Aeon", estimatedMinutes: 20, tags: [], inEddies: false, hasPriority: false, priorityFaded: false, openedAt: new Date(Date.now() - 86_400_000).toISOString(), surfacedAt: null },
    ],
    recentlyPassed: [],
  })),
  markAsReadMock: vi.fn(async () => {}),
  skipReadingItemMock: vi.fn(async () => {}),
  deleteReadingItemMock: vi.fn(async () => {}),
  deleteBookMock: vi.fn(async () => {}),
}));

vi.mock("@/lib/reading-river/eddies", () => ({ getEddyArticles: vi.fn(async () => []) }));

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

vi.mock("@/lib/reading-river/drift-store", () => ({
  getDriftViews: mocks.getDriftViewsMock,
  getRiverBank: mocks.getRiverBankMock,
}));

vi.mock("@/app/reading-river/actions/drift", () => ({
  letDriftOnAction: vi.fn(),
  letOneDriftOnAction: vi.fn(),
  noteDriftSeenAction: vi.fn(async () => {}),
  putBackInRiverAction: vi.fn(),
  renewPriorityAction: vi.fn(),
  wakeSnoozedAction: vi.fn(),
}));

vi.mock("@/app/reading-river/actions/eddies", () => ({ changeEddyArticle: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/app/reading-river/actions/reading-items", () => ({
  markAsRead: mocks.markAsReadMock,
  skipReadingItem: mocks.skipReadingItemMock,
  deleteReadingItem: mocks.deleteReadingItemMock,
}));

vi.mock("@/app/reading-river/actions/books", () => ({
  deleteBook: mocks.deleteBookMock,
}));

describe("ReadingRiverHomePage", () => {
  it("shows three pieces drifting by, with every reading action on the bank", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage({ searchParams: Promise.resolve({ time: "15" }) });
    render(page);

    expect(screen.getByRole("heading", { name: "Pick your next read" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to stream" })).toHaveAttribute("data-next-link", "true");
    expect(mocks.getDriftViewsMock).toHaveBeenCalledWith("user-1");
    expect(mocks.getHomePageDataMock).toHaveBeenCalledWith({ userId: "user-1" });

    const first = screen.getByRole("button", { name: /Live stream article/ });
    expect(screen.getByRole("button", { name: /Daily stream pick/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A third piece/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Let them drift on" })).toBeEnabled();
    expect(screen.getByText("Choose a time")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "15 min" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    const bank = within(document.getElementById("river-bank-lifted")!);
    expect(bank.getByRole("link", { name: "Live stream article" })).toHaveAttribute("href", "https://example.com/live");
    expect(bank.getByRole("link", { name: "Start reading" })).toBeInTheDocument();
    expect(bank.getByRole("button", { name: "Mark as read" })).toBeInTheDocument();
    expect(bank.getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(bank.getByRole("button", { name: "Keep in the eddies" })).toBeInTheDocument();
    expect(bank.getByRole("link", { name: "Edit Live stream article" })).toBeInTheDocument();
    expect(bank.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(bank.getByText("focus")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Daily stream pick/ }));
    expect(within(document.getElementById("river-bank-lifted")!).getByRole("button", { name: "Renew priority" })).toBeInTheDocument();
  });

  it("keeps opened pieces on the bank so they can be finished another day", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    expect(screen.getByRole("heading", { name: "Still reading" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Half-read essay" })).toBeInTheDocument();
    expect(screen.getByText(/opened yesterday/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Put back in the river" })).toBeInTheDocument();
  });

  it("unfolds and folds book roulette notes when the book is clicked", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    const bookButton = screen.getByRole("button", { name: "Small Gods" });
    expect(screen.queryByText("A gentle nudge from the shelf.")).not.toBeInTheDocument();
    fireEvent.click(bookButton);
    expect(screen.getByText("A gentle nudge from the shelf.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove book" })).toBeInTheDocument();
    fireEvent.click(bookButton);
    expect(bookButton).toHaveAttribute("aria-expanded", "false");
  });
});
