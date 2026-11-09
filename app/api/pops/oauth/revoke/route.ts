import { revokeOAuthToken, OAuthError } from "@/lib/pops/oauth";
import { oauthErrorResponse, oauthHeaders, oauthRateLimit, readOAuthForm } from "@/lib/pops/oauth-http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const limited = await oauthRateLimit(request, "revoke", 100);
    if (limited) return limited;
    const params = await readOAuthForm(request);
    if (!params.get("client_id") || !params.get("token")) throw new OAuthError("invalid_request", "Client id and token required.");
    await revokeOAuthToken(params.get("client_id")!, params.get("token")!);
    return new Response(null, { status: 200, headers: oauthHeaders });
  } catch (error) { return oauthErrorResponse(error); }
}
