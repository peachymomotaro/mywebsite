-- AlterTable
ALTER TABLE "AppSettings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Invite" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
