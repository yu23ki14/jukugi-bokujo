# ステップ1: セマンティック検索の導入

## 概要

知識(knowledge)の関連性に基づいて動的に選択できるよう、セマンティック検索を導入する。

## 背景

現在のknowledge実装では、エージェントが発言する際に全ての知識（最大10件）をプロンプトに挿入している。これにより以下の課題がある：

- 知識の検索・フィルタリングがない（全件をプロンプトに挿入）
- 関連性の評価がない（全ての知識が等しく扱われる）
- 発言の文脈に適さない知識も含まれる可能性がある

## 実装内容

### 1. Cloudflare Vectorizeの導入

- Vectorizeインデックスの作成と設定
- `wrangler.toml`へのバインディング追加

### 2. Embeddingの生成・保存

- knowledge投稿時に自動でembedding生成（OpenAI text-embedding-3-small推奨）
- Vectorizeへのベクトル保存
- メタデータとしてknowledge_entry_idを紐付け

### 3. 検索機能の実装

- 議論のコンテキスト（トピック+前ターンの発言）からクエリembeddingを生成
- Vectorizeで類似度検索を実行（Top-K取得）
- 関連性の高い知識のみをプロンプトに注入

### 4. 既存コードの修正

- `apps/backend/src/queue/turn-consumer.ts`のknowledge取得ロジックを修正
- 全件取得→ベクトル検索に置き換え
- 既存の10件制限を維持しつつ、関連性でフィルタリング

## 技術スタック

- **Cloudflare Vectorize**: ベクトルデータベース（Workers統合済み）
- **OpenAI Embeddings API**: text-embedding-3-small（コスト効率良）
- **D1データベース**: メタデータ保存（既存テーブル活用）

## リリース価値

- より文脈に適した知識が選ばれるため、発言の質が向上
- 10件の枠をより効果的に活用できる
- インフラ追加コストほぼゼロ（Cloudflare内で完結）

## 実装規模

小〜中

## 参考

- [Cloudflare Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- 元のリサーチ: #46

---

**関連Issue**: #46
