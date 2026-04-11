ALTER TABLE "AppSettings"
ADD COLUMN "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastDailyDigestSentAt" TIMESTAMP(3);
