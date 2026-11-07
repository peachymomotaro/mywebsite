import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots", () => {
  it("keeps private POps and retired QB routes out of crawler indexes", () => {
    expect(robots()).toMatchObject({
      rules: expect.arrayContaining([
        {
          userAgent: "*",
          disallow: ["/pops", "/api/pops", "/qb", "/api/qb"],
        },
      ]),
    });
  });
});
