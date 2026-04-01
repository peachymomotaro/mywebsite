import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, getSessionCookieOptions } from "@/lib/reading-river/auth";
import { revokeSession } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  if (sessionToken) {
    await revokeSession(sessionToken);
  }

  const response = NextResponse.redirect(new URL(readingRiverPath("/login"), request.url));

  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
