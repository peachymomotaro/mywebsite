import { NextResponse } from "next/server";
import { revokeExtensionToken } from "@/lib/reading-river/extension-auth";

function getBearerToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

export async function POST(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (token) {
    await revokeExtensionToken(token);
  }

  return new NextResponse(null, {
    status: 204,
  });
}
