import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";

export async function getKnownTagNames() {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const tags = await prisma.tag.findMany({
    where: {
      userId: currentUser.id,
    },
    select: {
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return tags
    .map(({ name }) => name)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}
