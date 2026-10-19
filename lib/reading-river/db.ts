import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseConnectionString } from "@/lib/reading-river/database-connection";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before creating PrismaClient.");
  }

  const adapter = new PrismaPg({
    connectionString: resolveDatabaseConnectionString(connectionString),
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Reuse the same pool across requests handled by a warm server instance.
  // Creating a new client on every production request also creates a new pool.
  return (globalForPrisma.prisma ??= createPrismaClient());
}
