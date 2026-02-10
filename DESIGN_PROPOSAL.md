# Jukugi Bokujo - ロバストなターン処理設計提案

## 現状の問題

### 1. レートリミットの制約
- **Tier 1**: 100セッション（400リクエスト）を15分で処理不可能
  - ITPM: 30,000 → 1,600,000トークン必要 = 53.3分
  - OTPM: 8,000 → 400,000トークン必要 = 50分
- **Tier 2以上**: 理論的には可能だが、マージンが少ない
  - Token Bucket Algorithmによりバースト送信で即座にレート制限

### 2. 実装の問題
- 同期的な順次処理（for文）
- 429エラーハンドリングなし
- リトライロジックなし
- 並列処理なし

## 解決策

### 戦略A: Cloudflare Queues + レートリミット対応 (推奨)

#### アーキテクチャ

```
Cron (15分ごと)
  ↓
[キュー発見・投入フェーズ]
  ├─ pending/processing turnsを取得
  ├─ 各ターンをCloudflare Queueに投入
  └─ ターンあたり4メッセージ（各エージェント1メッセージ）

Cloudflare Queue Consumer
  ↓
[並列処理フェーズ]
  ├─ バッチサイズ: Tierに応じて調整
  │   - Tier 1: batch=5 (RPM=50/分 → 安全マージンで5並列)
  │   - Tier 2: batch=50 (RPM=1000/分)
  │   - Tier 3: batch=100 (RPM=2000/分)
  │   - Tier 4: batch=200 (RPM=4000/分)
  │
  ├─ 各メッセージ = 1エージェントの発言生成
  ├─ 429エラー時: exponential backoff + リトライ
  └─ retry-afterヘッダーを尊重
```

#### メリット
- ✅ レートリミットを超えないよう制御可能
- ✅ 自動リトライ（Cloudflare Queuesの機能）
- ✅ 並列処理による高速化
- ✅ エラー隔離（1エージェント失敗しても他は続行）
- ✅ スケーラブル（セッション数増加に対応）

#### 実装の要点

**1. wrangler.toml に Queue を追加**
```toml
[[queues.producers]]
queue = "turn-processing-queue"
binding = "TURN_QUEUE"

[[queues.consumers]]
queue = "turn-processing-queue"
max_batch_size = 10  # Tierに応じて調整
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "turn-dlq"
```

**2. メッセージ構造**
```typescript
interface TurnQueueMessage {
  turnId: string;
  sessionId: string;
  agentId: string;
  turnNumber: number;
  attempt: number;
}
```

**3. Cron処理の変更**
```typescript
// Before: processTurn()を直接呼び出し
for (const turn of turnsToProcess) {
  await processTurn(env, turn);
}

// After: Queueにメッセージを投入
for (const turn of turnsToProcess) {
  const participants = await getSessionParticipants(env.DB, turn.session_id);

  for (const agentId of participants) {
    await env.TURN_QUEUE.send({
      turnId: turn.id,
      sessionId: turn.session_id,
      agentId: agentId,
      turnNumber: turn.turn_number,
      attempt: 0,
    });
  }
}
```

**4. Queue Consumerの実装**
```typescript
export default {
  async queue(batch: MessageBatch<TurnQueueMessage>, env: Bindings): Promise<void> {
    // 並列処理（Promise.allSettled）
    const results = await Promise.allSettled(
      batch.messages.map(msg => processAgentStatement(env, msg.body))
    );

    // エラーハンドリング
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        const msg = batch.messages[index];

        // 429エラーの場合はリトライ（Cloudflareが自動処理）
        if (isRateLimitError(result.reason)) {
          msg.retry(); // exponential backoffで自動リトライ
        } else {
          console.error(`Failed to process agent ${msg.body.agentId}:`, result.reason);
          msg.ack(); // 他のエラーは諦める
        }
      } else {
        batch.messages[index].ack();
      }
    }
  }
}
```

**5. レートリミット対応**
```typescript
async function callAnthropicAPIWithRetry(
  env: Bindings,
  request: AnthropicRequest,
  maxRetries = 3
): Promise<{ content: string }> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await callAnthropicAPI(env, request);
      return response;
    } catch (error) {
      if (isRateLimitError(error)) {
        const retryAfter = getRetryAfterSeconds(error);

        if (attempt < maxRetries - 1) {
          // exponential backoff + jitter
          const delay = Math.min(
            retryAfter * 1000 || Math.pow(2, attempt) * 1000,
            30000
          ) + Math.random() * 1000;

          await sleep(delay);
          attempt++;
          continue;
        }
      }
      throw error;
    }
  }
}
```

---

### 戦略B: Anthropic Message Batches API (代替案)

#### 概要
Anthropicの[Message Batches API](https://docs.anthropic.com/en/api/message-batches)を使用して、複数のリクエストを一度にバッチ送信。

#### レートリミット（Batches API専用）
| Tier | RPM | 処理キュー | バッチあたり最大リクエスト |
|------|-----|-----------|------------------------|
| Tier 1 | 50 | 100,000 | 100,000 |
| Tier 2 | 1,000 | 200,000 | 100,000 |
| Tier 3 | 2,000 | 300,000 | 100,000 |
| Tier 4 | 4,000 | 500,000 | 100,000 |

#### メリット
- ✅ 1バッチで最大100,000リクエスト処理可能
- ✅ Tier 1でも100セッション（400リクエスト）を処理可能
- ✅ 自動レートリミット制御
- ✅ コスト効率が良い（50%割引）

#### デメリット
- ❌ 非同期処理（結果取得までに遅延）
- ❌ リアルタイム性が低い（24時間以内に処理完了）
- ❌ ターン内の順次発言が難しい（全エージェント並列になる）

#### 実装例
```typescript
// 1. バッチ作成
const batch = await client.batches.create({
  requests: participants.map((agentId, index) => ({
    custom_id: `${turn.id}-${agentId}`,
    params: {
      model: LLM_MODEL,
      max_tokens: LLM_TOKEN_LIMITS.STATEMENT,
      messages: [{ role: "user", content: generatePrompt(agentId) }]
    }
  }))
});

// 2. バッチ完了を待つ（polling or webhook）
const completedBatch = await client.batches.retrieve(batch.id);

// 3. 結果を取得
for (const result of completedBatch.results) {
  if (result.result.type === 'succeeded') {
    // DBに保存
  }
}
```

---

### 戦略C: Prompt Caching による実質スループット向上

#### 概要
Anthropicの[Prompt Caching](https://docs.anthropic.com/en/build-with-claude/prompt-caching)を活用して、システムプロンプトや知識をキャッシュ。

#### 重要な特性
- **キャッシュされた入力トークンはITPMにカウントされない**（Sonnet 4.xの場合）
- キャッシュヒット率80%の場合、実質的なITPM = 2,000,000 × 5 = **10,000,000トークン/分**

#### 実装例
```typescript
const response = await client.messages.create({
  model: LLM_MODEL,
  max_tokens: LLM_TOKEN_LIMITS.STATEMENT,
  system: [
    {
      type: "text",
      text: generateSystemPrompt(agent), // 人格・知識
      cache_control: { type: "ephemeral" } // キャッシュ
    }
  ],
  messages: [
    {
      role: "user",
      content: generateUserPrompt(session, previousStatements)
    }
  ]
});
```

#### メリット
- ✅ レートリミットを実質的に5-10倍に拡大
- ✅ コスト削減（キャッシュ読み込みは90%割引）
- ✅ レイテンシ改善
- ✅ 既存コードへの影響が少ない

---

## 推奨実装プラン

### Phase 1: 緊急対応（即座に実装可能）
1. **Prompt Cachingの導入**
   - システムプロンプト、エージェント人格、知識をキャッシュ
   - 実装コスト: 低
   - 効果: ITPMの実質的な向上

2. **429エラーハンドリング + リトライロジック**
   - exponential backoff
   - retry-afterヘッダーの尊重
   - 実装コスト: 低

### Phase 2: 本格対応（推奨）
3. **Cloudflare Queues導入**
   - 並列処理による高速化
   - レートリミット制御
   - エラー隔離
   - 実装コスト: 中

### Phase 3: スケーラビリティ強化（オプション）
4. **Message Batches API検討**
   - 1000+セッション規模の場合に検討
   - リアルタイム性が不要な場合

---

## パフォーマンス試算

### Phase 1 実装後（Prompt Caching + Retry）
| Tier | 15分で処理可能なセッション数 | 備考 |
|------|--------------------------|------|
| Tier 1 | ~20セッション (80リクエスト) | OTPM制約 |
| Tier 2 | **120セッション (480リクエスト)** ✅ | 目標達成 |
| Tier 3 | 200セッション | 余裕 |
| Tier 4 | 500セッション | 余裕 |

### Phase 2 実装後（Queues導入）
- **Tier 2以上で100+セッション安定処理可能**
- エラー時の自動リトライ
- スケーラブルなアーキテクチャ

---

## コスト試算

### Cloudflare Queues
- 無料枠: 1,000,000メッセージ/月
- 有料: $0.40 / 100万メッセージ
- **100セッション × 4エージェント × 10ターン × 30日/月 = 120,000メッセージ/月** → 無料枠内

### Anthropic API (Sonnet 4.5)
- 入力: $3.00 / 1M tokens
- 出力: $15.00 / 1M tokens
- キャッシュ書き込み: $3.75 / 1M tokens
- キャッシュ読み込み: $0.30 / 1M tokens (90% off)

**月間コスト（100セッション、10ターン/セッション）:**
- リクエスト数: 100セッション × 4エージェント × 10ターン = 4,000リクエスト
- 入力トークン: 4,000 × 4,000 = 16M tokens → $48
- 出力トークン: 4,000 × 1,000 = 4M tokens → $60
- **合計: ~$108/月**

**Prompt Caching適用後（80%キャッシュヒット）:**
- キャッシュ読み込み: 16M × 80% × $0.30/M = $3.84
- 新規入力: 16M × 20% × $3.00/M = $9.60
- 出力: 4M × $15/M = $60
- **合計: ~$73.44/月（32%削減）**

---

## 参考資料

- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Anthropic Message Batches API](https://platform.claude.com/docs/en/api/message-batches)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/build-with-claude/prompt-caching)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
