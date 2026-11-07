import { getPrismaClient } from "@/lib/reading-river/db";

/** POps shares the site's existing Postgres database and Prisma client. */
export function getPopsDb() {
  return getPrismaClient();
}

export type PopsDb = ReturnType<typeof getPopsDb>;
