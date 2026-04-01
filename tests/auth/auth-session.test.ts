import { describe, expect, it } from "vitest";
import {
  createSignedSession,
  getSessionCookieName,
  getSessionCookieOptions,
  hasValidSession,
  hashPassword,
  verifyPassword,
} from "@/lib/reading-river/auth";

describe("auth session config", () => {
  it("uses the default cookie name when no override is set", () => {
    const originalCookieName = process.env.SESSION_COOKIE_NAME;
    delete process.env.SESSION_COOKIE_NAME;

    expect(getSessionCookieName()).toBe("reading-river-session");

    if (originalCookieName === undefined) {
      delete process.env.SESSION_COOKIE_NAME;
      return;
    }

    process.env.SESSION_COOKIE_NAME = originalCookieName;
  });

  it("keeps the expected session cookie options", () => {
    expect(getSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  });

  it("hashes and verifies a password", async () => {
    const passwordHash = await hashPassword("secret-password");

    expect(passwordHash).not.toBe("secret-password");
    await expect(verifyPassword("secret-password", passwordHash)).resolves.toBe(true);
  });

  it("signs and validates a session token", async () => {
    const now = 1_710_000_000_000;
    const token = await createSignedSession("session-secret", now);

    await expect(hasValidSession(token, "session-secret", now)).resolves.toBe(true);
  });

  it("does not expose the legacy shared-password helper", async () => {
    const auth = await import("@/lib/reading-river/auth");

    expect("isValidPassword" in auth).toBe(false);
  });
});
