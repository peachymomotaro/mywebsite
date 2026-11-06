// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkOwnerPassword, getPasswordConfig, hashToken } from "@/lib/pops/auth";
import { readBearerToken } from "@/lib/pops/agent-auth";
import { safeNextPath } from "@/lib/pops/paths";
import { hashPassword } from "@/lib/reading-river/auth";

describe("POps owner password", () => {
  it("prefers a scrypt hash, then POPS_PASSWORD, then the legacy QB password", () => {
    expect(getPasswordConfig({ POPS_PASSWORD_HASH: "h", POPS_PASSWORD: "p", QB_PASSWORD: "q" })).toEqual({ kind: "hash", value: "h" });
    expect(getPasswordConfig({ POPS_PASSWORD: "p", QB_PASSWORD: "q" })).toEqual({ kind: "plain", value: "p", legacy: false });
    expect(getPasswordConfig({ QB_PASSWORD: "q" })).toEqual({ kind: "plain", value: "q", legacy: true });
    expect(getPasswordConfig({})).toEqual({ kind: "missing" });
  });

  it("verifies against a hash and against plain configuration", async () => {
    const hash = await hashPassword("correct horse");
    expect(await checkOwnerPassword("correct horse", { kind: "hash", value: hash })).toBe(true);
    expect(await checkOwnerPassword("wrong", { kind: "hash", value: hash })).toBe(false);
    expect(await checkOwnerPassword("pw", { kind: "plain", value: "pw", legacy: false })).toBe(true);
    expect(await checkOwnerPassword("pw ", { kind: "plain", value: "pw", legacy: false })).toBe(false);
  });

  it("refuses every login when no password is configured, including an empty one", async () => {
    expect(await checkOwnerPassword("", { kind: "missing" })).toBe(false);
    expect(await checkOwnerPassword("anything", { kind: "missing" })).toBe(false);
    expect(await checkOwnerPassword("", { kind: "plain", value: "", legacy: false })).toBe(false);
  });

  it("never stores raw session tokens", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toContain("abc");
  });
});

describe("redirect and header parsing", () => {
  it("only redirects back inside POps after login", () => {
    expect(safeNextPath("/pops/tasks/abc")).toBe("/pops/tasks/abc");
    expect(safeNextPath("https://evil.example")).toBe("/pops");
    expect(safeNextPath("//evil.example")).toBe("/pops");
    expect(safeNextPath("/popsicle")).toBe("/pops");
    expect(safeNextPath("/pops/../reading-river")).toBe("/pops");
    expect(safeNextPath(undefined)).toBe("/pops");
  });

  it("reads bearer tokens strictly", () => {
    expect(readBearerToken("Bearer pops_abc")).toBe("pops_abc");
    expect(readBearerToken("bearer pops_abc")).toBe("pops_abc");
    expect(readBearerToken("Basic xyz")).toBeNull();
    expect(readBearerToken("Bearer a b")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });
});
