#!/bin/sh
set -e

echo "🚀 Starting Jukugi Bokujo Backend..."

# Wait a bit for the database to be ready
sleep 1

echo "📦 Running D1 migrations..."
cd /app/apps/backend

# Run all migration files in order (ignore errors if tables already exist)
for f in ./migrations/*.sql; do
  echo "  Running $f ..."
  pnpm wrangler d1 execute jukugi-bokujo-db --local --file="$f" || true
done

echo "✅ Migrations completed!"
echo "🔥 Starting Wrangler dev server..."

# Start wrangler dev
exec pnpm dev
