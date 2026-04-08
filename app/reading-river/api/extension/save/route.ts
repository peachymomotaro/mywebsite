import { NextResponse } from "next/server";
import { z } from "zod";
import { createReadingItemForUser } from "@/lib/reading-river/extension-items";
import { getCurrentUserFromExtensionToken } from "@/lib/reading-river/extension-auth";

const saveExtensionItemSchema = z.object({
  url: z.string().trim().url(),
  title: z.string().optional().nullable(),
  priorityScore: z.number().int().min(0).max(10),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
});

function getBearerToken(authorization: string | null) {
  const match = authorization?.match(/^\s*bearer\s+(.+)\s*$/i);

  if (!match) {
    return null;
  }

  return match[1]?.trim() || null;
}

function unauthorized() {
  return NextResponse.json(
    {
      error: "unauthorized",
    },
    {
      status: 401,
    },
  );
}

function invalidPayload() {
  return NextResponse.json(
    {
      error: "invalid_payload",
    },
    {
      status: 400,
    },
  );
}

function saveFailed() {
  return NextResponse.json(
    {
      error: "save_failed",
    },
    {
      status: 500,
    },
  );
}

export async function POST(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return unauthorized();
  }

  const currentUser = await getCurrentUserFromExtensionToken(token);

  if (!currentUser) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsedBody = saveExtensionItemSchema.safeParse(body);

  if (!parsedBody.success) {
    return invalidPayload();
  }

  const title = String(parsedBody.data.title ?? "").trim() || parsedBody.data.url;
  try {
    const item = await createReadingItemForUser(currentUser.id, {
      title,
      sourceType: "url",
      sourceUrl: parsedBody.data.url,
      priorityScore: parsedBody.data.priorityScore,
      status: "unread",
      estimatedMinutes: parsedBody.data.estimatedMinutes ?? null,
    });

    return NextResponse.json(
      {
        id: item.id,
        title: item.title,
      },
      {
        status: 201,
      },
    );
  } catch {
    return saveFailed();
  }
}
