# 技術スタック & ボイラープレートガイド

本ドキュメントは、pnpm workspace モノレポをベースとした Web アプリケーションのボイラープレート構築ガイドである。各ツールの最新公式ドキュメント (2025-2026) に基づく。

## 目次

- [1. プロジェクト基盤](#1-プロジェクト基盤)
  - [1-1. pnpm Workspace](#1-1-pnpm-workspace)
  - [1-2. Biome](#1-2-biome)
  - [1-3. TypeScript](#1-3-typescript)
- [2. バックエンド](#2-バックエンド)
  - [2-1. Hono + Cloudflare Workers](#2-1-hono--cloudflare-workers)
  - [2-2. Hono OpenAPI (@hono/zod-openapi)](#2-2-hono-openapi-honozod-openapi)
  - [2-3. Cloudflare D1 + Wrangler](#2-3-cloudflare-d1--wrangler)
  - [2-4. Drizzle ORM](#2-4-drizzle-orm)
- [3. フロントエンド](#3-フロントエンド)
  - [3-1. React Router v7 + Vite](#3-1-react-router-v7--vite)
  - [3-2. shadcn/ui + Tailwind CSS v4](#3-2-shadcnui--tailwind-css-v4)
  - [3-3. Orval (API クライアント自動生成)](#3-3-orval-api-クライアント自動生成)
  - [3-4. TanStack Query v5](#3-4-tanstack-query-v5)
- [4. ローカル開発環境 (Docker Compose)](#4-ローカル開発環境-docker-compose)
- [5. CI/CD (GitHub Actions)](#5-cicd-github-actions)
  - [5-1. CI ワークフロー](#5-1-ci-ワークフロー)
  - [5-2. デプロイワークフロー](#5-2-デプロイワークフロー)
  - [5-3. ベストプラクティス](#5-3-ベストプラクティス)

---

## 技術スタック一覧

| 領域 | ツール | バージョン目安 |
|------|--------|---------------|
| パッケージ管理 | pnpm (workspace) | v9+ |
| フォーマット / リント | Biome | v2+ |
| 型チェック | TypeScript | v5.7+ |
| バックエンド FW | Hono | v4.12+ |
| API スキーマ | @hono/zod-openapi + Zod | v1.x |
| ランタイム | Cloudflare Workers | Wrangler v4 |
| データベース | Cloudflare D1 (SQLite) | - |
| ORM | Drizzle ORM | latest |
| フロントエンド FW | React Router v7 (SPA mode) | v7.x |
| ビルド | Vite | v6+ |
| UI コンポーネント | shadcn/ui | latest |
| CSS | Tailwind CSS | v4 |
| API クライアント生成 | Orval | latest |
| データフェッチ | TanStack Query | v5 |
| CI/CD | GitHub Actions | - |

---

## ディレクトリ構成

```
my-monorepo/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts              # OpenAPIHono エントリーポイント
│   │   │   ├── db/
│   │   │   │   └── schema.ts         # Drizzle スキーマ
│   │   │   ├── schemas/              # Zod スキーマ (OpenAPI用)
│   │   │   ├── routes/               # Hono ルーター
│   │   │   └── middleware/           # Hono ミドルウェア
│   │   ├── migrations/               # Drizzle 生成 SQL
│   │   ├── wrangler.toml
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── frontend/
│       ├── app/
│       │   ├── root.tsx              # QueryClientProvider 等
│       │   ├── routes.ts             # React Router v7 ルート定義
│       │   ├── routes/               # ページコンポーネント
│       │   └── app.css               # Tailwind v4 エントリー
│       ├── src/
│       │   └── api/
│       │       ├── custom-fetch.ts   # Orval カスタム fetch
│       │       ├── gen/              # Orval 自動生成
│       │       └── models/           # 自動生成の型定義
│       ├── components/
│       │   └── ui/                   # shadcn コンポーネント
│       ├── orval.config.ts
│       ├── react-router.config.ts
│       ├── vite.config.ts
│       ├── components.json
│       └── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
├── package.json
```

---

## 1. プロジェクト基盤

### 1-1. pnpm Workspace

#### セットアップ

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
mkdir -p apps
```

#### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
```

#### ルート `package.json`

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter \"./apps/*\" dev",
    "build": "pnpm --filter \"./apps/*\" build",
    "typecheck": "pnpm --parallel --filter \"./apps/*\" typecheck",
    "biome:format": "biome format --write",
    "biome:check": "biome check --write"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

#### 主要コマンド

```bash
pnpm install                                    # 全パッケージにインストール
pnpm --filter @my-app/frontend add react        # 特定パッケージに依存追加
pnpm add -D typescript -w                       # ルートに devDependency 追加
pnpm --parallel --filter "./apps/*" dev         # 全 apps を並列起動
```

#### ベストプラクティス

- ワークスペース内パッケージの参照は `workspace:*` プロトコルを使う
- 共通の devDependency (TypeScript, Biome) はルートに置く

---

### 1-2. Biome

#### セットアップ

```bash
pnpm add -D @biomejs/biome -w
pnpm biome init    # biome.json を生成
```

#### `biome.json` (ルート)

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "lineWidth": 100
    }
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

#### サブパッケージでの上書き (Biome v2)

```json
// apps/backend/biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "extends": "//",
  "root": false,
  "linter": {
    "rules": {
      "suspicious": {
        "noConsole": "off"
      }
    }
  }
}
```

#### コマンド

```bash
biome format --write     # フォーマット (ローカル)
biome check --write      # フォーマット + リント (ローカル)
biome ci                 # CI用 (--write なし、失敗時に非ゼロ終了)
```

---

### 1-3. TypeScript

#### `tsconfig.base.json` (ルート共通設定)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  }
}
```

#### `apps/backend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

#### `apps/frontend/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "include": [
    "**/*",
    "**/.server/**/*",
    "**/.client/**/*",
    ".react-router/types/**/*"
  ],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node", "vite/client"],
    "jsx": "react-jsx",
    "rootDirs": [".", "./.react-router/types"],
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```

---

## 2. バックエンド

### 2-1. Hono + Cloudflare Workers

#### セットアップ (create-hono)

```bash
# モノレポルートから実行。対話なしで cloudflare-workers テンプレートを使用
pnpm create hono@latest apps/backend --template cloudflare-workers --pm pnpm --install
```

#### `wrangler.toml`

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-09-23"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

[vars]
ENVIRONMENT = "production"
```

- `node_compat = true` は廃止。`compatibility_flags = ["nodejs_compat"]` を使用
- `@cloudflare/workers-types` は不要。`wrangler types` で型を自動生成

#### `src/index.ts`

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", logger());
app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/", (c) => c.json({ message: "Hello Hono!" }));

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) => {
    // Cron 処理
  },
};
```

#### `package.json` スクリプト

```json
{
  "scripts": {
    "dev": "wrangler dev --ip 0.0.0.0",
    "deploy": "wrangler deploy",
    "cf-typegen": "wrangler types",
    "typecheck": "tsc --noEmit"
  }
}
```

---

### 2-2. Hono OpenAPI (@hono/zod-openapi)

#### インストール

```bash
pnpm add @hono/zod-openapi zod @hono/swagger-ui
```

#### アプリ初期化

```typescript
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

type Bindings = { DB: D1Database };

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// OpenAPI JSON エンドポイント
app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: { title: "My API", version: "1.0.0" },
  servers: [{ url: "http://localhost:8787", description: "Local" }],
});

// Swagger UI
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));
```

#### Zod スキーマ定義

**重要:** `z` は必ず `@hono/zod-openapi` からインポートする。

```typescript
import { z } from "@hono/zod-openapi";

export const UserSchema = z
  .object({
    id: z.string().uuid().openapi({ description: "User ID" }),
    name: z.string().openapi({ description: "User name" }),
  })
  .openapi("User");

export const CreateUserRequestSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .openapi("CreateUserRequest");
```

#### ルート定義

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List all users",
  responses: {
    200: {
      content: { "application/json": { schema: ListUsersResponseSchema } },
      description: "Success",
    },
  },
});

usersRouter.openapi(listUsersRoute, async (c) => {
  // c.req.valid("json") / c.req.valid("param") で型安全にリクエストデータ取得
  return c.json({ users: [] }, 200);
});
```

#### バリデーションエラーのカスタマイズ

```typescript
const app = new OpenAPIHono<{ Bindings: Bindings }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Error", details: result.error.flatten() }, 422);
    }
  },
});
```

---

### 2-3. Cloudflare D1 + Wrangler

#### D1 データベース作成

```bash
pnpm wrangler d1 create my-database
```

#### `wrangler.toml` への追加

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
migrations_dir = "migrations"
```

#### マイグレーション適用

```bash
# ローカル
pnpm wrangler d1 migrations apply my-database --local

# 本番
pnpm wrangler d1 migrations apply my-database --remote
```

---

### 2-4. Drizzle ORM

#### インストール

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

#### スキーマ定義 (`src/db/schema.ts`)

```typescript
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});
```

#### `drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",           // wrangler.toml の migrations_dir と一致させる
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
```

#### マイグレーションワークフロー

```bash
# 1. スキーマ変更後に SQL を生成
pnpm drizzle-kit generate

# 2. ローカル D1 へ適用
pnpm wrangler d1 migrations apply my-database --local

# 3. 本番 D1 へ適用
pnpm wrangler d1 migrations apply my-database --remote
```

**重要:** D1 へのマイグレーション適用は `drizzle-kit migrate` ではなく `wrangler d1 migrations apply` を使う。

#### Workers 内での使用

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

app.get("/users", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const users = await db.select().from(schema.users).all();
  return c.json({ users });
});
```

#### `package.json` スクリプト

```json
{
  "scripts": {
    "dev": "wrangler dev --ip 0.0.0.0",
    "deploy": "wrangler deploy",
    "cf-typegen": "wrangler types",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply my-database --local",
    "db:migrate:remote": "wrangler d1 migrations apply my-database --remote",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 3. フロントエンド

### 3-1. React Router v7 + Vite

#### セットアップ (create-vite)

```bash
# 1. Vite CLI で React + TypeScript プロジェクトを scaffolding, 設定したいことがあるのでユーザーが自分でやります。タイミングになったら教えてください。
pnpm create vite apps/frontend 
```

#### `vite.config.ts` を React Router v7 用に変更

`@vitejs/plugin-react` を `@react-router/dev/vite` に置き換える。

```typescript
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
});
```

#### `react-router.config.ts` を作成

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false, // SPA モード
} satisfies Config;
```

#### ディレクトリ構成を調整

create-vite は `src/` ディレクトリを生成するが、React Router v7 フレームワークモードでは `app/` を使う。

```bash
# src/ を app/ にリネーム
mv apps/frontend/src apps/frontend/app
```

**SPA モードの注意点:**
- `ssr: false` でサーバーバンドルは生成されない
- ルートルート以外の `loader` / `action` / `headers` は使用不可
- ビルド結果は `build/client/index.html` に出力

#### ルート定義 (`app/routes.ts`)

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard/index.tsx"),
    route("settings", "routes/dashboard/settings.tsx"),
  ]),
] satisfies RouteConfig;
```

#### `app/root.tsx`

```typescript
import { Outlet, Scripts, ScrollRestoration } from "react-router";

export default function Root() {
  return (
    <html lang="ja">
      <head />
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

---

### 3-2. shadcn/ui + Tailwind CSS v4

#### セットアップ (shadcn CLI)

```bash
# 対話なしで初期化 (-y でプロンプトスキップ、-c で作業ディレクトリ指定)
pnpm dlx shadcn@latest init -y -b zinc -c apps/frontend
```

生成される `components.json` (Tailwind v4 では `tailwind.config` は空文字列):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/app.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "~/components",
    "utils": "~/lib/utils",
    "ui": "~/components/ui",
    "lib": "~/lib",
    "hooks": "~/hooks"
  },
  "iconLibrary": "lucide"
}
```

#### CSS 設定 (`app/app.css`)

Tailwind v4 では `tailwindcss-animate` の代わりに `tw-animate-css` を使う。

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}
```

#### コンポーネント追加

```bash
pnpm dlx shadcn@latest add button card input
```

---

### 3-3. Orval (API クライアント自動生成)

#### インストール

```bash
pnpm add -D orval
```

#### `orval.config.ts`

```typescript
import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../backend/openapi.json", // バックエンドの OpenAPI スペック
    },
    output: {
      mode: "tags-split",
      target: "src/api/gen",
      schemas: "src/api/models",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/api/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

#### カスタム fetch (`src/api/custom-fetch.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export interface RequestOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function customFetch<T>(options: RequestOptions): Promise<T> {
  const { url, method, params, data, headers, signal } = options;

  const queryString = params
    ? `?${new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    : "";

  const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: data ? JSON.stringify(data) : undefined,
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type ErrorType<Error> = Error;
export type BodyType<Body> = Body;
```

#### コマンド

```json
{
  "scripts": {
    "generate:api": "orval --config ./orval.config.ts"
  }
}
```

---

### 3-4. TanStack Query v5

#### インストール

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

#### `app/root.tsx` への統合

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet, Scripts, ScrollRestoration } from "react-router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5分
      gcTime: 1000 * 60 * 30,         // 30分
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export default function Root() {
  return (
    <html lang="ja">
      <head />
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

#### Orval 生成フックの使用例

```typescript
import { useGetUsers } from "~/api/gen/users/users";
import { LoadingState } from "~/components/design-system";

export default function UsersPage() {
  const { data: users, isPending, isError, error } = useGetUsers();

  if (isPending) return <LoadingState message="読み込み中..." />;
  if (isError) return <p>エラー: {String(error)}</p>;

  return (
    <ul>
      {users?.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

#### データフロー全体像

```
Backend: Hono OpenAPI → openapi.json
                           ↓ orval generate
Frontend: TanStack Query Hooks + TypeScript 型 (src/api/gen/)
                           ↓ import
          React コンポーネント (app/routes/)
                           ↓ QueryClientProvider
          TanStack Query キャッシュ
                           ↓ customFetch
          Hono Backend API
```

---

## 4. ローカル開発環境 (Docker Compose)

### `docker-compose.yml`

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      target: development
    container_name: my-app-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./apps/frontend/app:/app/apps/frontend/app:ro
      - ./apps/frontend/public:/app/apps/frontend/public:ro
    environment:
      - NODE_ENV=development
      - VITE_API_URL=${VITE_API_URL:-http://localhost:8787}
    stdin_open: true
    tty: true
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: development
    container_name: my-app-backend
    ports:
      - "8787:8787"
    volumes:
      - ./apps/backend/src:/app/apps/backend/src:ro
      - ./apps/backend/.dev.vars:/app/apps/backend/.dev.vars:ro
      - ./apps/backend/.wrangler:/app/apps/backend/.wrangler
    stdin_open: true
    tty: true
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### `apps/backend/Dockerfile`

```dockerfile
FROM node:24-slim AS development

# workerd に必要な依存
RUN apt-get update && apt-get install -y \
    libc++1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# モノレポの workspace 構造を維持してインストール
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --filter backend

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# マイグレーション自動実行 + dev サーバー起動のエントリーポイント
COPY apps/backend/scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8787

CMD ["/docker-entrypoint.sh"]
```

### `apps/frontend/Dockerfile`

```dockerfile
FROM node:24-slim AS development

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/apps/frontend

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
```

### 主要コマンド

```bash
docker-compose up                  # 全サービス起動 (frontend + backend)
docker-compose up backend          # バックエンドのみ
docker-compose up frontend         # フロントエンドのみ
docker-compose down -v && docker-compose up  # クリーンスタート (ボリューム削除)
```

**注意:** Docker はローカル開発専用。本番デプロイは `wrangler deploy` / Cloudflare Pages を使う。

---

## 5. CI/CD (GitHub Actions)

### 必要な GitHub Secrets

| Secret 名 | 取得元 | 用途 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard > API Tokens | Workers/Pages デプロイ |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard | アカウント指定 |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard | フロントエンドビルド |
| `VITE_API_URL` | Cloudflare Workers URL | フロントエンドビルド |

### 5-1. CI ワークフロー

`.github/workflows/ci.yml` - PR チェック用。

```yaml
name: CI

on:
  pull_request:
    branches: [main, production]
  push:
    branches: [main]

jobs:
  biome:
    name: Biome Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: biomejs/setup-biome@v2
      - run: biome ci --reporter=github .

  typecheck:
    name: TypeScript Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  build-backend:
    name: Build Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Wrangler Build Check
        run: pnpm wrangler deploy --dry-run --outdir dist
        working-directory: apps/backend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  build-frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Build Frontend
        run: pnpm build
        working-directory: apps/frontend
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

### 5-2. デプロイワークフロー

`.github/workflows/deploy.yml` - production ブランチへの push でデプロイ。

```yaml
name: Deploy

on:
  push:
    branches: [production]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci-check:
    name: CI Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: biomejs/setup-biome@v2
      - run: biome ci .
      - run: pnpm typecheck

  deploy-backend:
    name: Deploy Backend (Workers)
    needs: ci-check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Apply D1 Migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/backend
          packageManager: pnpm
          command: d1 migrations apply my-database --remote

      - name: Deploy Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/backend
          packageManager: pnpm
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

  deploy-frontend:
    name: Deploy Frontend (Pages)
    needs: ci-check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Build Frontend
        run: pnpm build
        working-directory: apps/frontend
        env:
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy build/client --project-name=my-project
          workingDirectory: apps/frontend
          packageManager: pnpm
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 5-3. ベストプラクティス

#### pnpm キャッシュ

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm  # pnpm-lock.yaml のハッシュで自動キャッシュ
- run: pnpm install --frozen-lockfile
```

`pnpm install` はモノレポルートで 1 回だけ実行する。

#### Biome CI

- ローカル: `biome check --write` (自動修正あり)
- CI: `biome ci` (自動修正なし、差異があれば失敗)
- `--reporter=github` で PR にインライン注釈が付く

#### Workers Secrets の CI 設定

```yaml
- uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: apps/backend
    secrets: |
      API_KEY
      SECRET_KEY
  env:
    API_KEY: ${{ secrets.API_KEY }}
    SECRET_KEY: ${{ secrets.SECRET_KEY }}
```

---

## Sources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Biome v2](https://biomejs.dev/blog/biome-v2/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Hono - Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Drizzle ORM - Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [React Router v7 - SPA Mode](https://reactrouter.com/how-to/spa)
- [shadcn/ui - React Router](https://ui.shadcn.com/docs/installation/react-router)
- [Orval - React Query](https://orval.dev/guides/react-query)
- [TanStack Query v5](https://tanstack.com/query/v5/docs/framework/react/installation)
- [Cloudflare Workers - GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action)
- [Biome CI](https://biomejs.dev/recipes/continuous-integration/)
