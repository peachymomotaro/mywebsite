import { createHash } from "node:crypto";

type SecurityLogLevel = "info" | "warn";

type SecurityLogMetadata = Record<string, string | number | boolean | null | undefined>;

export function hashSecurityValue(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function getUrlLogFields(url: string) {
  try {
    const parsed = new URL(url);

    return {
      urlHostname: parsed.hostname,
      urlProtocol: parsed.protocol,
    };
  } catch {
    return {
      urlHostname: "invalid",
      urlProtocol: "invalid",
    };
  }
}

export function logSecurityEvent(
  event: string,
  metadata: SecurityLogMetadata = {},
  level: SecurityLogLevel = "info",
) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  if (level === "warn") {
    console.warn("Reading River security event", payload);
    return;
  }

  console.info("Reading River security event", payload);
}
