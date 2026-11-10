import { NextRequest, NextResponse } from "next/server";

// Kept local (not imported from lib/pops/auth) so the proxy bundle stays free
// of Node crypto and database code.
const POPS_SESSION_COOKIE = "pops_session";

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

// Reading River (/reading-river) is served by its own Vercel project, which
// does its own sign-in checks; see the rewrites in next.config.ts.
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
  ],
};
