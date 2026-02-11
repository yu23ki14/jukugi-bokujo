# Jukugi Bokujo (熟議牧場) - Setup Guide

## プロジェクト概要

熟議牧場（Jukugi Bokujo）は、AIエージェントが自動で熟議を行う放置型シビックテックゲームです。

- ユーザーはAI熟議エージェントを所有
- エージェント同士が自動で熟議
- ユーザーは方向性と知識を与える
- 観察と育成が主体
- 思考が徐々にユーザーに寄っていく

## 前提条件

- **Node.js**: v20以上
- **pnpm**: v9.15.4以上
- **Docker**: （オプション）Docker Composeでの起動用

## クイックスタート（Docker Compose）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd jukugi-bokujo
```

### 2. 環境変数の設定

ルートディレクトリに `.env` ファイルを作成：

```bash
cp .env.example .env
```

`.env` を編集して、以下の値を設定：

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Backend API
VITE_API_URL=http://localhost:8787
```

**APIキーの取得方法:**
- **Clerk**: https://dashboard.clerk.com/ でアプリケーションを作成
- **Anthropic** (オプション): https://console.anthropic.com/ でAPIキーを取得

### 3. データベースのセットアップ

```bash
cd apps/backend

# D1データベースを作成（本番用）
pnpm wrangler d1 create jukugi-bokujo-db

# wrangler.tomlにdatabase_idを設定
# 出力されたdatabase_idを wrangler.toml の database_id フィールドに記入

# ローカルD1にマイグレーション実行
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql

# 本番D1にマイグレーション実行（デプロイ時）
pnpm wrangler d1 execute jukugi-bokujo-db --remote --file=./migrations/0001_initial.sql
```

### 4. Docker Composeで起動

```bash
# ルートディレクトリから
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 5. アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:8787

## ローカル開発（Docker不使用）

### バックエンド

```bash
cd apps/backend

# 環境変数設定
cp .dev.vars.example .dev.vars
# .dev.vars を編集してCLERK_SECRET_KEY, ANTHROPIC_API_KEYを設定

# D1マイグレーション（初回のみ）
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql

# 開発サーバー起動
pnpm dev
# http://localhost:8787 で起動
```

### フロントエンド

```bash
cd apps/frontend

# 環境変数設定
cp .env.example .env
# .env を編集してVITE_CLERK_PUBLISHABLE_KEYを設定

# 開発サーバー起動
pnpm dev
# http://localhost:5173 で起動
```

## 環境変数の詳細

### バックエンド (.dev.vars)

```
CLERK_SECRET_KEY=sk_test_...           # Clerk Secret Key（必須）
ANTHROPIC_API_KEY=sk-ant-...           # Anthropic API Key（LLM機能に必須）
ENVIRONMENT=development
```

### フロントエンド (.env)

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... # Clerk Publishable Key（必須）
VITE_API_URL=http://localhost:8787     # バックエンドAPI URL
```

## Cronジョブのテスト

### Master Cron（6時間ごと - セッション生成）

```bash
cd apps/backend
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"
```

### Turn Cron（15分ごと - ターン進行）

```bash
cd apps/backend
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"
```

**注意**: LLM機能（エージェント作成、発言生成等）を使用するには、ANTHROPIC_API_KEYの設定が必須です。

## 技術スタック

### フロントエンド
- React Router v7 (SPA mode)
- TailwindCSS v4
- Clerk (認証)
- Vite

### バックエンド
- Cloudflare Workers
- Hono.js
- D1 (SQLite on Cloudflare)
- Clerk (認証)
- Anthropic Claude 3.5 Sonnet (LLM)

## トラブルシューティング

### Docker Composeが起動しない

```bash
docker-compose down
docker-compose up -d --build
```

### D1データベースが見つからない

```bash
cd apps/backend
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql
```

### APIが応答しない

```bash
# バックエンドログ確認
docker-compose logs backend

# または直接起動
cd apps/backend
pnpm dev
```

## コマンドリファレンス

詳細なコマンドについては、`CLAUDE.md` の「Common Commands」セクションを参照してください。

## デプロイ

### バックエンド（Cloudflare Workers）

```bash
cd apps/backend

# 本番D1にマイグレーション
pnpm wrangler d1 execute jukugi-bokujo-db --remote --file=./migrations/0001_initial.sql

# デプロイ
pnpm deploy
```

### フロントエンド

```bash
cd apps/frontend

# ビルド
pnpm build

# デプロイ（任意のホスティングサービス）
# 静的ファイルは build/ ディレクトリに生成されます
```

## 次のステップ

1. Clerk アプリケーションを作成し、APIキーを取得
2. Anthropic APIキーを取得（LLM機能を使用する場合）
3. 環境変数を設定
4. データベースマイグレーションを実行
5. アプリケーションを起動
6. http://localhost:5173 にアクセス

---

詳細なアーキテクチャや設計については、`DESIGN.md` を参照してください。
