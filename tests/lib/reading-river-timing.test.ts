import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isReadingRiverTimingEnabled,
  measureReadingRiverTiming,
} from "@/lib/reading-river/timing";

describe("reading river timing", () => {
  const originalTimingDebug = process.env.READING_RIVER_TIMING_DEBUG;

  afterEach(() => {
    if (originalTimingDebug === undefined) {
      delete process.env.READING_RIVER_TIMING_DEBUG;
    } else {
      process.env.READING_RIVER_TIMING_DEBUG = originalTimingDebug;
    }

    vi.restoreAllMocks();
  });

  it("stays disabled by default", () => {
    delete process.env.READING_RIVER_TIMING_DEBUG;

    expect(isReadingRiverTimingEnabled()).toBe(false);
  });

  it("enables timing logs when the env flag is true", () => {
    process.env.READING_RIVER_TIMING_DEBUG = "true";

    expect(isReadingRiverTimingEnabled()).toBe(true);
  });

  it("logs a successful timing measurement when enabled", async () => {
    process.env.READING_RIVER_TIMING_DEBUG = "true";
    const consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await measureReadingRiverTiming("current-user.resolve", async () => "done", {
      route: "/reading-river",
    });

    expect(result).toBe("done");
    expect(consoleInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("[reading-river-timing] current-user.resolve"),
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(expect.stringContaining("route=/reading-river"));
    expect(consoleInfoMock).toHaveBeenCalledWith(expect.stringContaining("outcome=ok"));
  });

  it("logs an errored timing measurement when enabled", async () => {
    process.env.READING_RIVER_TIMING_DEBUG = "true";
    const consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(
      measureReadingRiverTiming("session.lookup", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(consoleInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("[reading-river-timing] session.lookup"),
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(expect.stringContaining("outcome=error"));
  });

  it("does not log when disabled", async () => {
    delete process.env.READING_RIVER_TIMING_DEBUG;
    const consoleInfoMock = vi.spyOn(console, "info").mockImplementation(() => {});

    await measureReadingRiverTiming("page.add.render", async () => "done");

    expect(consoleInfoMock).not.toHaveBeenCalled();
  });
});
