.PHONY: help install dev build clean docker-up docker-down docker-logs setup-backend setup-frontend

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install

dev: ## Start all apps in development mode
	pnpm dev

build: ## Build all apps
	pnpm build

clean: ## Clean all build artifacts
	pnpm clean
	rm -rf node_modules apps/*/node_modules

docker-up: ## Start Docker Compose services
	docker-compose up -d

docker-down: ## Stop Docker Compose services
	docker-compose down

docker-logs: ## View Docker Compose logs
	docker-compose logs -f

docker-rebuild: ## Rebuild and restart Docker containers
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

docker-build-frontend: ## Build frontend Docker image
	docker build -f apps/frontend/Dockerfile -t jukugi-bokujo-frontend --target production .

docker-build-backend: ## Build backend Docker image (for local dev only)
	docker build -f apps/backend/Dockerfile -t jukugi-bokujo-backend --target development .

setup-backend: ## Setup backend (create .dev.vars from example)
	cp apps/backend/.dev.vars.example apps/backend/.dev.vars
	@echo "Please edit apps/backend/.dev.vars and add your Clerk Secret Key"
	@echo "Then run: cd apps/backend && pnpm wrangler d1 create jukugi-bokujo-db"

setup-frontend: ## Setup frontend (create .env from example)
	cp apps/frontend/.env.example apps/frontend/.env
	@echo "Please edit apps/frontend/.env and add your Clerk Publishable Key"

setup: setup-backend setup-frontend ## Setup both backend and frontend

db-create-local: ## Create local D1 database
	cd apps/backend && pnpm wrangler d1 create jukugi-bokujo-db

db-migrate-local: ## Run migrations on local D1 database
	cd apps/backend && pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql

db-migrate-remote: ## Run migrations on remote D1 database
	cd apps/backend && pnpm wrangler d1 execute jukugi-bokujo-db --remote --file=./migrations/0001_initial.sql
