#!/bin/sh
set -e

echo "🚀 Starting Jukugi Bokujo Backend..."

# Wait a bit for the database to be ready
sleep 1

echo "📦 Running D1 migrations..."
cd /app/apps/backend

# Run migrations (ignore errors if tables already exist)
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql 2>&1 | grep -v "already exists" || true
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0002_refactor_inputs.sql 2>&1 | grep -v "already exists" || true
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0003_add_session_mode.sql 2>&1 | grep -v "already exists" || true
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0004_context_compression.sql 2>&1 | grep -v "already exists" || true
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0005_agent_status.sql 2>&1 | grep -v "already exists" || true

echo "✅ Migrations completed!"
echo "🔥 Starting Wrangler dev server..."

# Start wrangler dev
exec pnpm dev
