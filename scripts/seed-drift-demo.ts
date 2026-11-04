// Local-only demo data for reviewing the river. Refuses non-local databases.
//
//   DATABASE_URL=postgresql://postgres:pond@127.0.0.1:55432/drift_dev \
//     npx tsx scripts/seed-drift-demo.ts <output-file>
//
// Creates four users (full, small, snoozed, empty collections) and writes
// one session token per user to <output-file> for local browser review.

import { writeFileSync } from "node:fs";
import { getPrismaClient } from "@/lib/reading-river/db";
import { createSession } from "@/lib/reading-river/session";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
  throw new Error("seed-drift-demo only runs against a local database.");
}

const articles: Array<[string, string, number, number | null]> = [
  ["The quiet art of paying attention", "Aeon", 12, 8],
  ["What a river remembers", "The Paris Review", 9, null],
  ["On reading slowly in a hurried world", "Aeon", 7, 9],
  ["A field guide to getting lost", "The Paris Review", 18, null],
  ["Why we keep notebooks", "The Marginalian", 6, 5],
  ["The architecture of an afternoon", "Places Journal", 22, null],
  ["Letters from a lighthouse keeper", "Granta", 14, 7],
  ["How moss tells time", "Emergence Magazine", 11, null],
  ["The case for boredom", "The Atlantic", 9, 6],
  ["Walking as a way of thinking", "Aeon", 16, null],
  ["Small rooms, large thoughts", "Longreads", 28, null],
  ["The patience of gardeners", "Orion", 8, 4],
  ["Maps of imaginary places", "Public Domain Review", 13, null],
  ["What the tide leaves behind", "Hakai Magazine", 40, 3],
];

async function main() {
  const prisma = getPrismaClient();
  const output = process.argv[2];
  if (!output) throw new Error("Pass an output file for the session tokens.");
  await prisma.user.deleteMany({ where: { email: { endsWith: "@drift.test" } } });

  const scenarios: Record<string, number> = { full: articles.length, small: 2, snoozed: 2, empty: 0 };
  const tokens: Record<string, string> = {};

  for (const [name, count] of Object.entries(scenarios)) {
    const user = await prisma.user.create({
      data: { email: `${name}@drift.test`, displayName: `River ${name}`, passwordHash: "disabled" },
    });
    for (const [index, [title, siteName, minutes, priority]] of articles.slice(0, count).entries()) {
      await prisma.readingItem.create({
        data: {
          userId: user.id,
          title,
          siteName,
          sourceType: "url",
          sourceUrl: `https://example.com/${name}/${index}`,
          estimatedMinutes: minutes,
          priorityScore: priority,
          createdAt: new Date(Date.now() - (index + 1) * 86_400_000),
          ...(name === "snoozed" ? { snoozedUntil: new Date(Date.now() + (index + 2) * 86_400_000), snoozeLevel: 1 } : {}),
          // In the full collection: one piece opened yesterday and not yet
          // finished, and two that drifted past earlier in the week.
          ...(name === "full" && index === 3 ? { status: "reading" as const, lastOpenedAt: new Date(Date.now() - 86_400_000) } : {}),
          ...(name === "full" && (index === 6 || index === 9)
            ? { lastSurfacedAt: new Date(Date.now() - (index === 6 ? 1 : 3) * 86_400_000) } : {}),
        },
      });
    }
    tokens[name] = (await createSession(user.id)).token;
  }

  writeFileSync(output, JSON.stringify(tokens, null, 2));
  await prisma.$disconnect();
}

void main();
