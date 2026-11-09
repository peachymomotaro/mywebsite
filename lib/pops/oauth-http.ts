import { OAuthError } from "@/lib/pops/oauth";
import { consumeRateLimit } from "@/lib/reading-river/rate-limit";

export const oauthHeaders = { "Cache-Control": "no-store", Pragma: "no-cache" };
export function oauthErrorResponse(error: unknown) {
  if (error instanceof OAuthError) return Response.json({ error: error.code, error_description: error.message }, { status: 400, headers: oauthHeaders });
  console.error("[pops oauth] unexpected error", error);
  return Response.json({ error: "server_error" }, { status: 500, headers: oauthHeaders });
}

export async function oauthRateLimit(request: Request, name: string, limit: number) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const result = await consumeRateLimit({ name: `pops_oauth_${name}`, key: ip, limit, windowMs: 60 * 60_000 });
  return result.allowed ? null : Response.json({ error: "temporarily_unavailable" }, { status: 429, headers: { ...oauthHeaders, "Retry-After": "3600" } });
}

export async function readOAuthForm(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    throw new OAuthError("invalid_request", "Use application/x-www-form-urlencoded.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new OAuthError("invalid_request", "Request body required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new OAuthError("invalid_request", "Request body too large.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
