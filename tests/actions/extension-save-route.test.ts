import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    getCurrentUserFromExtensionToken: vi.fn(),
    revalidatePath: vi.fn(),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: routeMocks.revalidatePath,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: routeMocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/extension-auth", () => ({
  getCurrentUserFromExtensionToken: routeMocks.getCurrentUserFromExtensionToken,
}));

import { POST } from "@/app/reading-river/api/extension/save/route";

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "River Reader",
    passwordHash: "password-hash",
    status: "active",
    isAdmin: false,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
    ...overrides,
  };
}

describe("reading river extension save route", () => {
  beforeEach(() => {
    routeMocks.getPrismaClient.mockClear();
    routeMocks.getCurrentUserFromExtensionToken.mockReset();
    routeMocks.revalidatePath.mockClear();
  });

  it("creates an unread url item with a nullable estimated minutes value", async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "item-1",
      ...data,
    }));

    routeMocks.setPrismaMock({
      readingItem: {
        create,
      },
    });
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "   ",
        priorityScore: 7,
        estimatedMinutes: null,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "item-1",
      title: "https://example.com/article",
    });
    expect(routeMocks.getCurrentUserFromExtensionToken).toHaveBeenCalledWith("extension-token");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          title: "https://example.com/article",
          sourceType: "url",
          sourceUrl: "https://example.com/article",
          priorityScore: 7,
          status: "unread",
          estimatedMinutes: null,
        }),
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    );
    expect(routeMocks.revalidatePath).toHaveBeenCalled();
  });

  it("rejects nonpositive estimated minutes", async () => {
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
        priorityScore: 5,
        estimatedMinutes: 0,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_payload",
    });
  });

  it("rejects requests without a bearer token", async () => {
    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
        priorityScore: 5,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(routeMocks.getCurrentUserFromExtensionToken).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid bearer token", async () => {
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(null);

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
        priorityScore: 5,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(routeMocks.getCurrentUserFromExtensionToken).toHaveBeenCalledWith("invalid-token");
  });

  it("rejects requests without a priority score", async () => {
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects requests with an out-of-range priority score", async () => {
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
        priorityScore: 11,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns a controlled error response when persistence fails", async () => {
    const create = vi.fn(async () => {
      throw new Error("database unavailable");
    });

    routeMocks.setPrismaMock({
      readingItem: {
        create,
      },
    });
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com/article",
        title: "Read later",
        priorityScore: 5,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "save_failed",
    });
  });

  it("rejects malformed JSON bodies as invalid payload", async () => {
    routeMocks.getCurrentUserFromExtensionToken.mockResolvedValue(createUser());

    const request = new Request("https://example.com/reading-river/api/extension/save", {
      method: "POST",
      headers: {
        authorization: "Bearer extension-token",
        "content-type": "application/json",
      },
      body: "{not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_payload",
    });
  });
});
