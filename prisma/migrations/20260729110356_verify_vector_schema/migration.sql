-- Prisma cannot represent pgvector operator-class indexes in schema.prisma.
-- Remove them from Prisma-managed development databases so `migrate dev` does
-- not report permanent drift. Production recreates them after `migrate deploy`
-- via scripts/enable-pgvector.ts.
DROP INDEX IF EXISTS "events_embedding_idx";
DROP INDEX IF EXISTS "org_document_embedding_idx";
DROP INDEX IF EXISTS "org_embedding_idx";
