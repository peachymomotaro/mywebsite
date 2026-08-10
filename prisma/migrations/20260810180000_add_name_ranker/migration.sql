CREATE TABLE "NameRankingSubmission" (
    "id" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "voterName" TEXT NOT NULL,
    "comparisons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameRankingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NameRankingSubmission_voterKey_key" ON "NameRankingSubmission"("voterKey");
