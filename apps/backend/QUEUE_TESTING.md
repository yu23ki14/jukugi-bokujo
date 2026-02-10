# Cloudflare Queues - ローカル開発・テストガイド

## 概要

Turn処理をCloudflare Queues経由で並列処理するように実装しました。このドキュメントでは、ローカル開発環境でのテスト方法を説明します。

## アーキテクチャ

```
Cron (15分ごと)
  ↓
[Turn Cron] pending turnsをキューに投入
  ↓
Cloudflare Queue (TURN_QUEUE)
  ↓
[Queue Consumer] 並列処理（max_batch_size=10）
  ├─ Agent 1の発言生成
  ├─ Agent 2の発言生成
  ├─ Agent 3の発言生成
  └─ Agent 4の発言生成
  ↓
[Turn Completion Check] 全エージェント完了時
  ↓
次のTurn作成 or Session完了
```

## ローカル開発での動作

### 1. Queueの自動起動

`wrangler dev`を起動すると、Miniflareが**インメモリQueue**を自動的に起動します：

```bash
cd apps/backend
pnpm dev
```

**注意:**
- Queueデータは永続化されません（再起動で消失）
- `--remote`モードでは動作しません（ローカルのみ）

### 2. Queue設定（wrangler.toml）

```toml
[[queues.producers]]
queue = "turn-processing-queue"
binding = "TURN_QUEUE"

[[queues.consumers]]
queue = "turn-processing-queue"
max_batch_size = 10       # 最大10エージェントを並列処理
max_batch_timeout = 30    # 30秒でバッチ送信
max_retries = 3           # 最大3回リトライ
dead_letter_queue = "turn-processing-dlq"
max_concurrency = 5       # 最大5並列実行
retry_delay = 60          # 60秒後にリトライ
```

## テスト方法

### 方法1: HTTPエンドポイント経由（推奨）

最も簡単な方法です。

#### Step 1: Masterタスクを実行してセッション作成

```bash
curl -X POST http://localhost:8787/api/test-cron/master
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "Master Cron executed successfully (session generation)"
}
```

#### Step 2: Turnタスクを実行してキューに投入

```bash
curl -X POST http://localhost:8787/api/test-cron/turn
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "Turn Cron executed successfully (enqueued turns to Queue for processing)"
}
```

これにより：
1. pending turnsがキューに投入される
2. Queue Consumerが自動的に起動
3. 並列で各エージェントの発言を生成
4. 全エージェント完了後、次のTurnを作成

#### Step 3: 単一メッセージのテスト送信

```bash
curl -X POST http://localhost:8787/api/test-queue/send
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "Test message sent to Queue",
  "data": {
    "turnId": "...",
    "sessionId": "...",
    "agentId": "...",
    "turnNumber": 1
  }
}
```

### 方法2: wrangler queues sendコマンド

ターミナルから直接メッセージを送信できます。

```bash
# Queueにテストメッセージを送信
cd apps/backend
pnpm wrangler queues send turn-processing-queue '{
  "turnId": "test-turn-id",
  "sessionId": "test-session-id",
  "agentId": "test-agent-id",
  "turnNumber": 1,
  "attempt": 0
}'
```

**注意:** 実際のIDを使う必要があります（DBに存在するID）。

### 方法3: 複数メッセージの一括送信

```bash
# 10個のメッセージを並列送信
cd apps/backend
for i in {1..10}; do
  pnpm wrangler queues send turn-processing-queue "{\"test\": $i}" &
done
wait
```

## ログの確認

Queue Consumerのログは`wrangler dev`のコンソールに表示されます：

```
[Queue Consumer] Processing batch of 4 messages
[Queue] Processing agent agent-123 for turn 1 (attempt 1)
[Queue] Statement generated for agent agent-123
[Queue Consumer] Successfully processed agent agent-123, statement: stmt-456
[Turn Completion] Turn turn-789 complete: 4/4 statements
[Turn Completion] Created next turn 2 for session session-abc
[Queue Consumer] Batch processed: 4 succeeded, 0 failed
```

## エラーハンドリングのテスト

### 429 Rate Limit エラー

実際のAnthropicAPIを使っている場合、レートリミットに達すると：

```
[Queue Consumer] Rate limit hit for agent agent-123, retrying after 60s
```

- Exponential backoffで自動リトライ
- `retry-after`ヘッダーがあれば尊重

### 一般的なエラー

```
[Queue Consumer] Processing failed for agent agent-123: Database connection error
```

- 60秒後に自動リトライ
- `max_retries`（3回）に達するとDLQへ送信

## Queue動作の確認

### 1. メッセージ数の確認

現時点でCloudflare QueuesにはCLIでのメッセージ数確認コマンドはありません。
代わりにログで確認してください：

```
[Queue Consumer] Processing batch of 10 messages
```

### 2. バッチ処理の確認

`max_batch_size=10`なので、10メッセージ溜まるまで待つか、`max_batch_timeout=30`秒経過で送信されます。

### 3. 並列処理の確認

ログで複数のエージェントが同時に処理されていることを確認：

```
[Queue] Processing agent agent-1 for turn 1 (attempt 1)
[Queue] Processing agent agent-2 for turn 1 (attempt 1)
[Queue] Processing agent agent-3 for turn 1 (attempt 1)
[Queue] Processing agent agent-4 for turn 1 (attempt 1)
```

## トラブルシューティング

### Queue Consumer が起動しない

**原因:** `wrangler.toml`の設定が正しくない可能性

**解決策:**
1. `wrangler.toml`の`[[queues.consumers]]`セクションを確認
2. `queue`名が`[[queues.producers]]`と一致しているか確認
3. `wrangler dev`を再起動

### メッセージが処理されない

**原因:** Queue Consumerのエラー

**解決策:**
1. `wrangler dev`のログを確認
2. `ANTHROPIC_API_KEY`が`.dev.vars`に設定されているか確認
3. DBにagent/session/turnデータが存在するか確認

### 型エラーが出る

**原因:** Queue型定義が生成されていない

**解決策:**
```bash
cd apps/backend
pnpm cf-typegen
```

## プロダクション環境

### Queueの作成

```bash
cd apps/backend
pnpm wrangler queues create turn-processing-queue
```

### Dead Letter Queueの作成

```bash
pnpm wrangler queues create turn-processing-dlq
```

### デプロイ

```bash
pnpm deploy
```

### プロダクションでの監視

Cloudflare Dashboardから：
1. Workers & Pages → Queues
2. `turn-processing-queue`を選択
3. メトリクスを確認

## パフォーマンスチューニング

### max_batch_size の調整

レートリミットに応じて調整：

- **Tier 1** (50 RPM): `max_batch_size = 5`
- **Tier 2** (1000 RPM): `max_batch_size = 50`
- **Tier 3** (2000 RPM): `max_batch_size = 100`
- **Tier 4** (4000 RPM): `max_batch_size = 200`

### max_batch_timeout の調整

- レイテンシ重視: `max_batch_timeout = 5` （すぐ処理）
- スループット重視: `max_batch_timeout = 30` （バッチ蓄積）

### retry_delay の調整

- レートリミット頻発: `retry_delay = 120` （2分）
- エラー少ない: `retry_delay = 30` （30秒）

## 参考資料

- [Cloudflare Queues Documentation](https://developers.cloudflare.com/queues/)
- [Local Development with Queues](https://developers.cloudflare.com/queues/configuration/local-development/)
- [Batching, Retries and Delays](https://developers.cloudflare.com/queues/configuration/batching-retries/)
