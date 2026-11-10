import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, getSessionCookieOptions } from "@/lib/reading-river/auth";
import { revokeSession } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";

/** Ends the session on the server as well as clearing the cookie, then goes to the login page. */
async function signOut(request: Request, status: 303 | 307) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  if (sessionToken) {
    await revokeSession(sessionToken);
  }

  const response = NextResponse.redirect(new URL(readingRiverPath("/login"), request.url), status);

  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}

/** The Sign out button posts here; 303 sends the browser on to the login page with a plain GET. */
export function POST(request: Request) {
  return signOut(request, 303);
}

export function GET(request: Request) {
  return signOut(request, 307);
}
