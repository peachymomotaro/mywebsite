import { describe, expect, it } from "vitest";
import {
  READING_RIVER_BASE_PATH,
  readingRiverPath,
} from "@/lib/reading-river/routes";

describe("readingRiverPath", () => {
  it("keeps Reading River route generation under a fixed prefix", () => {
    expect(READING_RIVER_BASE_PATH).toBe("/reading-river");
    expect(readingRiverPath("")).toBe("/reading-river");
    expect(readingRiverPath("/login")).toBe("/reading-river/login");
    expect(readingRiverPath("admin")).toBe("/reading-river/admin");
  });
});
