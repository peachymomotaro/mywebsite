-- CreateEnum
CREATE TYPE "PopsWorkspace" AS ENUM ('learn', 'writing', 'experiments', 'work');

-- CreateEnum
CREATE TYPE "PopsTaskStatus" AS ENUM ('active', 'paused', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "PopsActor" AS ENUM ('human', 'agent', 'system');

-- CreateEnum
CREATE TYPE "PopsHistoryKind" AS ENUM ('created', 'edited', 'status_changed', 'note', 'evidence', 'agent_run', 'decision_opened', 'decision_answered', 'feedback', 'subtask_added', 'link_added', 'resurfacing');

-- CreateEnum
CREATE TYPE "PopsRunOutcome" AS ENUM ('completed', 'partial', 'blocked', 'failed');

-- CreateEnum
CREATE TYPE "PopsSubmissionChannel" AS ENUM ('api', 'mcp', 'import');

-- CreateEnum
CREATE TYPE "PopsDecisionStatus" AS ENUM ('open', 'answered', 'withdrawn');

-- CreateEnum
CREATE TYPE "PopsProposalKind" AS ENUM ('playbook_observation', 'playbook_change', 'pipeline_change', 'new_pipeline');

-- CreateEnum
CREATE TYPE "PopsProposalStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "PopsSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PopsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsAgentCredential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PopsAgentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "workspace" "PopsWorkspace" NOT NULL,
    "projectTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PopsTaskStatus" NOT NULL DEFAULT 'active',
    "parentId" TEXT,
    "recommendedPipelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestedNextAction" TEXT NOT NULL DEFAULT '',
    "lastHumanEngagementAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resurfaceAfter" TIMESTAMP(3),
    "createdBy" "PopsActor" NOT NULL DEFAULT 'human',
    "creationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PopsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsTaskLink" (
    "id" TEXT NOT NULL,
    "fromTaskId" TEXT NOT NULL,
    "toTaskId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsHistoryEntry" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "kind" "PopsHistoryKind" NOT NULL,
    "actor" "PopsActor" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "runId" TEXT,
    "decisionId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsAgentRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "pipelineSlug" TEXT,
    "pipelineVersion" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "channel" "PopsSubmissionChannel" NOT NULL,
    "credentialId" TEXT,
    "agentName" TEXT NOT NULL DEFAULT '',
    "outcome" "PopsRunOutcome" NOT NULL,
    "attempted" TEXT NOT NULL,
    "accomplished" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "artefacts" JSONB NOT NULL DEFAULT '[]',
    "uncertainties" TEXT NOT NULL DEFAULT '',
    "blockers" TEXT NOT NULL DEFAULT '',
    "nextActions" JSONB NOT NULL DEFAULT '[]',
    "pipelineReview" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsAgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsRunFeedback" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "useful" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "comments" TEXT NOT NULL DEFAULT '',
    "relayed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopsRunFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsDecision" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "runId" TEXT,
    "question" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "options" JSONB NOT NULL DEFAULT '[]',
    "explanation" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "status" "PopsDecisionStatus" NOT NULL DEFAULT 'open',
    "chosenOption" TEXT NOT NULL DEFAULT '',
    "response" TEXT NOT NULL DEFAULT '',
    "raisedBy" "PopsActor" NOT NULL DEFAULT 'agent',
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "PopsDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsPipeline" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspace" "PopsWorkspace",
    "summary" TEXT NOT NULL DEFAULT '',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopsPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsPipelineVersion" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "expectedEvidence" TEXT NOT NULL DEFAULT '',
    "changeNote" TEXT NOT NULL DEFAULT '',
    "author" "PopsActor" NOT NULL DEFAULT 'human',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsPipelineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsPlaybookVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeNote" TEXT NOT NULL DEFAULT '',
    "author" "PopsActor" NOT NULL DEFAULT 'human',
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsPlaybookVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsProposal" (
    "id" TEXT NOT NULL,
    "kind" "PopsProposalKind" NOT NULL,
    "status" "PopsProposalStatus" NOT NULL DEFAULT 'pending',
    "pipelineId" TEXT,
    "taskId" TEXT,
    "runId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PopsProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PopsSession_tokenHash_key" ON "PopsSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PopsSession_expiresAt_idx" ON "PopsSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PopsAgentCredential_tokenHash_key" ON "PopsAgentCredential"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PopsTask_creationKey_key" ON "PopsTask"("creationKey");

-- CreateIndex
CREATE INDEX "PopsTask_workspace_status_idx" ON "PopsTask"("workspace", "status");

-- CreateIndex
CREATE INDEX "PopsTask_status_lastHumanEngagementAt_idx" ON "PopsTask"("status", "lastHumanEngagementAt");

-- CreateIndex
CREATE INDEX "PopsTask_parentId_idx" ON "PopsTask"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PopsTaskLink_fromTaskId_toTaskId_key" ON "PopsTaskLink"("fromTaskId", "toTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "PopsHistoryEntry_dedupeKey_key" ON "PopsHistoryEntry"("dedupeKey");

-- CreateIndex
CREATE INDEX "PopsHistoryEntry_taskId_createdAt_idx" ON "PopsHistoryEntry"("taskId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PopsAgentRun_idempotencyKey_key" ON "PopsAgentRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PopsAgentRun_taskId_createdAt_idx" ON "PopsAgentRun"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "PopsAgentRun_pipelineSlug_idx" ON "PopsAgentRun"("pipelineSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PopsRunFeedback_runId_key" ON "PopsRunFeedback"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "PopsDecision_dedupeKey_key" ON "PopsDecision"("dedupeKey");

-- CreateIndex
CREATE INDEX "PopsDecision_taskId_status_idx" ON "PopsDecision"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PopsPipeline_slug_key" ON "PopsPipeline"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PopsPipelineVersion_pipelineId_version_key" ON "PopsPipelineVersion"("pipelineId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PopsPlaybookVersion_version_key" ON "PopsPlaybookVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "PopsProposal_dedupeKey_key" ON "PopsProposal"("dedupeKey");

-- CreateIndex
CREATE INDEX "PopsProposal_status_kind_idx" ON "PopsProposal"("status", "kind");

-- AddForeignKey
ALTER TABLE "PopsTask" ADD CONSTRAINT "PopsTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PopsTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsTaskLink" ADD CONSTRAINT "PopsTaskLink_fromTaskId_fkey" FOREIGN KEY ("fromTaskId") REFERENCES "PopsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsTaskLink" ADD CONSTRAINT "PopsTaskLink_toTaskId_fkey" FOREIGN KEY ("toTaskId") REFERENCES "PopsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsHistoryEntry" ADD CONSTRAINT "PopsHistoryEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PopsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsAgentRun" ADD CONSTRAINT "PopsAgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PopsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsRunFeedback" ADD CONSTRAINT "PopsRunFeedback_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PopsAgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsDecision" ADD CONSTRAINT "PopsDecision_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PopsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsDecision" ADD CONSTRAINT "PopsDecision_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PopsAgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsPipelineVersion" ADD CONSTRAINT "PopsPipelineVersion_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PopsPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsProposal" ADD CONSTRAINT "PopsProposal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PopsPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsProposal" ADD CONSTRAINT "PopsProposal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PopsTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Append-only guarantees: history entries, agent-run records and version rows
-- are never rewritten or deleted by the application. Corrections are new rows.
CREATE OR REPLACE FUNCTION pops_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'POps % rows are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PopsHistoryEntry_append_only" BEFORE UPDATE OR DELETE ON "PopsHistoryEntry"
  FOR EACH ROW EXECUTE FUNCTION pops_reject_mutation();
CREATE TRIGGER "PopsAgentRun_append_only" BEFORE UPDATE OR DELETE ON "PopsAgentRun"
  FOR EACH ROW EXECUTE FUNCTION pops_reject_mutation();
CREATE TRIGGER "PopsPipelineVersion_append_only" BEFORE UPDATE OR DELETE ON "PopsPipelineVersion"
  FOR EACH ROW EXECUTE FUNCTION pops_reject_mutation();
CREATE TRIGGER "PopsPlaybookVersion_append_only" BEFORE UPDATE OR DELETE ON "PopsPlaybookVersion"
  FOR EACH ROW EXECUTE FUNCTION pops_reject_mutation();
