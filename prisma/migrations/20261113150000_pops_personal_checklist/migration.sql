-- Add a human-owned checklist mode without changing existing agent-mode tasks.
CREATE TYPE "PopsTaskMode" AS ENUM ('agent', 'checklist');

ALTER TABLE "PopsTask"
  ADD COLUMN "taskMode" "PopsTaskMode" NOT NULL DEFAULT 'agent',
  ADD COLUMN "checklist" JSONB NOT NULL DEFAULT '[]'::jsonb;
