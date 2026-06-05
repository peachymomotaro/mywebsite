import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import {
  readingRiverPath,
  READING_RIVER_BASE_PATH,
} from "@/lib/reading-river/routes";

function isPublicReadingRiverPath(pathname: string) {
  const extensionApiPath = readingRiverPath("/api/extension");

  return (
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

function protectQB(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get("qb_auth")?.value;
  const password = process.env.QB_PASSWORD;

  if (!password) {
    return NextResponse.json(
      { error: "QB password is not configured" },
      { status: 503 }
    );
  }

  if (authCookie === password) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/qb")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/qb-login", request.url));
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
    pathname === "/api/qb" ||
    pathname.startsWith("/api/qb/")
  ) {
    return protectQB(request);
  }

  if (pathname.startsWith(READING_RIVER_BASE_PATH)) {
    return protectReadingRiver(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/qb", "/qb/:path*", "/api/qb/:path*", "/reading-river/:path*"],
};
