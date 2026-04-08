import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const routeMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
    verifyPassword: vi.fn(),
    createExtensionToken: vi.fn(),
    revokeExtensionToken: vi.fn(),
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: routeMocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/auth", () => ({
  getSessionCookieName: () => "reading-river-session",
  verifyPassword: routeMocks.verifyPassword,
}));

vi.mock("@/lib/reading-river/extension-auth", () => ({
  createExtensionToken: routeMocks.createExtensionToken,
  revokeExtensionToken: routeMocks.revokeExtensionToken,
}));

import { POST as login } from "@/app/reading-river/api/extension/login/route";
import { POST as logout } from "@/app/reading-river/api/extension/logout/route";
import { proxy } from "@/proxy";

function createUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "River Reader",
    passwordHash: "stored-password-hash",
    status: "active",
    isAdmin: false,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
    ...overrides,
  };
}

describe("reading river extension api auth", () => {
  beforeEach(() => {
    routeMocks.getPrismaClient.mockClear();
    routeMocks.verifyPassword.mockReset();
    routeMocks.createExtensionToken.mockReset();
    routeMocks.revokeExtensionToken.mockReset();
  });

  it("returns an extension token and user info for valid login credentials", async () => {
    const userFindUnique = vi.fn(async () => createUser());
    routeMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });
    routeMocks.verifyPassword.mockResolvedValue(true);
    routeMocks.createExtensionToken.mockResolvedValue({
      token: "extension-token",
      extensionToken: {
        id: "extension-token-1",
      },
    });

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "  reader@example.com  ",
        password: "reader-password",
      }),
    });

    const response = await login(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      token: "extension-token",
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
      },
    });
    expect(userFindUnique).toHaveBeenCalledWith({
      where: {
        email: "reader@example.com",
      },
    });
    expect(routeMocks.verifyPassword).toHaveBeenCalledWith(
      "reader-password",
      "stored-password-hash",
    );
    expect(routeMocks.createExtensionToken).toHaveBeenCalledWith("user-1");
  });

  it("rejects invalid extension login credentials", async () => {
    const userFindUnique = vi.fn(async () => createUser());
    routeMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });
    routeMocks.verifyPassword.mockResolvedValue(false);

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "reader@example.com",
        password: "wrong-password",
      }),
    });

    const response = await login(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "invalid_credentials",
    });
    expect(routeMocks.createExtensionToken).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON extension login requests", async () => {
    routeMocks.setPrismaMock({
      user: {
        findUnique: vi.fn(),
      },
    });

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{not json",
    });

    const response = await login(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "invalid_credentials",
    });
  });

  it("rejects empty extension login credentials", async () => {
    routeMocks.setPrismaMock({
      user: {
        findUnique: vi.fn(),
      },
    });

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "   ",
        password: "",
      }),
    });

    const response = await login(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "invalid_credentials",
    });
  });

  it("rejects unknown extension login users", async () => {
    const userFindUnique = vi.fn(async () => null);
    routeMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "missing@example.com",
        password: "reader-password",
      }),
    });

    const response = await login(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "invalid_credentials",
    });
    expect(userFindUnique).toHaveBeenCalledWith({
      where: {
        email: "missing@example.com",
      },
    });
    expect(routeMocks.createExtensionToken).not.toHaveBeenCalled();
  });

  it("rejects deactivated extension accounts", async () => {
    const userFindUnique = vi.fn(async () =>
      createUser({
        status: "deactivated",
      }),
    );
    routeMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });
    routeMocks.verifyPassword.mockResolvedValue(true);

    const request = new Request("https://example.com/reading-river/api/extension/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "reader@example.com",
        password: "reader-password",
      }),
    });

    const response = await login(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "account_disabled",
    });
    expect(routeMocks.createExtensionToken).not.toHaveBeenCalled();
  });

  it("revokes a bearer token on extension logout", async () => {
    const request = new Request("https://example.com/reading-river/api/extension/logout", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
      },
    });

    const response = await logout(request);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(routeMocks.revokeExtensionToken).toHaveBeenCalledWith("extension-token");
  });

  it("accepts mixed-case bearer schemes on extension logout", async () => {
    const request = new Request("https://example.com/reading-river/api/extension/logout", {
      method: "POST",
      headers: {
        authorization: "bEaReR extension-token",
      },
    });

    const response = await logout(request);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(routeMocks.revokeExtensionToken).toHaveBeenCalledWith("extension-token");
  });

  it("treats a missing bearer token as a no-op logout", async () => {
    const request = new Request("https://example.com/reading-river/api/extension/logout", {
      method: "POST",
    });

    const response = await logout(request);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(routeMocks.revokeExtensionToken).not.toHaveBeenCalled();
  });

  it("treats a malformed bearer token as a no-op logout", async () => {
    const request = new Request("https://example.com/reading-river/api/extension/logout", {
      method: "POST",
      headers: {
        authorization: "Basic abc123",
      },
    });

    const response = await logout(request);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(routeMocks.revokeExtensionToken).not.toHaveBeenCalled();
  });

  it("does not redirect the extension login route through proxy middleware", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/reading-river/api/extension/login"),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects similar non-extension routes through proxy middleware", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/reading-river/api/extensionx/login"),
    );

    expect(response.headers.get("location")).toBe("https://example.com/reading-river/login");
  });
});
