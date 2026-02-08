# Frontend Dockerfile for React Router v7 with pnpm workspace

# Development stage
FROM node:24-slim AS development

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Copy entire monorepo to establish workspace structure
COPY . .

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]

# Builder stage
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Copy entire monorepo
COPY . .

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/apps/frontend

# Build the application
RUN pnpm build

# Production stage
FROM node:24-slim AS production

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package files
COPY --from=builder /app/apps/frontend/package.json ./

# Copy built application
COPY --from=builder /app/apps/frontend/build ./build

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "start"]
