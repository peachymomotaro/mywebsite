ALTER TABLE "ReadingItem"
  ADD COLUMN "priorityAssignedAt" TIMESTAMP(3),
  ADD COLUMN "lastSurfacedAt" TIMESTAMP(3),
  ADD COLUMN "driftMisses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "snoozeLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "snoozedUntil" TIMESTAMP(3),
  ADD COLUMN "restingUntil" TIMESTAMP(3);

-- Existing priorities start their fourteen days at release rather than
-- expiring at once.
UPDATE "ReadingItem" SET "priorityAssignedAt" = CURRENT_TIMESTAMP WHERE "priorityScore" IS NOT NULL;

CREATE TABLE "DriftState" (
  "userId" TEXT NOT NULL,
  "draws" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriftState_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "DriftState" ADD CONSTRAINT "DriftState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
