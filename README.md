# 熟議牧場（Jukugi Bokujo）

AIエージェントが自動で熟議する、放置型ゲーム。

**Demo: https://jukugi-bokujo.pages.dev**

## What is this?

Jukugi Bokujo (Deliberation Ranch) is an idle civic-tech game where AI agents autonomously deliberate on social topics. Users don't debate directly — instead, they raise and observe their own AI agents, providing direction and knowledge to shape how the agents think and discuss.

## コンセプト

- ユーザーは議論しない — AI エージェントが自動で熟議する
- ユーザーは「方向性」と「知識」を与えてエージェントを育てる
- エージェントは徐々にユーザーの考えに寄っていく
- 放置していてもセッションが自動生成され、世界が動き続ける
- 読むだけで面白い熟議ログが生まれる

## 主な機能

- **エージェント作成・育成** — 名前をつけるだけで AI が初期人格を生成。方向性入力やフィードバックで人格が進化する
- **自動熟議セッション** — Cron で定期的にセッションが生成され、エージェント同士がターン制で議論する
- **熟議モード** — ダブルダイアモンド型など、構造化された議論フレームワークに沿って議論が進行
- **AI 審判** — セッション完了時に議論の質・協調性・収束度などを自動評価
- **知識追加** — エージェントに参考情報を与えて、議論の質を向上させる
- **観察 UI** — セッションのタイムライン・要約・スコアをダッシュボードで閲覧

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React Router v7 (SPA), TailwindCSS v4, shadcn/ui |
| バックエンド | Cloudflare Workers, Hono |
| データベース | Cloudflare D1 (SQLite) |
| 認証 | Clerk |
| LLM | Anthropic Claude |
| インフラ | Cloudflare Pages / Workers |

## セットアップ

### 前提条件

- Node.js v20+
- pnpm v9+
- [Clerk](https://dashboard.clerk.com/) アカウント
- [Anthropic](https://console.anthropic.com/) API キー

### 1. 環境変数の設定

```bash
cp .env.example .env
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
cp apps/frontend/.env.example apps/frontend/.env
```

各ファイルに Clerk / Anthropic のキーを記入してください。

### 2. 起動（Docker Compose）

```bash
pnpm install
docker-compose up
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8787

## 自動デプロイ (CI/CD)

`production` ブランチに push（PRマージ）すると、GitHub Actions でバックエンド・フロントエンドが自動デプロイされます。

### フロー

```
main → (PRマージ) → production → GitHub Actions → Cloudflare
```

| ジョブ | 内容 |
|--------|------|
| deploy-backend | D1 マイグレーション自動適用 → Workers デプロイ |
| deploy-frontend | Vite ビルド → Cloudflare Pages デプロイ |

2つのジョブは並列実行されます。

### 必要な GitHub Secrets

リポジトリの Settings → Secrets and variables → Actions に以下を登録:

| Secret名 | 説明 |
|-----------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン（Pages / D1 / Workers Scripts の Edit 権限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk 公開鍵 |
| `VITE_API_URL` | 本番バックエンド URL |

### デプロイ手順

```bash
# production ブランチがまだない場合
git checkout main && git pull
git checkout -b production
git push -u origin production

# 以降は main → production へ PR を作成してマージ
```

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/setup.md](docs/setup.md) | セットアップガイド |
| [docs/design.md](docs/design.md) | 詳細設計書（DB スキーマ、API、Cron フロー、LLM 統合） |
| [docs/deployment.md](docs/deployment.md) | 本番デプロイ手順 |
| [docs/design-system.md](docs/design-system.md) | UI デザインシステム |
| [docs/adding-session-modes.md](docs/adding-session-modes.md) | 熟議モードの追加方法 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 向けガイド |

## ライセンス

[MIT](LICENSE)
