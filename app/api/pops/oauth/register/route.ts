import { registerOAuthClient } from "@/lib/pops/oauth";
import { oauthErrorResponse, oauthHeaders, oauthRateLimit } from "@/lib/pops/oauth-http";
import { readJsonBody } from "@/lib/pops/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const limited = await oauthRateLimit(request, "registration", 20);
    if (limited) return limited;
    let body: unknown;
    try { body = await readJsonBody(request); } catch {
      return Response.json({ error: "invalid_client_metadata" }, { status: 400, headers: oauthHeaders });
    }
    return Response.json(await registerOAuthClient(body), { status: 201, headers: oauthHeaders });
  } catch (error) { return oauthErrorResponse(error); }
}
