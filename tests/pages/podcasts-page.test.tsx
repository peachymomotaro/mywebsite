import { describe, expect, it } from "vitest";
import Podcasts from "@/pages/podcasts";

describe("Podcasts page", () => {
  it("opts into the wider site layout", () => {
    expect(Podcasts.wideContent).toBe(true);
  });
});
