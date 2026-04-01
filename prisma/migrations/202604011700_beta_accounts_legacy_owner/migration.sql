DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('active', 'deactivated');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "passwordHash" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'active',
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Invite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT NOT NULL,
  "redeemedByUserId" TEXT,

  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invite_tokenHash_key" ON "Invite"("tokenHash");
CREATE INDEX IF NOT EXISTS "Invite_email_idx" ON "Invite"("email");
CREATE INDEX IF NOT EXISTS "Invite_expiresAt_idx" ON "Invite"("expiresAt");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),

  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

INSERT INTO "User" (
  "id",
  "email",
  "displayName",
  "passwordHash",
  "status",
  "isAdmin"
)
VALUES (
  'legacy-single-tenant-owner',
  'legacy-owner@reading-river.local',
  'Legacy Reading River Owner',
  'bootstrap-required',
  'deactivated',
  false
)
ON CONFLICT DO NOTHING;

ALTER TABLE "ReadingItem" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "ReadingItem"
SET "userId" = 'legacy-single-tenant-owner'
WHERE "userId" IS NULL;
ALTER TABLE "ReadingItem" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "Book"
SET "userId" = 'legacy-single-tenant-owner'
WHERE "userId" IS NULL;
ALTER TABLE "Book" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "Tag"
SET "userId" = 'legacy-single-tenant-owner'
WHERE "userId" IS NULL;
ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "ReadEvent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "ReadEvent" AS "readEvent"
SET "userId" = "readingItem"."userId"
FROM "ReadingItem" AS "readingItem"
WHERE "readEvent"."userId" IS NULL
  AND "readingItem"."id" = "readEvent"."readingItemId";
UPDATE "ReadEvent"
SET "userId" = 'legacy-single-tenant-owner'
WHERE "userId" IS NULL;
ALTER TABLE "ReadEvent" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "AppSettings"
SET "userId" = 'legacy-single-tenant-owner'
WHERE "userId" IS NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ReadingItem_userId_idx" ON "ReadingItem"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadingItem_userId_id_key" ON "ReadingItem"("userId", "id");

CREATE INDEX IF NOT EXISTS "Book_userId_idx" ON "Book"("userId");

DROP INDEX IF EXISTS "Tag_name_key";
CREATE INDEX IF NOT EXISTS "Tag_userId_idx" ON "Tag"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_userId_name_key" ON "Tag"("userId", "name");

CREATE INDEX IF NOT EXISTS "ReadEvent_userId_idx" ON "ReadEvent"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReadEvent_userId_readingItemId_key" ON "ReadEvent"(
  "userId",
  "readingItemId"
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_userId_key" ON "AppSettings"("userId");

ALTER TABLE "ReadingItem" DROP CONSTRAINT IF EXISTS "ReadingItem_userId_fkey";
ALTER TABLE "ReadingItem"
ADD CONSTRAINT "ReadingItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS "Book_userId_fkey";
ALTER TABLE "Book"
ADD CONSTRAINT "Book_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_userId_fkey";
ALTER TABLE "Tag"
ADD CONSTRAINT "Tag_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadEvent" DROP CONSTRAINT IF EXISTS "ReadEvent_readingItemId_fkey";
ALTER TABLE "ReadEvent" DROP CONSTRAINT IF EXISTS "ReadEvent_userId_fkey";
ALTER TABLE "ReadEvent" DROP CONSTRAINT IF EXISTS "ReadEvent_userId_readingItemId_fkey";
ALTER TABLE "ReadEvent"
ADD CONSTRAINT "ReadEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadEvent"
ADD CONSTRAINT "ReadEvent_userId_readingItemId_fkey"
FOREIGN KEY ("userId", "readingItemId")
REFERENCES "ReadingItem"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppSettings" DROP CONSTRAINT IF EXISTS "AppSettings_userId_fkey";
ALTER TABLE "AppSettings"
ADD CONSTRAINT "AppSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_createdByUserId_fkey";
ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_redeemedByUserId_fkey";
ALTER TABLE "Invite"
ADD CONSTRAINT "Invite_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite"
ADD CONSTRAINT "Invite_redeemedByUserId_fkey"
FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
