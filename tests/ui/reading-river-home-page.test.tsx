import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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
    selectedTimeBudgetMinutes: timeBudgetMinutes,
  })),
  markAsReadMock: vi.fn(async () => {}),
  skipReadingItemMock: vi.fn(async () => {}),
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
}));

describe("ReadingRiverHomePage", () => {
  it("renders the merged Reading River homepage with the real data flow", async () => {
    const { default: ReadingRiverHomePage } = await import("@/app/reading-river/page");
    const page = await ReadingRiverHomePage({ searchParams: { time: "15" } });

    render(page);

    expect(screen.getByRole("heading", { name: "Pick your next read" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to stream" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to stream" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByText("Next priority read")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Live stream article" })).toBeInTheDocument();
    expect(screen.getByText("From the stream")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Daily stream pick" })).toBeInTheDocument();
    expect(screen.getByText("Choose a time")).toBeInTheDocument();
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
});
