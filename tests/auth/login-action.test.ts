import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => {
  let cookieStore: {
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  return {
    redirect: vi.fn((url: string) => {
      throw new Error(`redirect:${url}`);
    }),
    cookies: vi.fn(async () => cookieStore),
    setCookieStore(nextCookieStore: {
      set: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
    }) {
      cookieStore = nextCookieStore;
    },
    resetCookieStore() {
      cookieStore = {
        set: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
      };
    },
  };
});

const dbMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

const sessionMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));

vi.mock("next/headers", () => ({
  cookies: actionMocks.cookies,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: dbMocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/session", () => ({
  createSession: sessionMocks.createSession,
  revokeSession: sessionMocks.revokeSession,
}));

import { hashPassword } from "@/lib/reading-river/auth";
import { loginAction } from "@/app/reading-river/login/actions";
import { GET as logout } from "@/app/reading-river/logout/route";

describe("login action", () => {
  beforeEach(() => {
    dbMocks.getPrismaClient.mockClear();
    sessionMocks.createSession.mockReset();
    sessionMocks.revokeSession.mockReset();
    actionMocks.resetCookieStore();
  });

  it("creates a session for valid credentials", async () => {
    const passwordHash = await hashPassword("reader-password");
    const userFindUnique = vi.fn(async () => ({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash,
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    }));

    dbMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });
    sessionMocks.createSession.mockResolvedValue({
      token: "session-token",
      session: {
        id: "session-1",
      },
    });

    const cookieSet = vi.fn();
    actionMocks.setCookieStore({
      set: cookieSet,
      delete: vi.fn(),
      get: vi.fn(),
    });

    const formData = new FormData();
    formData.set("email", "reader@example.com");
    formData.set("password", "reader-password");

    await expect(loginAction(formData)).rejects.toThrow("redirect:/reading-river");

    expect(userFindUnique).toHaveBeenCalledWith({
      where: {
        email: "reader@example.com",
      },
    });
    expect(sessionMocks.createSession).toHaveBeenCalledWith("user-1");
    expect(cookieSet).toHaveBeenCalledWith(
      expect.any(String),
      "session-token",
      expect.any(Object),
    );
  });

  it("rejects invalid credentials without creating a session", async () => {
    const passwordHash = await hashPassword("reader-password");
    const userFindUnique = vi.fn(async () => ({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash,
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    }));

    dbMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });

    const formData = new FormData();
    formData.set("email", "reader@example.com");
    formData.set("password", "wrong-password");

    await expect(loginAction(formData)).rejects.toThrow(
      "redirect:/reading-river/login?error=invalid_credentials",
    );

    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("rejects deactivated accounts without creating a session", async () => {
    const passwordHash = await hashPassword("reader-password");
    const userFindUnique = vi.fn(async () => ({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash,
      status: "deactivated",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    }));

    dbMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });

    const formData = new FormData();
    formData.set("email", "reader@example.com");
    formData.set("password", "reader-password");

    await expect(loginAction(formData)).rejects.toThrow(
      "redirect:/reading-river/login?error=account_disabled",
    );

    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("allows whitespace-only passwords when they match the stored hash", async () => {
    const passwordHash = await hashPassword("   ");
    const userFindUnique = vi.fn(async () => ({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash,
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    }));

    dbMocks.setPrismaMock({
      user: {
        findUnique: userFindUnique,
      },
    });
    sessionMocks.createSession.mockResolvedValue({
      token: "session-token",
      session: {
        id: "session-1",
      },
    });

    actionMocks.setCookieStore({
      set: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    });

    const formData = new FormData();
    formData.set("email", "reader@example.com");
    formData.set("password", "   ");

    await expect(loginAction(formData)).rejects.toThrow("redirect:/reading-river");

    expect(sessionMocks.createSession).toHaveBeenCalledWith("user-1");
  });

  it("revokes the current session on logout", async () => {
    const cookieGet = vi.fn(() => ({
      value: "session-token",
    }));
    actionMocks.setCookieStore({
      set: vi.fn(),
      delete: vi.fn(),
      get: cookieGet,
    });

    const response = await logout(new Request("https://reading-river.test/reading-river/logout"));

    expect(sessionMocks.revokeSession).toHaveBeenCalledWith("session-token");
    expect(response.headers.get("location")).toContain("/reading-river/login");
    expect(response.headers.get("set-cookie")).toContain("reading-river-session=");
  });
});
