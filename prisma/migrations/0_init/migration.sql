-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('url', 'pdf', 'epub', 'text', 'manual', 'book_chapter');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('unread', 'reading', 'done', 'not_now', 'archived');

-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('manual', 'suggested');

-- CreateEnum
CREATE TYPE "LengthEstimationMethod" AS ENUM ('schema_wordCount', 'schema_timeRequired', 'schema_articleBody', 'readability', 'trafilatura', 'manual', 'unknown');

-- CreateEnum
CREATE TYPE "LengthEstimationConfidence" AS ENUM ('high', 'medium', 'low', 'unknown');

-- CreateTable
CREATE TABLE "ReadingItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "author" TEXT,
    "siteName" TEXT,
    "notes" TEXT,
    "extractedText" TEXT,
    "wordCount" INTEGER,
    "estimatedMinutes" INTEGER,
    "lengthEstimationMethod" "LengthEstimationMethod",
    "lengthEstimationConfidence" "LengthEstimationConfidence",
    "priorityScore" INTEGER NOT NULL DEFAULT 5,
    "status" "ReadingStatus" NOT NULL DEFAULT 'unread',
    "manualRank" INTEGER,
    "suggestedRank" INTEGER,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "bookId" TEXT,
    "chapterIndex" INTEGER,
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadEvent" (
    "id" TEXT NOT NULL,
    "readingItemId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "coverUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingItemTag" (
    "readingItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingItemTag_pkey" PRIMARY KEY ("readingItemId","tagId")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'app-settings',
    "displayMode" "DisplayMode" NOT NULL DEFAULT 'suggested',
    "manualOrderActive" BOOLEAN NOT NULL DEFAULT false,
    "highPriorityThreshold" INTEGER NOT NULL DEFAULT 7,
    "shortReadThresholdMinutes" INTEGER NOT NULL DEFAULT 25,
    "defaultReadingSpeedWpm" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingItem_bookId_idx" ON "ReadingItem"("bookId");

-- CreateIndex
CREATE INDEX "ReadingItem_status_idx" ON "ReadingItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReadEvent_readingItemId_key" ON "ReadEvent"("readingItemId");

-- CreateIndex
CREATE INDEX "ReadEvent_readAt_idx" ON "ReadEvent"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ReadingItemTag_tagId_idx" ON "ReadingItemTag"("tagId");

-- AddForeignKey
ALTER TABLE "ReadingItem" ADD CONSTRAINT "ReadingItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadEvent" ADD CONSTRAINT "ReadEvent_readingItemId_fkey" FOREIGN KEY ("readingItemId") REFERENCES "ReadingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingItemTag" ADD CONSTRAINT "ReadingItemTag_readingItemId_fkey" FOREIGN KEY ("readingItemId") REFERENCES "ReadingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingItemTag" ADD CONSTRAINT "ReadingItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
