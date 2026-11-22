-- Soft-delete tasks to preserve append-only agent runs and history.
ALTER TABLE "PopsTask" ADD COLUMN "deletedAt" TIMESTAMP(3);
