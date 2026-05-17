import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { READING_RIVER_LIMITS } from "@/lib/reading-river/input-limits";
import { getUrlLogFields, logSecurityEvent } from "@/lib/reading-river/security-log";

const FETCHED_HTML_TOO_LARGE_ERROR = "fetched_html_too_large";
const BLOCKED_FETCH_TARGET_ERROR = "blocked_fetch_target";

function parseIpv4(address: string) {
  const parts = address.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number(part));

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

function isPrivateIpv4(address: string) {
  const octets = parseIpv4(address);

  if (!octets) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parseFirstIpv6Hextet(address: string) {
  const first = address.toLowerCase().replace(/^\[|\]$/g, "").split(":")[0];

  if (!first) {
    return 0;
  }

  const parsed = Number.parseInt(first, 16);

  return Number.isFinite(parsed) ? parsed : null;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice("::ffff:".length));
  }

  const firstHextet = parseFirstIpv6Hextet(normalized);

  if (firstHextet === null) {
    return false;
  }

  return (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80;
}

function isBlockedAddress(address: string) {
  const normalized = address.replace(/^\[|\]$/g, "");
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export async function assertSafePublicHttpUrl(url: string) {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    logSecurityEvent("blocked_url_fetch", getUrlLogFields(url), "warn");
    throw new Error(BLOCKED_FETCH_TARGET_ERROR);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    logSecurityEvent(
      "blocked_url_fetch",
      {
        ...getUrlLogFields(url),
        reason: "localhost",
      },
      "warn",
    );
    throw new Error(BLOCKED_FETCH_TARGET_ERROR);
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      logSecurityEvent(
        "blocked_url_fetch",
        {
          ...getUrlLogFields(url),
          reason: "blocked_ip",
        },
        "warn",
      );
      throw new Error(BLOCKED_FETCH_TARGET_ERROR);
    }

    return;
  }

  const addresses = await lookup(hostname, { all: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    logSecurityEvent(
      "blocked_url_fetch",
      {
        ...getUrlLogFields(url),
        reason: addresses.length === 0 ? "dns_no_addresses" : "dns_private_address",
      },
      "warn",
    );
    throw new Error(BLOCKED_FETCH_TARGET_ERROR);
  }
}

export async function readLimitedResponseText(
  response: Response,
  maxBytes = READING_RIVER_LIMITS.fetchedHtmlBytes,
) {
  const contentLength = response.headers?.get("content-length") ?? null;

  if (contentLength !== null && Number(contentLength) > maxBytes) {
    logSecurityEvent(
      "oversized_fetch_blocked",
      {
        contentLength: Number(contentLength),
        maxBytes,
      },
      "warn",
    );
    throw new Error(FETCHED_HTML_TOO_LARGE_ERROR);
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBytes) {
      await reader.cancel();
      logSecurityEvent(
        "oversized_fetch_blocked",
        {
          bytesRead,
          maxBytes,
        },
        "warn",
      );
      throw new Error(FETCHED_HTML_TOO_LARGE_ERROR);
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
