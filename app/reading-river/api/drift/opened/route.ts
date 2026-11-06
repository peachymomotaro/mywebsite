import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/reading-river/current-user";
import { noteDriftOpened } from "@/lib/reading-river/drift-store";
import { readingItemIdSchema } from "@/lib/reading-river/validators/reading-item";

// Sent with fetch keepalive as a river item's link is followed, so it survives the
// page unloading. Opening clears the item's unread-appearance history and carries
// it into the eddies; the reply names any piece that drifted out to make room.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const parsed = readingItemIdSchema.safeParse(body?.id);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { drifted } = await noteDriftOpened(user.id, parsed.data);
  return NextResponse.json({ ok: true, drifted: drifted?.id ?? null });
}
