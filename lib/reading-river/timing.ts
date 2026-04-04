type TimingDetails = Record<string, string | number | boolean | null | undefined>;

function isEnabledValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isReadingRiverTimingEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return isEnabledValue(environment.READING_RIVER_TIMING_DEBUG);
}

function formatDetailValue(value: string | number | boolean | null | undefined) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  return String(value);
}

function formatDetails(details: TimingDetails) {
  const parts = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatDetailValue(value)}`);

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function logReadingRiverTiming(name: string, durationMs: number, details: TimingDetails = {}) {
  if (!isReadingRiverTimingEnabled()) {
    return;
  }

  const roundedDuration = durationMs.toFixed(1);

  console.info(
    `[reading-river-timing] ${name} durationMs=${roundedDuration}${formatDetails(details)}`,
  );
}

export async function measureReadingRiverTiming<T>(
  name: string,
  action: () => Promise<T> | T,
  details: TimingDetails = {},
) {
  const start = performance.now();
  let outcome: "ok" | "error" = "ok";

  try {
    return await action();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    logReadingRiverTiming(name, performance.now() - start, {
      ...details,
      outcome,
    });
  }
}
