import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots", () => {
  it("keeps QBReader routes out of crawler indexes", () => {
    expect(robots()).toMatchObject({
      rules: expect.arrayContaining([
        {
          userAgent: "*",
          disallow: ["/qb", "/api/qb"],
        },
      ]),
    });
  });
});
