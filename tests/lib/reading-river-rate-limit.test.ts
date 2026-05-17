import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

describe("Reading River rate limits", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
  });

  it("permits attempts below the configured limit", async () => {
    const upsert = vi.fn(async () => ({
      count: 3,
    }));

    mocks.setPrismaMock({
      rateLimitBucket: {
        upsert,
      },
    });

    const { consumeRateLimit } = await import("@/lib/reading-river/rate-limit");

    await expect(
      consumeRateLimit({
        name: "test",
        key: "user-1",
        limit: 5,
        windowMs: 60_000,
        now: new Date("2026-05-17T12:00:30Z"),
      }),
    ).resolves.toMatchObject({
      allowed: true,
      count: 3,
      limit: 5,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name_key_windowStart: {
            name: "test",
            key: expect.stringMatching(/^[a-f0-9]{64}$/),
            windowStart: new Date("2026-05-17T12:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("blocks attempts after the configured limit", async () => {
    mocks.setPrismaMock({
      rateLimitBucket: {
        upsert: vi.fn(async () => ({
          count: 6,
        })),
      },
    });

    const { consumeRateLimit } = await import("@/lib/reading-river/rate-limit");

    await expect(
      consumeRateLimit({
        name: "failed_login",
        key: "reader@example.com|203.0.113.10",
        limit: 5,
        windowMs: 15 * 60_000,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      count: 6,
      limit: 5,
    });
  });
});
