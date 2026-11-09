import { NextResponse } from "next/server";
import { authenticateAgent, readBearerToken } from "@/lib/pops/agent-auth";
import { readJsonBody } from "@/lib/pops/http";
import { handleMcpMessage } from "@/lib/pops/mcp";
import { oauthMetadataUrl, oauthResource } from "@/lib/pops/oauth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const principal = await authenticateAgent(readBearerToken(request.headers.get("authorization")), new Date(), oauthResource());
  if (!principal) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": `Bearer realm="pops", resource_metadata="${oauthMetadataUrl()}"` } },
    );
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const messages = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map((m) => handleMcpMessage(principal, m)))).filter(Boolean);
  if (!responses.length) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], { headers: { "Cache-Control": "no-store" } });
}

/** Stateless server: no server-initiated stream. */
export async function GET(request: Request) {
  if (!(await authenticateAgent(readBearerToken(request.headers.get("authorization")), new Date(), oauthResource()))) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": `Bearer realm="pops", resource_metadata="${oauthMetadataUrl()}"` } });
  }
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
