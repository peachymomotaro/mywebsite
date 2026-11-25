-- Quiz marking: new POps tables only. Nothing existing is altered.
CREATE TYPE "PopsQuizMark" AS ENUM ('knew', 'guessed', 'tip_of_tongue', 'no_idea', 'skipped');

CREATE TABLE "PopsQuizPaper" (
    "id" TEXT NOT NULL,
    "circuit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "setBy" TEXT NOT NULL DEFAULT '',
    "editedBy" TEXT NOT NULL DEFAULT '',
    "playedOn" DATE,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "PopsQuizPaper_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PopsQuizQuestion" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "mark" "PopsQuizMark",
    "markedAt" TIMESTAMP(3),
    CONSTRAINT "PopsQuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PopsQuizPaper_archivedAt_playedOn_idx" ON "PopsQuizPaper"("archivedAt", "playedOn");
CREATE UNIQUE INDEX "PopsQuizQuestion_paperId_position_key" ON "PopsQuizQuestion"("paperId", "position");
CREATE INDEX "PopsQuizQuestion_markedAt_idx" ON "PopsQuizQuestion"("markedAt");

ALTER TABLE "PopsQuizQuestion" ADD CONSTRAINT "PopsQuizQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PopsQuizPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
