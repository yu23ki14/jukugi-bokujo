# SessionSummary に my_agent_ids を追加してエージェントステータスを正確に表示

## Context

ダッシュボードの「牧場のなかま」リストで、各エージェントが「議論中」か「待機中」かを正確に表示したい。
現在の `SessionSummary` には `participant_count` しかなく、どのエージェントが参加しているかわからない。
セッション一覧APIは既に `session_participants` → `agents` を JOIN しているので、追加クエリで `my_agent_ids` を取得しレスポンスに含める。

## 変更ファイル

1. `apps/backend/src/schemas/sessions.ts` — `SessionSummarySchema` に `my_agent_ids` 追加
2. `apps/backend/src/routes/sessions.ts` — 一覧ハンドラで agent_id を集約してレスポンスに含める
3. `apps/frontend/app/hooks/backend/index.ts` — orval 再生成（`pnpm generate:api`）
4. `apps/frontend/app/routes/dashboard.tsx` — `activeAgentIds` Set を構築し、RanchAgentList で使用

## 1. Backend Schema 変更

**ファイル:** `apps/backend/src/schemas/sessions.ts`

`SessionSummarySchema` に `my_agent_ids` フィールドを追加:

```typescript
my_agent_ids: z.array(z.string().uuid()).openapi({
  description: "IDs of the current user's agents participating in this session",
  example: ["123e4567-e89b-12d3-a456-426614174000"],
}),
```

## 2. Backend Route 変更

**ファイル:** `apps/backend/src/routes/sessions.ts`

現在のクエリは `SELECT DISTINCT s.*` でセッション単位に重複排除しているが、同じセッションにユーザーのエージェントが複数いる場合に agent_id 情報が失われる。

**方針:** メインクエリ後に、取得したセッションIDリストを使って `session_participants` + `agents` を再クエリし、セッションごとの `my_agent_ids` を Map で構築する。

```typescript
// セッション一覧取得後に追加
const sessionIds = result.results.map((s) => s.id);
if (sessionIds.length > 0) {
  const placeholders = sessionIds.map(() => "?").join(",");
  const agentQuery = `
    SELECT sp.session_id, sp.agent_id
    FROM session_participants sp
    JOIN agents a ON sp.agent_id = a.id
    WHERE sp.session_id IN (${placeholders})
    AND a.user_id = ?
  `;
  const agentResult = await c.env.DB.prepare(agentQuery)
    .bind(...sessionIds, userId)
    .all<{ session_id: string; agent_id: string }>();

  // session_id → agent_id[] の Map
  const myAgentMap = new Map<string, string[]>();
  for (const row of agentResult.results) {
    const list = myAgentMap.get(row.session_id) || [];
    list.push(row.agent_id);
    myAgentMap.set(row.session_id, list);
  }
}

// レスポンスの map に追加
my_agent_ids: myAgentMap.get(session.id) || [],
```

## 3. Frontend 型再生成

```bash
# バックエンドを起動した状態で
cd apps/frontend
pnpm generate:api
```

これにより `SessionSummary` に `my_agent_ids: string[]` が追加される。

## 4. Frontend Dashboard 変更

**ファイル:** `apps/frontend/app/routes/dashboard.tsx`

`Dashboard` コンポーネントで activeAgentIds を構築:

```typescript
const activeAgentIds = new Set(
  activeSessions.flatMap((s) => s.my_agent_ids)
);
```

`AgentsDashboardView` と `RanchAgentList` に渡し、ステータス判定を3段階に:

```tsx
{feedbackAgentIds.has(agent.id) ? (
  <StatusBadge variant="feedback">❗ フィードバック待ち</StatusBadge>
) : activeAgentIds.has(agent.id) ? (
  <StatusBadge variant="active">📝 議論中</StatusBadge>
) : (
  <StatusBadge variant="pending">💤 のんびり中</StatusBadge>
)}
```

## 検証

```bash
# バックエンド
cd apps/backend && pnpm dev

# 型再生成
cd apps/frontend && pnpm generate:api

# Lint / Type check
cd /home/yu23ki14/dd2030/jukugi-bokujo
pnpm biome:format && pnpm biome:check
cd apps/frontend && pnpm typecheck
```

ブラウザで確認:
- アクティブセッションに参加中のエージェント → 「📝 議論中」
- フィードバック待ちのエージェント → 「❗ フィードバック待ち」
- いずれでもない → 「💤 のんびり中」
