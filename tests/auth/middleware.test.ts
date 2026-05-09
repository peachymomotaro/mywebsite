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

import { proxy } from "@/proxy";

function getRedirectLocation(response: Response) {
  return response.headers.get("location");
}

describe("reading river middleware", () => {
  beforeEach(() => {
    getCurrentUserFromSessionToken.mockReset();
  });

  it("ignores public website routes", async () => {
    const response = await proxy(new NextRequest("https://example.com/about"));

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("allows public reading river routes", async () => {
    const response = await proxy(new NextRequest("https://example.com/reading-river/login"));

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("allows anonymous users to open password reset links", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/reading-river/reset-password/reset-token"),
    );

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("skips auth middleware for server action requests", async () => {
    getCurrentUserFromSessionToken.mockResolvedValue(null);

    const response = await proxy(
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
    const response = await proxy(new NextRequest("https://example.com/reading-river"));

    expect(getRedirectLocation(response)).toBe("https://example.com/reading-river/login");
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("allows protected reading river routes through when a session cookie is present", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/reading-river", {
        headers: {
          cookie: "reading-river-session=session-token",
        },
      }),
    );

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });

  it("allows admin routes through when a session cookie is present", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/reading-river/admin", {
        headers: {
          cookie: "reading-river-session=session-token",
        },
      }),
    );

    expect(getRedirectLocation(response)).toBeNull();
    expect(getCurrentUserFromSessionToken).not.toHaveBeenCalled();
  });
});
