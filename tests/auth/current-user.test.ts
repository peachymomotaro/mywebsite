import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getCurrentUserFromSessionTokenMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}));

vi.mock("@/lib/reading-river/auth", () => ({
  getSessionCookieName: () => "reading-river-session",
}));

vi.mock("@/lib/reading-river/session", () => ({
  getCurrentUserFromSessionToken: mocks.getCurrentUserFromSessionTokenMock,
}));

import { getCurrentUser } from "@/lib/reading-river/current-user";

describe("current user lookup", () => {
  beforeEach(() => {
    mocks.cookiesMock.mockReset();
    mocks.getCurrentUserFromSessionTokenMock.mockReset();
  });

  it("reuses the same session lookup within a request", async () => {
    const cookieStore = {
      get: vi.fn(() => ({ value: "session-token" })),
    };
    const user = {
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash: "hash",
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    };

    mocks.cookiesMock.mockResolvedValue(cookieStore);
    mocks.getCurrentUserFromSessionTokenMock.mockResolvedValue(user);

    const first = await getCurrentUser();
    const second = await getCurrentUser();

    expect(first).toBe(user);
    expect(second).toBe(user);
    expect(mocks.getCurrentUserFromSessionTokenMock).toHaveBeenCalledTimes(1);
    expect(mocks.getCurrentUserFromSessionTokenMock).toHaveBeenCalledWith("session-token");
  });
});
