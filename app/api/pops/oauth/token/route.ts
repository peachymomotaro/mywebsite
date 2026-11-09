import { exchangeOAuthToken, OAuthError } from "@/lib/pops/oauth";
import { oauthErrorResponse, oauthHeaders, oauthRateLimit, readOAuthForm } from "@/lib/pops/oauth-http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const limited = await oauthRateLimit(request, "token", 300);
    if (limited) return limited;
    if (request.headers.has("authorization")) throw new OAuthError("invalid_client", "Public clients must send client_id in the form body.");
    return Response.json(await exchangeOAuthToken(await readOAuthForm(request)), { headers: oauthHeaders });
  } catch (error) { return oauthErrorResponse(error); }
}
