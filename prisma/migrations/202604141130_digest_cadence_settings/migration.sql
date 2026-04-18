CREATE TYPE "DigestCadence" AS ENUM ('off', 'daily', 'weekly', 'monthly', 'seasonal');

ALTER TABLE "AppSettings"
ADD COLUMN "digestCadence" "DigestCadence" NOT NULL DEFAULT 'off',
ADD COLUMN "lastDigestSentAt" TIMESTAMP(3);

UPDATE "AppSettings"
SET
  "digestCadence" = CASE
    WHEN "dailyDigestEnabled" THEN 'daily'::"DigestCadence"
    ELSE 'off'::"DigestCadence"
  END,
  "lastDigestSentAt" = "lastDailyDigestSentAt";

ALTER TABLE "AppSettings"
DROP COLUMN "dailyDigestEnabled",
DROP COLUMN "lastDailyDigestSentAt";
