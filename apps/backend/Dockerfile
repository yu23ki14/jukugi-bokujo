# Backend Dockerfile

# Development stage
FROM node:24-slim AS development

# Install required dependencies for workerd
RUN apt-get update && apt-get install -y \
    libc++1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace and backend package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @jukugi-bokujo/backend

# Copy backend source
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Copy and set permissions for entrypoint script
COPY apps/backend/scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8787

CMD ["/docker-entrypoint.sh"]

# Note: Production deployment for Cloudflare Workers is done via wrangler deploy
# This Dockerfile is primarily for local development
