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

const eddiesMock = vi.hoisted(() => ({ getEddyArticles: vi.fn(async (): Promise<unknown[]> => []) }));
vi.mock("@/lib/reading-river/eddies", () => eddiesMock);
const eddy = (n: number) => ({ id: `eddy-${n}`, title: `Eddy piece ${n}`, sourceUrl: `https://example.com/eddy-${n}`, siteName: null, estimatedMinutes: 10 });

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

// next/font is compiled by Next; here a font is only its class names.
vi.mock("@/components/reading-river/glade-fonts", () => ({ gladeFontVariables: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/app/reading-river/actions/reading-items", () => ({
  markAsRead: mocks.markAsReadMock,
  skipReadingItem: mocks.skipReadingItemMock,
  deleteReadingItem: mocks.deleteReadingItemMock,
  updateReadingItem: updateReadingItemMock,
}));

vi.mock("@/app/reading-river/actions/books", () => ({
  deleteBook: mocks.deleteBookMock,
}));

const updateReadingItemMock = vi.hoisted(() => vi.fn(async () => ({})));

describe("ReadingRiverHomePage", () => {
  it("shows the stream afloat, with every reading action a click away", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage({ searchParams: Promise.resolve({ time: "15" }) });
    render(page);

    expect(screen.getByRole("heading", { name: "Pick your next read" })).toBeInTheDocument();
    // Add opens a small dropdown for a link, rather than going to another page.
    const add = screen.getByRole("button", { name: /Add to stream/ });
    expect(add).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(add);
    expect(add).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("A link to read")).toBeInTheDocument();
    expect(mocks.getDriftViewsMock).toHaveBeenCalledWith("user-1");
    expect(mocks.getHomePageDataMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Small Gods")).not.toBeInTheDocument();

    const first = screen.getByRole("button", { name: /Live stream article/ });
    expect(screen.getByRole("button", { name: /Daily stream pick/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A third piece/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Let them drift on" })).not.toBeInTheDocument();

    fireEvent.click(first);
    // The label opens into a sheet of the same paper.
    expect(screen.getByRole("group", { name: "Lifted from the river: Live stream article" })).toBeInTheDocument();
    const bank = within(document.getElementById("river-bank-lifted")!);
    expect(bank.getByRole("link", { name: "Start reading" })).toHaveAttribute("href", "https://example.com/live");
    // Articles open in a new tab, so the glade stays where you left it.
    expect(bank.getByRole("link", { name: "Start reading" })).toHaveAttribute("target", "_blank");
    expect(bank.getByRole("link", { name: "Start reading" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(bank.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    // On the river there is only starting it: finishing happens in the eddies,
    // and the title and time are edited in place.
    expect(bank.queryByRole("button", { name: "Mark as read" })).not.toBeInTheDocument();
    expect(bank.queryByRole("button", { name: "Finished" })).not.toBeInTheDocument();
    expect(bank.queryByRole("link", { name: /^Edit/ })).not.toBeInTheDocument();
    expect(bank.queryByRole("button", { name: "Back to the water" })).not.toBeInTheDocument();
    // Leaving a piece be is enough now, and priority isn't shown.
    expect(bank.queryByRole("button", { name: "Not now" })).not.toBeInTheDocument();
    expect(bank.queryByRole("button", { name: "Renew priority" })).not.toBeInTheDocument();
    expect(screen.queryByText("Priority")).not.toBeInTheDocument();
  });

  it("shows only the river, with no length or eddies chips", async () => {
    eddiesMock.getEddyArticles.mockResolvedValueOnce([eddy(1)]);
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({ searchParams: Promise.resolve({ time: "15" }) }));

    expect(screen.queryByRole("button", { name: /Time:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eddies/ })).not.toBeInTheDocument();
    // The eddies are the pool itself.
    const pool = within(screen.getByRole("list", { name: "In the eddies" }));
    expect(pool.getByRole("button", { name: /Eddy piece 1/ })).toBeInTheDocument();
  });

  it("starting to read carries a piece into the eddies, and a full pool lets the oldest drift out", async () => {
    eddiesMock.getEddyArticles.mockResolvedValueOnce([1, 2, 3, 4, 5].map(eddy));
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    const stream = within(screen.getByRole("list", { name: "Drifting by" }));
    fireEvent.click(stream.getByRole("button", { name: /Live stream article/ }));
    fireEvent.click(within(document.getElementById("river-bank-lifted")!).getByRole("link", { name: "Start reading" }));
    expect(stream.queryByRole("button", { name: /Live stream article/ })).not.toBeInTheDocument();

    const pool = within(screen.getByRole("list", { name: "In the eddies" }));
    expect(pool.getAllByRole("button")[0]).toHaveTextContent("Live stream article");
    expect(pool.getByRole("button", { name: /Eddy piece 5/ })).toHaveTextContent("Drifting back into the river");
    expect(pool.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByText("Live stream article is in the eddies. Eddy piece 5 drifted back into the river.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("changes the title and reading time in place", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    fireEvent.click(screen.getByRole("button", { name: /Live stream article/ }));
    const sheet = within(document.getElementById("river-bank-lifted")!);
    fireEvent.click(sheet.getByRole("button", { name: /Change the title/ }));
    const title = sheet.getByLabelText("Title");
    fireEvent.change(title, { target: { value: "A better title" } });
    fireEvent.keyDown(title, { key: "Enter" });
    expect(sheet.getByRole("button", { name: /Change the title/ })).toHaveTextContent("A better title");
    expect(updateReadingItemMock).toHaveBeenCalledWith({ id: "item-1", title: "A better title" });

    fireEvent.click(sheet.getByRole("button", { name: /reading time/ }));
    const minutes = sheet.getByLabelText("Minutes to read");
    fireEvent.change(minutes, { target: { value: "11" } });
    fireEvent.keyDown(minutes, { key: "Enter" });
    expect(sheet.getByRole("button", { name: /reading time/ })).toHaveTextContent("11 min");
    expect(updateReadingItemMock).toHaveBeenLastCalledWith(expect.objectContaining({ id: "item-1", estimatedMinutes: 11, lengthEstimationMethod: "manual" }));
  });

  it("asks before removing, then lets the piece float away", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    fireEvent.click(screen.getByRole("button", { name: /Live stream article/ }));
    const sheet = within(document.getElementById("river-bank-lifted")!);
    fireEvent.click(sheet.getByRole("button", { name: "Remove" }));
    expect(sheet.getByText(/Are you sure/)).toBeInTheDocument();
    expect(mocks.deleteReadingItemMock).not.toHaveBeenCalled();
    fireEvent.click(sheet.getByRole("button", { name: "Let it float away" }));
    expect(mocks.deleteReadingItemMock).toHaveBeenCalledWith({ id: "item-1" });
    expect(screen.getByRole("button", { name: /Live stream article/ })).toHaveTextContent("Floating away");
  });

  it("in the eddies a piece can be continued or finished, and finishing sets it sailing", async () => {
    eddiesMock.getEddyArticles.mockResolvedValueOnce([eddy(1)]);
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    render(await ReadingRiverHomePage({}));

    const pool = within(screen.getByRole("list", { name: "In the eddies" }));
    fireEvent.click(pool.getByRole("button", { name: /Eddy piece 1/ }));
    const sheet = within(document.getElementById("river-bank-lifted")!);
    expect(sheet.getByRole("link", { name: "Continue" })).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    fireEvent.click(sheet.getByRole("button", { name: "Finished" }));
    expect(mocks.markAsReadMock).toHaveBeenCalledWith({ id: expect.any(String) });
    const sailing = pool.getByRole("button", { name: /Eddy piece 1/ });
    expect(sailing).toHaveTextContent("sailing out to sea");
    expect(sailing.closest("li")).toHaveAttribute("data-state", "sailing");
  });
});
