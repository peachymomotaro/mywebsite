import { NextResponse } from "next/server";
import { revokeExtensionToken } from "@/lib/reading-river/extension-auth";

function getBearerToken(authorization: string | null) {
  const match = authorization?.match(/^\s*bearer\s+(.+)\s*$/i);

  if (!match) {
    return null;
  }

  return match[1] || null;
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
