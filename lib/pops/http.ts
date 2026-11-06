import { NextResponse } from "next/server";
import { authenticateAgent, readBearerToken, type AgentPrincipal } from "@/lib/pops/agent-auth";
import { describeError } from "@/lib/pops/agent-ops";

const MAX_BODY_BYTES = 256 * 1024;

const noStore = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export async function readJsonBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw Object.assign(new Error("too_large"), { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw Object.assign(new Error("too_large"), { status: 413 });
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

/** Wraps a private API handler: bearer agent credential required, errors mapped. */
export function withAgent<C>(handler: (principal: AgentPrincipal, request: Request, context: C) => Promise<unknown>) {
  return async (request: Request, context: C) => {
    const principal = await authenticateAgent(readBearerToken(request.headers.get("authorization")));
    if (!principal) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: { ...noStore, "WWW-Authenticate": 'Bearer realm="pops"' } },
      );
    }
    try {
      const result = await handler(principal, request, context);
      return result instanceof Response ? result : json(result);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 413 || status === 400) return json({ error: (error as Error).message }, status);
      const described = describeError(error);
      return json(described.body, described.status);
    }
  };
}
