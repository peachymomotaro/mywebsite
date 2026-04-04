import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import { readingRiverPath, READING_RIVER_BASE_PATH } from "@/lib/reading-river/routes";

function isPublicReadingRiverPath(pathname: string) {
  return (
    pathname === readingRiverPath("/beta") ||
    pathname === readingRiverPath("/invite") ||
    pathname === readingRiverPath("/login") ||
    pathname === readingRiverPath("/logout") ||
    pathname.startsWith(`${readingRiverPath("/invite")}/`)
  );
}

export async function proxy(request: NextRequest) {
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

  const hasSessionCookie = Boolean(request.cookies.get(getSessionCookieName())?.value);

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(readingRiverPath("/login"), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/reading-river/:path*"],
};
