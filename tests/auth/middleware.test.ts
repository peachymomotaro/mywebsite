import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUserFromSessionToken } = vi.hoisted(() => ({
  getCurrentUserFromSessionToken: vi.fn(),
}));

vi.mock("@/lib/reading-river/auth", () => ({
  getSessionCookieName: () => "reading-river-session",
}));

vi.mock("@/lib/reading-river/session", () => ({
  getCurrentUserFromSessionToken,
}));

import { middleware } from "@/middleware";

function getRedirectLocation(response: Response) {
  return response.headers.get("location");
}

describe("reading river middleware", () => {
  beforeEach(() => {
    getCurrentUserFromSessionToken.mockReset();
  });

  it("ignores public website routes", async () => {
    const response = await middleware(new NextRequest("https://example.com/about"));

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("allows public reading river routes", async () => {
    const response = await middleware(new NextRequest("https://example.com/reading-river/login"));

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("skips auth middleware for server action requests", async () => {
    getCurrentUserFromSessionToken.mockResolvedValue(null);

    const response = await middleware(
      new NextRequest("https://example.com/reading-river/add", {
        headers: {
          "next-action": "action-id",
        },
      }),
    );

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("redirects anonymous users on protected reading river routes", async () => {
    getCurrentUserFromSessionToken.mockResolvedValue(null);

    const response = await middleware(new NextRequest("https://example.com/reading-river"));

    expect(getRedirectLocation(response)).toBe("https://example.com/reading-river/login");
  });

  it("redirects non-admin users away from reading river admin", async () => {
    getCurrentUserFromSessionToken.mockResolvedValue({
      id: "user-1",
      isAdmin: false,
    });

    const response = await middleware(new NextRequest("https://example.com/reading-river/admin"));

    expect(getRedirectLocation(response)).toBe("https://example.com/reading-river/login");
  });

  it("allows admin users into reading river admin", async () => {
    getCurrentUserFromSessionToken.mockResolvedValue({
      id: "admin-1",
      isAdmin: true,
    });

    const response = await middleware(new NextRequest("https://example.com/reading-river/admin"));

    expect(getRedirectLocation(response)).toBeNull();
  });
});
