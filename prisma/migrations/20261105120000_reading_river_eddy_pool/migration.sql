-- The eddies become a small pool of five. Each reader keeps their five most
-- recently added pieces; any others drift back into the river (they leave
-- the eddies; a piece being read becomes unread so it can come round again).

ALTER TABLE "ReadingItem" DROP CONSTRAINT "ReadingItem_eddySlot_range";

WITH ranked AS (
  SELECT "id", "userId",
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "eddyAddedAt" DESC, "id" DESC) AS "place"
  FROM "ReadingItem"
  WHERE "eddySlot" IS NOT NULL
)
UPDATE "ReadingItem" AS item
SET "eddySlot" = NULL,
    "eddyAddedAt" = NULL,
    "status" = CASE WHEN item."status" = 'reading' THEN 'unread'::"ReadingStatus" ELSE item."status" END
FROM ranked
WHERE item."id" = ranked."id" AND item."userId" = ranked."userId" AND ranked."place" > 5;

-- Renumber what remains to slots 1–5, via negative slots so the unique index holds.
WITH ranked AS (
  SELECT "id", "userId",
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "eddySlot", "id") AS "place"
  FROM "ReadingItem"
  WHERE "eddySlot" IS NOT NULL
)
UPDATE "ReadingItem" AS item
SET "eddySlot" = -ranked."place"
FROM ranked
WHERE item."id" = ranked."id" AND item."userId" = ranked."userId";

UPDATE "ReadingItem" SET "eddySlot" = -"eddySlot" WHERE "eddySlot" < 0;

ALTER TABLE "ReadingItem"
  ADD CONSTRAINT "ReadingItem_eddySlot_range" CHECK ("eddySlot" BETWEEN 1 AND 5);
