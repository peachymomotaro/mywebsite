-- Preserve old proposals and their audit history. No production rows are rewritten.
ALTER TYPE "PopsProposalStatus" ADD VALUE IF NOT EXISTS 'superseded';
ALTER TABLE "PopsProposal"
  ADD COLUMN "supersededById" TEXT,
  ADD COLUMN "baseVersion" INTEGER;
CREATE INDEX "PopsProposal_supersededById_idx" ON "PopsProposal"("supersededById");
