import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
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
    notFound: vi.fn(() => {
      throw new Error("notFound");
    }),
  };
});

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

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUserMock,
}));

describe("ReadingRiverEditItemPage", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
    mocks.requireCurrentUserMock.mockClear();
    mocks.notFound.mockClear();
    mocks.setPrismaMock({
      readingItem: {
        findUnique: vi.fn(async () => ({
          id: "item-1",
          title: "Live stream article",
          sourceType: "url",
          sourceUrl: "https://example.com/live-stream",
          estimatedMinutes: 9,
          priorityScore: 8,
          tags: [{ tag: { name: "focus" } }, { tag: { name: "policy" } }],
        })),
      },
    });
  });

  it("renders the editable item fields without notes or status", async () => {
    const { default: ReadingRiverEditItemPage } = await import(
      "@/app/reading-river/items/[id]/edit/page"
    );
    const page = await ReadingRiverEditItemPage({
      params: { id: "item-1" },
      searchParams: {},
    });

    render(page);

    expect(screen.getByRole("heading", { name: "Edit item" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Live stream article");
    expect(screen.getByLabelText("Source URL")).toHaveValue(
      "https://example.com/live-stream",
    );
    expect(screen.getByLabelText("Estimated minutes")).toHaveValue(9);
    expect(screen.getByLabelText("Priority")).toHaveValue(8);
    expect(screen.getByText("0–10, where 10 is highest priority.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toHaveValue("focus, policy");
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
