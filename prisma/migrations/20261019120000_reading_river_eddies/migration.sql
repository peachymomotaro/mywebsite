ALTER TABLE "ReadingItem"
  ADD COLUMN "eddySlot" INTEGER,
  ADD COLUMN "eddyAddedAt" TIMESTAMP(3),
  ADD CONSTRAINT "ReadingItem_eddySlot_range" CHECK ("eddySlot" BETWEEN 1 AND 10),
  ADD CONSTRAINT "ReadingItem_eddy_membership_pair" CHECK (
    ("eddySlot" IS NULL) = ("eddyAddedAt" IS NULL)
  ),
  ADD CONSTRAINT "ReadingItem_eddy_eligible" CHECK (
    "eddySlot" IS NULL OR (
      "status" IN ('unread', 'reading') AND "sourceType" NOT IN ('manual', 'book_chapter')
    )
  );

CREATE UNIQUE INDEX "ReadingItem_userId_eddySlot_key" ON "ReadingItem"("userId", "eddySlot");
