import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/reading-river/auth", () => ({ getSessionCookieName: () => "reading-river-session" }));

import { config, proxy } from "@/proxy";

const location = (response: Response) => response.headers.get("location");

describe("POps proxy gate", () => {
  it("redirects anonymous POps page requests to the POps login", async () => {
    expect(location(await proxy(new NextRequest("https://example.com/pops")))).toBe("https://example.com/pops/login");
    expect(location(await proxy(new NextRequest("https://example.com/pops/tasks/abc")))).toBe(
      "https://example.com/pops/login?next=%2Fpops%2Ftasks%2Fabc",
    );
  });

  it("keeps the POps login page public", async () => {
    expect(location(await proxy(new NextRequest("https://example.com/pops/login")))).toBeNull();
  });

  it("lets a request with a session cookie reach the page, which validates it against the database", async () => {
    const response = await proxy(new NextRequest("https://example.com/pops/learn", { headers: { cookie: "pops_session=x" } }));
    expect(location(response)).toBeNull();
  });

  it("does not accept the Reading River session cookie for POps", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/pops", { headers: { cookie: "reading-river-session=x" } }),
    );
    expect(location(response)).toBe("https://example.com/pops/login");
  });

  it("does not accept a POps cookie for Reading River", async () => {
    const response = await proxy(new NextRequest("https://example.com/reading-river", { headers: { cookie: "pops_session=x" } }));
    expect(location(response)).toBe("https://example.com/reading-river/login");
  });

  it("leaves public pages and unrelated APIs untouched", async () => {
    for (const path of ["/", "/about", "/blog", "/projects", "/api/name-ranker", "/api/reading-river/daily-digest", "/popsicle"]) {
      const response = await proxy(new NextRequest(`https://example.com${path}`));
      expect(location(response), path).toBeNull();
      expect(response.status, path).toBe(200);
    }
  });

  it("does not gate the agent API by cookie; handlers require bearer credentials", async () => {
    expect(config.matcher).not.toContain("/api/pops/:path*");
  });
});
