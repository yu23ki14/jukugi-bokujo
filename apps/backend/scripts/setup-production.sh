#!/bin/bash
# Production setup script for Jukugi Bokujo Backend

set -e

echo "=== Jukugi Bokujo Backend - Production Setup ==="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler is not installed. Please run: pnpm install"
    exit 1
fi

echo "✅ Wrangler found"
echo ""

# Step 1: Login to Cloudflare
echo "📝 Step 1: Login to Cloudflare"
echo "Run: wrangler login"
echo "Press Enter to continue..."
read

# Step 2: Create production D1 database
echo ""
echo "📝 Step 2: Create production D1 database"
echo "Run the following command and copy the database_id:"
echo ""
echo "  wrangler d1 create jukugi-bokujo-db"
echo ""
echo "Then update wrangler.toml with the database_id"
echo "Press Enter to continue..."
read

# Step 3: Set secrets
echo ""
echo "📝 Step 3: Set production secrets"
echo ""
echo "Setting CLERK_SECRET_KEY..."
echo "Run: wrangler secret put CLERK_SECRET_KEY"
echo "Press Enter to continue..."
read

echo ""
echo "Setting ANTHROPIC_API_KEY..."
echo "Run: wrangler secret put ANTHROPIC_API_KEY"
echo "Press Enter to continue..."
read

# Step 4: Run migrations
echo ""
echo "📝 Step 4: Run production migrations"
echo ""
echo "Run: wrangler d1 execute jukugi-bokujo-db --remote --file=./migrations/0001_initial.sql"
echo "Press Enter to continue..."
read

# Step 5: Deploy
echo ""
echo "📝 Step 5: Deploy to Cloudflare Workers"
echo ""
echo "Run: pnpm deploy"
echo "Press Enter to continue..."
read

echo ""
echo "✅ Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Test your API: https://jukugi-bokujo-backend.<your-subdomain>.workers.dev/health"
echo "2. Update frontend VITE_API_URL to point to your Workers URL"
echo "3. Monitor logs: wrangler tail"
echo ""
