import { protectedResourceMetadata } from "@/lib/pops/oauth";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(protectedResourceMetadata(), { headers: { "Cache-Control": "no-store" } });
}
