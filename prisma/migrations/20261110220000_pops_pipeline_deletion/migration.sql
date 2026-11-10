-- A deleted pipeline is no longer available for new work; immutable versions and
-- agent-run history remain stored and independently queryable.
ALTER TABLE "PopsPipeline" ADD COLUMN "deletedAt" TIMESTAMP(3);
