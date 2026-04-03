import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import { readingRiverPath, READING_RIVER_BASE_PATH } from "@/lib/reading-river/routes";
import { getCurrentUserFromSessionToken } from "@/lib/reading-river/session";

function isPublicReadingRiverPath(pathname: string) {
  return (
    pathname === readingRiverPath("/beta") ||
    pathname === readingRiverPath("/invite") ||
    pathname === readingRiverPath("/login") ||
    pathname === readingRiverPath("/logout") ||
    pathname.startsWith(`${readingRiverPath("/invite")}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(READING_RIVER_BASE_PATH)) {
    return NextResponse.next();
  }

  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  if (isPublicReadingRiverPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const user = await getCurrentUserFromSessionToken(token);

  if (!user) {
    return NextResponse.redirect(new URL(readingRiverPath("/login"), request.url));
  }

  if (pathname.startsWith(readingRiverPath("/admin")) && !user.isAdmin) {
    return NextResponse.redirect(new URL(readingRiverPath("/login"), request.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/reading-river/:path*"],
};
