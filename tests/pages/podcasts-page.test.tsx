import { describe, expect, it } from "vitest";
// @ts-expect-error -- the legacy Pages Router page is JavaScript without declarations.
import Podcasts from "@/pages/podcasts";

describe("Podcasts page", () => {
  it("opts into the wider site layout", () => {
    expect(Podcasts.wideContent).toBe(true);
  });
});
