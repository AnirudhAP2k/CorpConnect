/**
 * scripts/enable-pgvector.ts
 *
 * Makes sure the pgvector extension, the `embedding vector(384)` columns, and their
 * IVFFlat indexes exist. Runs on every container start, in every environment.
 *
 * This script used to unconditionally `DROP COLUMN embedding` before re-adding it,
 * which silently destroyed every stored embedding on each `docker compose up` and
 * forced a full re-embed of all events, organizations, and documents. It is now
 * additive: a column that already has the right type is left completely alone.
 *
 * Usage:
 *   npx tsx scripts/enable-pgvector.ts                  # extension + columns + indexes
 *   npx tsx scripts/enable-pgvector.ts --extension-only # just the extension
 *   npx tsx scripts/enable-pgvector.ts --skip-indexes   # extension + columns
 *
 * `--extension-only` runs *before* `prisma db push` / `migrate deploy`, because the
 * schema declares these columns as Unsupported("vector(384)") and Postgres cannot
 * create a column of that type until the extension is installed.
 *
 * Model: all-MiniLM-L6-v2  →  384 dimensions
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VECTOR_DIMENSIONS = 384;
const EXPECTED_TYPE = `vector(${VECTOR_DIMENSIONS})`;

const TARGETS = [
    { table: "Events", index: "events_embedding_idx" },
    { table: "Organization", index: "org_embedding_idx" },
    { table: "OrgDocument", index: "org_document_embedding_idx" },
] as const;

async function ensureExtension() {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("  vector extension present");
}

/** Returns the column's Postgres type (e.g. "vector(384)"), or null if absent. */
async function getColumnType(table: string): Promise<string | null> {
    const rows = await prisma.$queryRaw<{ type: string }[]>`
        SELECT format_type(a.atttypid, a.atttypmod) AS type
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = ${table}
          AND n.nspname = current_schema()
          AND a.attname = 'embedding'
          AND a.attnum > 0
          AND NOT a.attisdropped
    `;

    return rows[0]?.type ?? null;
}

async function countEmbeddings(table: string): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE embedding IS NOT NULL`,
    );
    return Number(rows[0]?.count ?? 0);
}

async function ensureColumn(table: string, index: string) {
    const currentType = await getColumnType(table);

    if (currentType === null) {
        await prisma.$executeRawUnsafe(
            `ALTER TABLE "${table}" ADD COLUMN embedding ${EXPECTED_TYPE};`,
        );
        console.log(`  ${table}.embedding created as ${EXPECTED_TYPE}`);
        return;
    }

    if (currentType === EXPECTED_TYPE) {
        const stored = await countEmbeddings(table);
        console.log(
            `  ${table}.embedding already ${EXPECTED_TYPE} — left as is (${stored} embedding(s) preserved)`,
        );
        return;
    }

    // Wrong type: this is the only branch that can lose data, so make it loud.
    console.warn(
        `  ${table}.embedding has type "${currentType}", expected "${EXPECTED_TYPE}". ` +
        `Recreating the column — existing values in it cannot be preserved.`,
    );
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${index};`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN embedding;`);
    await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN embedding ${EXPECTED_TYPE};`,
    );
    console.log(`  ${table}.embedding recreated as ${EXPECTED_TYPE}`);
}

async function ensureIndex(table: string, index: string) {
    // IVFFlat with cosine distance — embeddings from the model are normalised.
    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ${index}
        ON "${table}"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    `);
    console.log(`  ${index} present`);
}

async function main() {
    const extensionOnly = process.argv.includes("--extension-only");
    const skipIndexes = process.argv.includes("--skip-indexes");

    console.log("pgvector: ensuring extension...");
    await ensureExtension();

    if (extensionOnly) {
        console.log("pgvector: extension-only mode, skipping columns and indexes.");
        return;
    }

    console.log("pgvector: ensuring embedding columns...");
    for (const { table, index } of TARGETS) {
        await ensureColumn(table, index);
    }

    if (skipIndexes) {
        console.log(
            "pgvector: skip-indexes mode; Prisma development schema remains drift-free.",
        );
        return;
    }

    console.log("pgvector: ensuring IVFFlat indexes...");
    for (const { table, index } of TARGETS) {
        await ensureIndex(table, index);
    }

    console.log("pgvector: ready.");
}

main()
    .catch((e) => {
        console.error("pgvector setup failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
