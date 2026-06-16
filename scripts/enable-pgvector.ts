/**
 * scripts/enable-pgvector.ts
 *
 * One-time setup script to:
 * 1. Enable the pgvector extension on PostgreSQL (Render supports it natively)
 * 2. Add `embedding vector(384)` columns to Events and Organization tables
 * 3. Create IVFFlat indexes for fast approximate nearest-neighbour search
 *
 * Run once:  npx tsx scripts/enable-pgvector.ts
 *
 * Model: all-MiniLM-L6-v2  →  384 dimensions
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔧 Enabling pgvector extension...");

    // 1. Enable extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("  ✅ vector extension enabled");

    // 2. Drop existing indexes to avoid dependency errors when altering/dropping columns
    console.log("  ⏳ Dropping old indexes if they exist...");
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS events_embedding_idx;`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS org_embedding_idx;`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS org_document_embedding_idx;`);

    // 3. Drop and recreate embedding columns as vector(384)
    console.log("  ⏳ Recreating embedding columns as vector(384)...");
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Events" DROP COLUMN IF EXISTS embedding;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Events" ADD COLUMN embedding vector(384);`);
    console.log("  ✅ Events.embedding column set to vector(384)");

    await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" DROP COLUMN IF EXISTS embedding;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN embedding vector(384);`);
    console.log("  ✅ Organization.embedding column set to vector(384)");

    await prisma.$executeRawUnsafe(`ALTER TABLE "OrgDocument" DROP COLUMN IF EXISTS embedding;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OrgDocument" ADD COLUMN embedding vector(384);`);
    console.log("  ✅ OrgDocument.embedding column set to vector(384)");

    // 4. IVFFlat indexes (cosine distance — best for normalised embeddings)
    console.log("  ⏳ Recreating IVFFlat indexes...");
    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS events_embedding_idx
        ON "Events"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
    console.log("  ✅ Events embedding IVFFlat index created");

    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS org_embedding_idx
        ON "Organization"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
    console.log("  ✅ Organization embedding IVFFlat index created");

    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS org_document_embedding_idx
        ON "OrgDocument"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
    console.log("  ✅ OrgDocument embedding IVFFlat index created");

    console.log("\n🎉 pgvector setup complete!");
    console.log("   Next step: start the AI service to generate embeddings.");
}

main()
    .catch((e) => {
        console.error("❌ pgvector setup failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
