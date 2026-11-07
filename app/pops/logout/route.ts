import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { POPS_SESSION_COOKIE, revokePopsSession } from "@/lib/pops/auth";

export async function POST(request: Request) {
  const store = await cookies();
  await revokePopsSession(store.get(POPS_SESSION_COOKIE)?.value);
  store.delete(POPS_SESSION_COOKIE);
  return NextResponse.redirect(new URL("/pops/login", request.url), 303);
}
