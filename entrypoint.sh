#!/bin/sh
set -e

echo "Waiting for database..."

until npx tsx scripts/enable-pgvector.ts --extension-only; do
  echo "Waiting for DB..."
  sleep 2
done

npx prisma migrate deploy

if [ "$NODE_ENV" = "production" ]; then
  echo "Ensuring pgvector embedding columns & indexes..."
  npx tsx scripts/enable-pgvector.ts
else
  echo "Ensuring pgvector embedding columns..."
  npx tsx scripts/enable-pgvector.ts --skip-indexes
fi

echo "Seeding reference data..."
npx prisma db seed

echo "Database ready"

exec "$@"
