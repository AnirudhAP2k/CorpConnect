#!/bin/sh
set -e

echo "⏳ Waiting for database..."

# The vector extension must exist before Prisma syncs the schema, because the
# embedding columns are declared as Unsupported("vector(384)") and Postgres cannot
# create that type until the extension is installed. This also doubles as the
# wait-for-database loop.
until npx tsx scripts/enable-pgvector.ts --extension-only; do
  echo "⏳ Waiting for DB..."
  sleep 2
done

npx prisma migrate deploy

# Additive: leaves correctly typed columns (and their data) untouched. Prisma
# cannot represent IVFFlat indexes in schema.prisma, so creating them in a
# development database causes permanent `migrate dev` drift. Production gets the
# indexes after migrations; development keeps the vector columns without them.
if [ "$NODE_ENV" = "production" ]; then
  echo "🔧 Ensuring pgvector embedding columns & indexes..."
  npx tsx scripts/enable-pgvector.ts
else
  echo "🔧 Ensuring pgvector embedding columns..."
  npx tsx scripts/enable-pgvector.ts --skip-indexes
fi

# Reference data the app cannot start empty: organization onboarding needs an
# industry and event creation needs a category. Idempotent.
echo "🌱 Seeding reference data..."
npx prisma db seed

echo "✅ Database ready"

exec "$@"
