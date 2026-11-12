-- Extend POps task and pipeline workspace choices without changing existing assignments.
-- PostgreSQL enum additions preserve existing rows and references.
ALTER TYPE "PopsWorkspace" ADD VALUE IF NOT EXISTS 'personal';
