# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jukugi Bokujo (熟議牧場 / Deliberation Ranch)** - A civic tech prototype where users own AI deliberation agents that automatically engage in discussions. This is a放置型思考ゲーム (idle thinking game) where users observe and guide AI agents rather than directly participating in discussions themselves.

### Core Concept
- Users don't debate directly
- AI agents deliberate autonomously
- Users provide direction and knowledge
- Agents gradually adopt user perspectives
- Observation and cultivation are primary interactions

## Architecture

### Monorepo Structure
This is a **pnpm workspace monorepo** with two main applications:

```
apps/
├── backend/    - Cloudflare Workers + Hono API
└── frontend/   - React Router v7 SPA with Clerk auth
```

### Backend (Cloudflare Workers + Hono)
- **Runtime**: Cloudflare Workers (edge computing)
- **Framework**: Hono 4 - lightweight web framework
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Deployment**: Via `wrangler` CLI (NOT Docker for production)
- **Cron Jobs**: Configured in `wrangler.toml` for scheduled tasks
- **Entry Point**: `apps/backend/src/index.ts`

Key backend characteristics:
- No traditional Node.js server - runs on Cloudflare's edge runtime
- D1 database bindings are configured in `wrangler.toml`
- Environment variables in `.dev.vars` for local dev
- Cron triggers for automated deliberation sessions

### Frontend (React Router v7)
- **Framework**: React Router v7 with SPA mode (`ssr: false`)
- **Auth**: Clerk for user authentication
- **Styling**: TailwindCSS v4
- **Build Tool**: Vite
- **App Directory**: `app/` (NOT `src/`)
- **Routes**: Defined in `app/routes.ts` using React Router v7's file-based routing

Key frontend characteristics:
- SPA mode enabled in `react-router.config.ts`
- Clerk components wrapped in root layout
- Hot module replacement in development
- Docker for local development, various platforms for production

## Common Commands

### Development
```bash
# Install dependencies (from root)
pnpm install

# Docker Compose (alternative)
docker-compose up              # Both services
docker-compose up backend      # Backend only
docker-compose up frontend     # Frontend only

# Formatting, run everytime before commit
pnpm biome:format
pnpm biome:check
```

### Backend-Specific Commands
```bash
cd apps/backend

# Development
pnpm dev                       # Start Wrangler dev server

# Database operations (D1)
pnpm wrangler d1 create jukugi-bokujo-db                    # Create database
pnpm wrangler d1 execute jukugi-bokujo-db --local \
  --file=./migrations/0001_initial.sql                      # Run migrations locally
pnpm wrangler d1 execute jukugi-bokujo-db --remote \
  --file=./migrations/0001_initial.sql                      # Run migrations on production

# Type generation
pnpm cf-typegen                # Generate Cloudflare Worker types

# Deployment (production)
pnpm deploy                    # Deploy to Cloudflare Workers

# Test cron triggers locally
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

### Frontend-Specific Commands
```bash
cd apps/frontend

# Development
pnpm dev                       # Start Vite dev server

# Build
pnpm build                     # Production build

# Type checking
pnpm typecheck                 # Run TypeScript type checking

# Start production build locally
pnpm start
```

## Environment Variables

### Backend (.dev.vars)
```bash
CLERK_SECRET_KEY=sk_test_...   # Clerk secret for API authentication
ENVIRONMENT=development
```

### Frontend (.env)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # Clerk public key
VITE_API_URL=http://localhost:8787      # Backend API URL
```

## Key Technical Constraints

### Backend Deployment
- **NEVER** deploy backend using Docker to production
- Production deployment MUST use `wrangler deploy`
- Docker is only for local development convenience
- Cloudflare Workers has specific runtime limitations (no Node.js built-ins)

### Frontend Routing
- Uses React Router v7's new routing system
- Routes defined in `app/routes.ts` (NOT file-based by default)
- App code lives in `app/` directory (NOT `src/`)
- Currently in SPA mode (`ssr: false`)

### D1 Database
- SQLite-compatible syntax
- Bindings configured in `wrangler.toml`
- Use `--local` flag for local development
- Use `--remote` flag for production operations
- Database ID must be set in `wrangler.toml` after creation

## Code Style

- **Formatting**: Biome
- **Line Width**: 100 characters
- **TypeScript**: Strict mode enabled
- **Import Style**: ES modules (`type: "module"` in package.json)

## Testing Cron Jobs

The backend includes scheduled task support via Cloudflare Cron Triggers:
- Configuration: `wrangler.toml` `[triggers.crons]`
- Handler: `scheduled()` function in `src/index.ts`
- Local testing: `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`
