/**
 * scripts/enable-pgvector.ts
 *
 * One-time setup script to:
 * 1. Enable the pgvector extension on PostgreSQL (Render supports it natively)
 * 2. Add `embedding vector(384)` columns to Events and Organization tables
 * 3. Create IVFFlat indexes for fast approximate nearest-neighbour search
 *
 * Run once:  npx ts-node scripts/enable-pgvector.ts
 *
 * Model: all-MiniLM-L6-v2  →  384 dimensions
 */

import { prisma } from "../lib/db";

async function main() {
    console.log("🔧 Enabling pgvector extension...");

    // 1. Enable extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("  ✅ vector extension enabled");

    // 2. Add embedding columns (idempotent — IF NOT EXISTS)
    await prisma.$executeRawUnsafe(
        `ALTER TABLE "Events" ADD COLUMN IF NOT EXISTS embedding vector(384);`
    );
    console.log("  ✅ Events.embedding column added");

    await prisma.$executeRawUnsafe(
        `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS embedding vector(384);`
    );
    console.log("  ✅ Organization.embedding column added");

    // 3. IVFFlat indexes (cosine distance — best for normalised embeddings)
    //    lists = 100 is appropriate for up to ~1M rows; reduce to 10 for small datasets
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

    console.log("\n🎉 pgvector setup complete!");
    console.log("   Next step: run the AI service to generate embeddings.");
}

main()
    .catch((e) => {
        console.error("❌ pgvector setup failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
