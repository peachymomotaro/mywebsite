import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import {
  readingRiverPath,
  READING_RIVER_BASE_PATH,
} from "@/lib/reading-river/routes";

// Kept local (not imported from lib/pops/auth) so the proxy bundle stays free
// of Node crypto and database code.
const POPS_SESSION_COOKIE = "pops_session";

function isPublicReadingRiverPath(pathname: string) {
  const extensionApiPath = readingRiverPath("/api/extension");

  return (
    pathname.startsWith(readingRiverPath("/music/")) ||
    pathname === extensionApiPath ||
    pathname.startsWith(`${extensionApiPath}/`) ||
    pathname === readingRiverPath("/beta") ||
    pathname === readingRiverPath("/invite") ||
    pathname === readingRiverPath("/login") ||
    pathname === readingRiverPath("/logout") ||
    pathname.startsWith(`${readingRiverPath("/invite")}/`) ||
    pathname.startsWith(`${readingRiverPath("/reset-password")}/`)
  );
}

/** The Canon Explorer (QB) has been replaced by POps. */
function retireQB(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/qb" || pathname.startsWith("/api/qb/")) {
    return NextResponse.json({ error: "This API has been retired." }, { status: 410 });
  }

  // Temporary (307) so the redirect is easy to reverse.
  return NextResponse.redirect(new URL("/pops", request.url), 307);
}

/**
 * Cheap gate only: is there a POps session cookie at all? Every POps page and
 * server action then validates the session against the database. The private
 * agent API under /api/pops authenticates bearer credentials itself.
 */
function protectPOps(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/pops/login") {
    return NextResponse.next();
  }

  if (request.cookies.get(POPS_SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/pops/login", request.url);
  if (pathname !== "/pops") {
    loginUrl.searchParams.set("next", pathname + (pathname === "/pops/oauth/authorize" ? request.nextUrl.search : ""));
  }

  return NextResponse.redirect(loginUrl);
}

function protectReadingRiver(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  if (isPublicReadingRiverPath(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(
    request.cookies.get(getSessionCookieName())?.value
  );

  if (!hasSessionCookie) {
    return NextResponse.redirect(
      new URL(readingRiverPath("/login"), request.url)
    );
  }

  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/qb" ||
    pathname.startsWith("/qb/") ||
    pathname === "/qb-login" ||
    pathname === "/api/qb" ||
    pathname.startsWith("/api/qb/")
  ) {
    return retireQB(request);
  }

  if (pathname === "/pops" || pathname.startsWith("/pops/")) {
    return protectPOps(request);
  }

  if (pathname.startsWith(READING_RIVER_BASE_PATH)) {
    return protectReadingRiver(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/qb",
    "/qb/:path*",
    "/qb-login",
    "/api/qb/:path*",
    "/pops",
    "/pops/:path*",
    "/reading-river/:path*",
  ],
};
