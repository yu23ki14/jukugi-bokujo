# Jukugi Bokujo Backend - Deployment Guide

## 前提条件

- Node.js 20以上
- pnpm
- Cloudflare Workers アカウント
- Clerk アカウント（認証用）
- Anthropic API アカウント（LLM統合用）

## 環境変数の準備

### ローカル開発

1. `.dev.vars.example` をコピー:
```bash
cd apps/backend
cp .dev.vars.example .dev.vars
```

2. `.dev.vars` を編集:
```bash
CLERK_SECRET_KEY=sk_test_...        # Clerk Dashboard から取得
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic Console から取得
ENVIRONMENT=development
```

### 本番環境

Cloudflare Workers のシークレットとして設定:

```bash
cd apps/backend

# Clerk Secret Key を設定
wrangler secret put CLERK_SECRET_KEY
# プロンプトが表示されたら、本番用のClerk Secret Keyを入力

# Anthropic API Key を設定
wrangler secret put ANTHROPIC_API_KEY
# プロンプトが表示されたら、Anthropic API Keyを入力
```

**注意**: 本番環境では `.dev.vars` は使用されません。`wrangler secret` で設定したシークレットが使用されます。

## データベースのセットアップ

### 1. Cloudflare D1 データベースの作成

```bash
cd apps/backend

# D1データベースを作成
wrangler d1 create jukugi-bokujo-db
```

出力例:
```
✅ Successfully created DB 'jukugi-bokujo-db' in region APAC
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "jukugi-bokujo-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. wrangler.toml にデータベースIDを設定

上記の `database_id` を `wrangler.toml` に設定:

```toml
[[d1_databases]]
binding = "DB"
database_name = "jukugi-bokujo-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← ここに設定
```

### 3. マイグレーションの実行

#### ローカル環境（開発時）

```bash
cd apps/backend

# ローカルD1にマイグレーション実行
pnpm wrangler d1 execute jukugi-bokujo-db --local --file=./migrations/0001_initial.sql
```

#### 本番環境

```bash
cd apps/backend

# 本番D1にマイグレーション実行
pnpm wrangler d1 execute jukugi-bokujo-db --remote --file=./migrations/0001_initial.sql
```

**重要**: `--remote` フラグを使用すると、Cloudflare 本番環境のD1データベースに対してマイグレーションが実行されます。

### 4. データベースの確認

```bash
# ローカル
pnpm wrangler d1 execute jukugi-bokujo-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"

# 本番
pnpm wrangler d1 execute jukugi-bokujo-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

期待される出力: 9テーブル（users, agents, topics, sessions, session_participants, turns, statements, knowledge_entries, user_inputs）

## デプロイ

### 1. ローカルでの動作確認

```bash
cd apps/backend

# 開発サーバー起動
pnpm dev

# 別ターミナルで動作確認
curl http://localhost:8787/health
curl http://localhost:8787/api/topics
```

### 2. 本番環境へのデプロイ

```bash
cd apps/backend

# Cloudflare Workers にデプロイ
pnpm deploy
# または
wrangler deploy
```

デプロイが成功すると、Workers のURLが表示されます:
```
Published jukugi-bokujo-backend (0.xx sec)
  https://jukugi-bokujo-backend.<your-subdomain>.workers.dev
```

### 3. 本番環境の動作確認

```bash
# ヘルスチェック
curl https://jukugi-bokujo-backend.<your-subdomain>.workers.dev/health

# トピックAPI
curl https://jukugi-bokujo-backend.<your-subdomain>.workers.dev/api/topics
```

## Cron の動作確認

### ローカル環境

```bash
# Master Cron（6時間ごと）のテスト
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"

# Turn Cron（15分ごと）のテスト
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"
```

### 本番環境

Cloudflare Workers Dashboard で Cron の実行状況を確認:
1. Cloudflare Dashboard にログイン
2. Workers & Pages > jukugi-bokujo-backend
3. Triggers タブ > Cron Triggers
4. 実行履歴とログを確認

## トラブルシューティング

### D1 データベースが見つからない

```bash
# データベース一覧を確認
wrangler d1 list

# データベースを再作成
wrangler d1 create jukugi-bokujo-db
```

### シークレットが設定されていない

```bash
# シークレット一覧を確認
wrangler secret list

# シークレットを設定
wrangler secret put CLERK_SECRET_KEY
wrangler secret put ANTHROPIC_API_KEY
```

### デプロイエラー

```bash
# TypeScript型チェック
cd apps/backend
pnpm tsc --noEmit

# ビルド確認
wrangler deploy --dry-run
```

### Cron が実行されない

wrangler.toml の `[triggers]` セクションを確認:
```toml
[triggers]
crons = ["0 */6 * * *", "*/15 * * * *"]
```

## モニタリング

### ログの確認

```bash
# リアルタイムログ（本番環境）
wrangler tail

# 特定のCronイベントのみ
wrangler tail --format=json | grep "Cron triggered"
```

### Cloudflare Dashboard

1. Workers & Pages > jukugi-bokujo-backend
2. Logs タブでリアルタイムログを確認
3. Metrics タブでリクエスト数、エラー率を確認

## セキュリティチェックリスト

- [ ] `.dev.vars` を `.gitignore` に追加済み（本番シークレットを含めない）
- [ ] 本番環境のシークレットは `wrangler secret` で設定
- [ ] Clerk の本番環境キーを使用
- [ ] CORS設定で許可するオリジンを本番フロントエンドのみに制限
- [ ] D1 データベースIDが正しく設定されている

## ロールバック手順

問題が発生した場合:

```bash
# 以前のデプロイメントにロールバック
wrangler rollback

# または特定のバージョンにロールバック
wrangler deployments list
wrangler rollback --message "Rollback to stable version"
```

## 本番環境の設定

### wrangler.toml の本番用設定

```toml
# 本番環境用の設定を追加する場合
[env.production]
name = "jukugi-bokujo-backend-production"
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "jukugi-bokujo-db-production"
database_id = "本番DB ID"
```

デプロイ時:
```bash
# 本番環境にデプロイ
wrangler deploy --env production
```

## 参考リンク

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Clerk Documentation](https://clerk.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
