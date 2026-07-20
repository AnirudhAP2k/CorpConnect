#!/bin/sh
set -e

echo "⏳ Waiting for database..."

if [ "$NODE_ENV" = "production" ]; then
  until npx prisma migrate deploy; do
    echo "⏳ Waiting for DB..."
    sleep 2
  done
else
  until npx prisma db push --accept-data-loss; do
    echo "⏳ Waiting for DB..."
    sleep 2
  done
fi

echo "✅ Database ready"

exec "$@"
