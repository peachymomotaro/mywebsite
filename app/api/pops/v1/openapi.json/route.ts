import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/pops/openapi";

/** Public: describes the API shape only. Contains no task data or secrets. */
export function GET() {
  return NextResponse.json(buildOpenApiDocument());
}
