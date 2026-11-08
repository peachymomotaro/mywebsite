import { authorizationServerMetadata } from "@/lib/pops/oauth";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(authorizationServerMetadata(), { headers: { "Cache-Control": "no-store" } });
}
