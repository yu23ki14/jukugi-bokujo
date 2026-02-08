# Backend - Hono + Cloudflare Workers

## Setup

1. Install dependencies from the root:
   ```bash
   cd ../.. && pnpm install
   ```

2. Login to Cloudflare:
   ```bash
   pnpm wrangler login
   ```

3. Create D1 database:
   ```bash
   pnpm wrangler d1 create jukugi-bokujo-db
   ```
   Copy the `database_id` from the output and update `wrangler.toml`

4. Run migrations:
   ```bash
   pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql
   ```

5. Copy environment variables:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

## Development

### Local Development

```bash
pnpm dev
```

### Docker Development

From the root directory:

```bash
# Start all services
docker-compose up

# Or start only backend
docker-compose up backend
```

The API will be available at http://localhost:8787

## Deployment

Deploy to Cloudflare Workers:

```bash
# Create production database
pnpm wrangler d1 create jukugi-bokujo-db-production

# Update wrangler.toml with production database_id

# Run production migrations
pnpm wrangler d1 execute jukugi-bokujo-db-production --remote --file=./migrations/0001_initial.sql

# Deploy
pnpm deploy
```

## Testing Cron Triggers

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## Docker Build (Development Only)

```bash
docker build -f Dockerfile -t jukugi-bokujo-backend:dev --target development ../..
```

Note: Production deployment is done via `wrangler deploy` to Cloudflare Workers.

## Tech Stack

- **Framework**: Hono 4
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **CLI**: Wrangler 3
- **Language**: TypeScript 5.7

