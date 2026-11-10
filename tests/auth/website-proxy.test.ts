import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function getRedirectLocation(response: Response) {
  return response.headers.get("location");
}

describe("website proxy", () => {
  it("ignores public website routes", async () => {
    const response = await proxy(new NextRequest("https://example.com/about"));

    expect(getRedirectLocation(response)).toBeNull();
  });

  it("leaves Reading River to its own project", async () => {
    const response = await proxy(new NextRequest("https://example.com/reading-river/history"));

    expect(getRedirectLocation(response)).toBeNull();
  });

  it("redirects the retired QB page and login to POps", async () => {
    for (const path of ["/qb", "/qb/anything", "/qb-login"]) {
      const response = await proxy(new NextRequest(`https://example.com${path}`));

      expect(response.status).toBe(307);
      expect(getRedirectLocation(response)).toBe("https://example.com/pops");
    }
  });

  it("does not let a legacy QB password cookie through to anything", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/qb", {
        headers: { cookie: "qb_auth=correct-password" },
      }),
    );

    expect(getRedirectLocation(response)).toBe("https://example.com/pops");
  });

  it("returns 410 Gone for the retired QB API", async () => {
    const response = await proxy(new NextRequest("https://example.com/api/qb/extract"));

    expect(response.status).toBe(410);
    expect(getRedirectLocation(response)).toBeNull();
  });
});
