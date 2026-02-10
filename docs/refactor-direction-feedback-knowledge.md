# Direction / Feedback / Knowledge リファクタリング仕様書

## 概要

現在 `user_inputs` テーブルに混在している Direction と Feedback を、明確に異なる役割・タイミング・データ構造を持つ独立した機能に分離する。Knowledge もスロット制限を導入する。

---

## 変更前 → 変更後の対比

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| **Direction** | `user_inputs` テーブル、5000字、セッション無関係 | `directions` テーブル、80字、セッション+ターン紐づき、揮発性 |
| **Feedback** | `user_inputs` テーブル、5000字、Direction と同じ扱い | `feedbacks` テーブル、400字、セッション紐づき、1セッション1件 |
| **Knowledge** | `knowledge_entries`、上限なし、title 200字、content 10000字 | 同テーブル、**10スロット上限**、title 30字、content 500字 |
| **ペルソナ更新** | Direction+Feedback両方で更新 | **Feedbackのみ**で更新 |
| **セッション戦略** | なし | Feedback→LLMで戦略生成→`session_strategies`テーブルに保存 |

---

## 1. データベースマイグレーション

**ファイル**: `apps/backend/migrations/0002_refactor_inputs.sql` (新規)

### 1.1 `directions` テーブル（新規）

```sql
CREATE TABLE directions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  content TEXT NOT NULL,            -- 80文字以内
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_directions_agent_session ON directions(agent_id, session_id);
CREATE INDEX idx_directions_session_turn ON directions(session_id, turn_number);
```

### 1.2 `feedbacks` テーブル（新規）

```sql
CREATE TABLE feedbacks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,         -- どのセッションに対するフィードバックか
  content TEXT NOT NULL,            -- 400文字以内
  applied_at INTEGER,               -- ペルソナに適用された時刻
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(agent_id, session_id)      -- 1エージェント×1セッションにつき1件
);

CREATE INDEX idx_feedbacks_agent_id ON feedbacks(agent_id);
CREATE INDEX idx_feedbacks_session_id ON feedbacks(session_id);
```

### 1.3 `session_strategies` テーブル（新規）

```sql
CREATE TABLE session_strategies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,         -- 今回のセッション
  feedback_id TEXT,                 -- 元になったフィードバック（NULL可）
  strategy TEXT NOT NULL,           -- LLMが生成した方針テキスト
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE SET NULL,
  UNIQUE(agent_id, session_id)
);

CREATE INDEX idx_session_strategies_agent_session ON session_strategies(agent_id, session_id);
```

### 1.4 旧テーブル削除

```sql
DROP TABLE IF EXISTS user_inputs;
```

---

## 2. バックエンド型定義の変更

**ファイル**: `apps/backend/src/types/database.ts`

### 削除

```typescript
// 削除: UserInputType, UserInput
export type UserInputType = "direction" | "knowledge" | "feedback";
export interface UserInput { ... }
```

### 追加

```typescript
// Direction: セッション中のリアルタイム指示
export interface Direction {
  id: string;
  agent_id: string;
  session_id: string;
  turn_number: number;
  content: string;          // 80文字以内
  created_at: number;
}

// Feedback: セッション後の振り返り
export interface Feedback {
  id: string;
  agent_id: string;
  session_id: string;
  content: string;          // 400文字以内
  applied_at: number | null;
  created_at: number;
}

// SessionStrategy: Feedbackから生成されたセッション方針
export interface SessionStrategy {
  id: string;
  agent_id: string;
  session_id: string;
  feedback_id: string | null;
  strategy: string;
  created_at: number;
}
```

---

## 3. バックエンド API 型定義の変更

**ファイル**: `apps/backend/src/types/api.ts`

### 削除

```typescript
// 削除: CreateUserInputRequest, CreateUserInputResponse, ListUserInputsResponse
```

### 追加

```typescript
// Direction API
export interface CreateDirectionRequest {
  session_id: string;
  turn_number: number;
  content: string;  // 1-80文字
}

export interface CreateDirectionResponse {
  id: string;
  agent_id: string;
  session_id: string;
  turn_number: number;
  content: string;
  created_at: number;
}

// Feedback API
export interface CreateFeedbackRequest {
  session_id: string;
  content: string;  // 1-400文字
}

export interface CreateFeedbackResponse {
  id: string;
  agent_id: string;
  session_id: string;
  content: string;
  created_at: number;
}

export interface GetFeedbackResponse {
  id: string;
  agent_id: string;
  session_id: string;
  content: string;
  applied_at: number | null;
  created_at: number;
}

// SessionStrategy API（読み取り専用）
export interface GetSessionStrategyResponse {
  id: string;
  agent_id: string;
  session_id: string;
  strategy: string;
  created_at: number;
}

// Knowledge - 既存を更新
export interface CreateKnowledgeRequest {
  title: string;   // 1-30文字
  content: string; // 1-500文字
}
```

---

## 4. バックエンド Zod スキーマの変更

### 4.1 `apps/backend/src/schemas/user-inputs.ts` → 削除

このファイルは不要になる。

### 4.2 `apps/backend/src/schemas/directions.ts`（新規）

```typescript
export const CreateDirectionRequestSchema = z.object({
  session_id: z.string().uuid(),
  turn_number: z.number().int().min(1),
  content: z.string().min(1).max(80),
});

export const CreateDirectionResponseSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  session_id: z.string().uuid(),
  turn_number: z.number().int(),
  content: z.string(),
  created_at: z.number().int(),
});
```

### 4.3 `apps/backend/src/schemas/feedbacks.ts`（新規）

```typescript
export const CreateFeedbackRequestSchema = z.object({
  session_id: z.string().uuid(),
  content: z.string().min(1).max(400),
});

export const CreateFeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  session_id: z.string().uuid(),
  content: z.string(),
  created_at: z.number().int(),
});

export const GetFeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  session_id: z.string().uuid(),
  content: z.string(),
  applied_at: z.number().int().nullable(),
  created_at: z.number().int(),
});

export const SessionStrategyResponseSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  session_id: z.string().uuid(),
  strategy: z.string(),
  created_at: z.number().int(),
});
```

### 4.4 `apps/backend/src/schemas/knowledge.ts` 変更

```diff
- title: z.string().min(1).max(200)
+ title: z.string().min(1).max(30)
- content: z.string().min(1).max(10000)
+ content: z.string().min(1).max(500)
```

---

## 5. バックエンドルートの変更

### 5.1 `apps/backend/src/routes/user-inputs.ts` → 削除

### 5.2 `apps/backend/src/routes/directions.ts`（新規）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/agents/{agentId}/directions` | Direction 作成 |
| GET | `/agents/{agentId}/directions?session_id=xxx` | セッション別 Direction 一覧 |

**POST ハンドラのバリデーション**:
- エージェントの所有確認
- `session_id` のセッションが `active` であること
- `turn_number` が現在のターン以下であること（未来のターンには出せない）
- `content` が 80 文字以内

### 5.3 `apps/backend/src/routes/feedbacks.ts`（新規）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/agents/{agentId}/feedbacks` | Feedback 作成 |
| GET | `/agents/{agentId}/feedbacks?session_id=xxx` | セッション別 Feedback 取得 |
| PUT | `/agents/{agentId}/feedbacks/{id}` | Feedback 更新（次セッション開始前まで） |

**POST ハンドラのバリデーション**:
- エージェントの所有確認
- `session_id` のセッションが `completed` であること
- 同じ agent_id + session_id の組み合わせが存在しないこと（UNIQUE制約）
- そのエージェントが対象セッションの参加者であること
- `content` が 400 文字以内
- 次のセッションがまだ開始されていないこと（開始後は書けない）

### 5.4 `apps/backend/src/routes/strategies.ts`（新規）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/agents/{agentId}/strategies?session_id=xxx` | セッション戦略取得（ユーザー閲覧用） |

### 5.5 `apps/backend/src/routes/knowledge.ts` 変更

- POST ハンドラに**スロット上限チェック**を追加:
  ```typescript
  const count = await db.prepare(
    "SELECT COUNT(*) as count FROM knowledge_entries WHERE agent_id = ?"
  ).bind(agentId).first<{ count: number }>();
  if (count && count.count >= KNOWLEDGE_SLOTS_LIMIT) {
    return c.json({ error: "Knowledge slots full (max 10)" }, 409);
  }
  ```

---

## 6. `apps/backend/src/index.ts` 変更

### ルートマウントの変更

```diff
- import { userInputsRouter } from "./routes/user-inputs";
+ import { directionsRouter } from "./routes/directions";
+ import { feedbacksRouter } from "./routes/feedbacks";
+ import { strategiesRouter } from "./routes/strategies";

- app.route("/api", userInputsRouter);
+ app.route("/api", directionsRouter);
+ app.route("/api", feedbacksRouter);
+ app.route("/api", strategiesRouter);
```

### OpenAPI タグの変更

```diff
- { name: "User Inputs", description: "User directions and feedback for agents" },
+ { name: "Directions", description: "Real-time tactical directions during sessions" },
+ { name: "Feedbacks", description: "Post-session feedback and reflection" },
+ { name: "Strategies", description: "Session strategies generated from feedback" },
```

---

## 7. `apps/backend/src/config/constants.ts` 変更

```diff
- export const KNOWLEDGE_ENTRIES_LIMIT = 50;
- export const USER_INPUTS_LIMIT = 30;
+ export const KNOWLEDGE_SLOTS_LIMIT = 10;
+ export const DIRECTION_MAX_LENGTH = 80;
+ export const FEEDBACK_MAX_LENGTH = 400;
+ export const KNOWLEDGE_TITLE_MAX_LENGTH = 30;
+ export const KNOWLEDGE_CONTENT_MAX_LENGTH = 500;
```

LLM_TOKEN_LIMITS に追加:

```typescript
/** セッション戦略生成用 */
STRATEGY_GENERATION: 2000,
```

---

## 8. `apps/backend/src/queue/turn-consumer.ts` 変更

### 8.1 データ取得の変更

```diff
- const [agent, session, knowledge, userInputs, previousStatements] = await Promise.all([
+ const [agent, session, knowledge, direction, strategy, previousStatements] = await Promise.all([
    getAgent(env.DB, message.agentId),
    getSession(env.DB, message.sessionId),
    getAgentKnowledge(env.DB, message.agentId),
-   getRecentUserInputs(env.DB, message.agentId),
+   getDirectionForTurn(env.DB, message.agentId, message.sessionId, message.turnNumber),
+   getSessionStrategy(env.DB, message.agentId, message.sessionId),
    getPreviousStatements(env.DB, message.sessionId),
  ]);
```

### 8.2 新しいクエリ関数

```typescript
async function getDirectionForTurn(
  db: D1Database, agentId: string, sessionId: string, turnNumber: number
): Promise<Direction | null> {
  return await db.prepare(
    `SELECT id, content, created_at FROM directions
     WHERE agent_id = ? AND session_id = ? AND turn_number = ?
     LIMIT 1`
  ).bind(agentId, sessionId, turnNumber).first<Direction>();
}

async function getSessionStrategy(
  db: D1Database, agentId: string, sessionId: string
): Promise<SessionStrategy | null> {
  return await db.prepare(
    `SELECT id, strategy, created_at FROM session_strategies
     WHERE agent_id = ? AND session_id = ?
     LIMIT 1`
  ).bind(agentId, sessionId).first<SessionStrategy>();
}
```

### 8.3 Knowledge クエリの変更

```diff
- LIMIT 50
+ LIMIT 10
```

### 8.4 システムプロンプトの変更

```typescript
const systemPrompt = `あなたは「${agentWithPersona.name}」という名前の熟議エージェントです。

## あなたの人格
${JSON.stringify(agentWithPersona.persona, null, 2)}

${strategy ? `## 今回の熟議方針\n${strategy.strategy}\n` : ""}

## あなたの知識
${knowledge.map((k) => `- ${k.title}: ${k.content}`).join("\n") || "（特に知識はありません）"}

${direction ? `## ユーザーからの指示（このターンのみ）\n${direction.content}\n` : ""}

## 熟議のルール
1. 他者の意見を尊重し、建設的に議論する
2. 自分の考えを明確に述べる
3. 根拠を示す
4. 150-300文字程度で簡潔に発言する
${strategy ? "5. 今回の熟議方針を意識して発言する" : ""}
${direction ? "6. ユーザーの指示を今回の発言に反映する" : ""}`;
```

---

## 9. `apps/backend/src/queue/turn-completion.ts` 変更

### 9.1 ペルソナ更新ロジックの変更

`updateSingleAgentPersona` を変更:

```diff
- // Fetch unapplied inputs (user_inputs テーブルから)
- const unappliedInputs = await env.DB.prepare(
-   `SELECT id, input_type, content, created_at FROM user_inputs
-    WHERE agent_id = ? AND applied_at IS NULL ORDER BY created_at ASC`
- ).bind(agentId).all<UserInput>();
+ // Fetch unapplied feedbacks (feedbacks テーブルから)
+ const unappliedFeedbacks = await env.DB.prepare(
+   `SELECT id, content, session_id, created_at FROM feedbacks
+    WHERE agent_id = ? AND applied_at IS NULL ORDER BY created_at ASC`
+ ).bind(agentId).all<Feedback>();
```

applied_at の更新も `feedbacks` テーブルに変更。

### 9.2 `updateAgentPersona` 呼び出しの変更

```diff
- const newPersona = await updateAgentPersona(env, agent, unappliedInputs.results);
+ const newPersona = await updateAgentPersona(env, agent, unappliedFeedbacks.results);
```

---

## 10. `apps/backend/src/services/anthropic.ts` 変更

### 10.1 `updateAgentPersona` シグネチャ変更

```diff
  export async function updateAgentPersona(
    env: Bindings,
    agent: Agent,
-   userInputs: UserInput[],
+   feedbacks: Feedback[],
  ): Promise<AgentPersona> {
```

プロンプトの変更:

```diff
- ## ユーザーからの新しい方針・フィードバック
- ${userInputs.map((i) => `[${i.input_type}] ${i.content}`).join("\n")}
+ ## ユーザーからのフィードバック
+ ${feedbacks.map((f) => f.content).join("\n---\n")}
```

### 10.2 `generateSessionStrategy` 関数（新規追加）

```typescript
/**
 * Feedback + 前回の発言からセッション戦略を生成
 */
export async function generateSessionStrategy(
  env: Bindings,
  agent: Agent,
  feedback: Feedback,
  previousStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<string> {
  const agentWithPersona = parseAgentPersona(agent);

  const systemPrompt = "あなたはAI熟議エージェントの戦略立案を支援する専門家です。";

  // 前回のセッションでの自分の発言だけ抽出
  const myStatements = previousStatements
    .filter((s) => s.agent_id === agent.id)
    .map((s) => `ターン${s.turn_number}: ${s.content}`)
    .join("\n");

  const userPrompt = `## あなたの人格
${JSON.stringify(agentWithPersona.persona, null, 2)}

## 前回のセッションでのあなたの発言
${myStatements || "（前回の発言はありません）"}

## ユーザーからのフィードバック
${feedback.content}

## 指示
上記のフィードバックと前回の自分の発言を踏まえて、次回の熟議に臨む方針を100-200文字で簡潔にまとめてください。
自分がどういう姿勢で議論に参加し、何を意識すべきかを明確にしてください。
方針のテキストのみを出力してください。`;

  const response = await callAnthropicAPI(env, {
    model: LLM_MODEL,
    max_tokens: LLM_TOKEN_LIMITS.STRATEGY_GENERATION,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content;
}
```

---

## 11. `apps/backend/src/cron/master.ts` 変更

### セッション作成時にセッション戦略を生成

`createSessionForTopic` に戦略生成ステップを追加。
セッション開始時（Turn 1 作成直前）に、各参加エージェントについて:

1. そのエージェントの**最新の completed セッション**に対する Feedback を取得
2. Feedback がある場合、前回セッションの発言を取得
3. `generateSessionStrategy()` で戦略を生成
4. `session_strategies` テーブルに保存

```typescript
// セッション開始時: 各エージェントの戦略を生成
for (const agent of agents) {
  try {
    await generateAndSaveStrategy(env, agent, sessionId);
  } catch (error) {
    console.error(`Failed to generate strategy for agent ${agent.id}:`, error);
    // 戦略生成の失敗はセッション全体をブロックしない
  }
}
```

```typescript
async function generateAndSaveStrategy(
  env: Bindings, agent: Agent, sessionId: string
): Promise<void> {
  // 直近の completed セッションで、このエージェントが参加したものを取得
  const lastSession = await env.DB.prepare(`
    SELECT s.id FROM sessions s
    JOIN session_participants sp ON s.id = sp.session_id
    WHERE sp.agent_id = ? AND s.status = 'completed'
    ORDER BY s.completed_at DESC LIMIT 1
  `).bind(agent.id).first<{ id: string }>();

  if (!lastSession) return; // 初回参加の場合はスキップ

  // そのセッションに対する未適用 Feedback を取得
  const feedback = await env.DB.prepare(`
    SELECT id, content, session_id, created_at FROM feedbacks
    WHERE agent_id = ? AND session_id = ?
    LIMIT 1
  `).bind(agent.id, lastSession.id).first<Feedback>();

  if (!feedback) return; // Feedback がない場合はスキップ

  // 前回セッションでのそのエージェントの発言を取得
  const previousStatements = await env.DB.prepare(`
    SELECT s.id, s.agent_id, s.content, s.thinking_process, s.created_at,
           a.name as agent_name, t.turn_number
    FROM statements s
    JOIN agents a ON s.agent_id = a.id
    JOIN turns t ON s.turn_id = t.id
    WHERE t.session_id = ? AND s.agent_id = ?
    ORDER BY t.turn_number ASC
  `).bind(lastSession.id, agent.id).all();

  // 戦略を生成
  const strategy = await generateSessionStrategy(
    env, agent, feedback, previousStatements.results
  );

  // 保存
  const strategyId = generateUUID();
  const now = getCurrentTimestamp();
  await env.DB.prepare(`
    INSERT INTO session_strategies (id, agent_id, session_id, feedback_id, strategy, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(strategyId, agent.id, sessionId, feedback.id, strategy, now).run();
}
```

---

## 12. アクティブエージェント選択クエリの変更

**ファイル**: `apps/backend/src/cron/master.ts` の `selectActiveAgents()`

```diff
  SELECT DISTINCT a.id, a.user_id, a.name, a.persona, a.created_at, a.updated_at
  FROM agents a
- LEFT JOIN user_inputs ui ON a.id = ui.agent_id
- WHERE ui.created_at >= ?
+ LEFT JOIN feedbacks f ON a.id = f.agent_id
+ LEFT JOIN knowledge_entries ke ON a.id = ke.agent_id
+ WHERE f.created_at >= ?
+    OR ke.created_at >= ?
     OR a.created_at >= ?
  GROUP BY a.id
  ORDER BY RANDOM()
  LIMIT ?
```

---

## 13. フロントエンド変更

### 13.1 ルート変更

**ファイル**: `apps/frontend/app/routes.ts`

```diff
- route("agents/:id/direction", "routes/agents/direction.tsx"),
+ route("agents/:id/direction", "routes/agents/direction.tsx"),  // Direction用に変更
+ route("agents/:id/feedback", "routes/agents/feedback.tsx"),    // Feedback用に新規追加
```

### 13.2 `apps/frontend/app/routes/agents/direction.tsx` — 大幅変更

**変更内容**:
- セッション選択UI: アクティブなセッション一覧から選択
- ターン表示: 現在のターン番号を表示
- 入力フォーム: 80文字制限のシンプルなテキスト入力
- Direction 履歴: セッション+ターンごとの表示
- Feedback関連UI の削除（別ページへ移動）

### 13.3 `apps/frontend/app/routes/agents/feedback.tsx`（新規）

**表示内容**:
- 完了済みセッション一覧（Feedback対象）
- セッション選択 → そのセッションの議論サマリ表示
- Feedback入力フォーム（400文字制限）
- 既存 Feedback の編集（次セッション開始前まで）
- 生成された戦略の表示（`session_strategies` から取得）

### 13.4 `apps/frontend/app/routes/agents/detail.tsx` 変更

```diff
- <Link to={`/agents/${id}/direction`}>方針・フィードバック</Link>
+ <Link to={`/agents/${id}/direction`}>指示（Direction）</Link>
+ <Link to={`/agents/${id}/feedback`}>振り返り（Feedback）</Link>
```

### 13.5 `apps/frontend/app/routes/agents/knowledge.tsx` 変更

- 文字数制限の変更: title 30文字、content 500文字
- スロット数の表示: `3 / 10 スロット使用中`
- 上限到達時にフォームを非活性化

### 13.6 Orval 再生成

```bash
cd apps/frontend && pnpm orval
```

OpenAPI スキーマ変更後に自動生成ファイルを再生成する。

---

## 14. 実装順序

### Phase 1: DB + 型定義
1. マイグレーション `0002_refactor_inputs.sql` 作成
2. `types/database.ts` 型定義の変更
3. `types/api.ts` API型定義の変更
4. `config/constants.ts` 定数変更

### Phase 2: スキーマ + ルート
5. `schemas/user-inputs.ts` 削除
6. `schemas/directions.ts` 新規作成
7. `schemas/feedbacks.ts` 新規作成
8. `schemas/knowledge.ts` 文字数制限変更
9. `routes/user-inputs.ts` 削除
10. `routes/directions.ts` 新規作成
11. `routes/feedbacks.ts` 新規作成
12. `routes/strategies.ts` 新規作成
13. `routes/knowledge.ts` スロット制限追加
14. `index.ts` ルートマウント変更

### Phase 3: プロンプト + ロジック
15. `services/anthropic.ts` に `generateSessionStrategy` 追加 + `updateAgentPersona` 変更
16. `queue/turn-consumer.ts` システムプロンプト変更
17. `queue/turn-completion.ts` ペルソナ更新ロジック変更
18. `cron/master.ts` セッション開始時の戦略生成追加

### Phase 4: フロントエンド
19. `routes.ts` ルート追加
20. `routes/agents/direction.tsx` 大幅変更
21. `routes/agents/feedback.tsx` 新規作成
22. `routes/agents/knowledge.tsx` 制限変更
23. `routes/agents/detail.tsx` リンク変更
24. Orval 再生成

---

## 15. 削除対象ファイル一覧

| ファイル | 理由 |
|---------|------|
| `apps/backend/src/routes/user-inputs.ts` | `directions.ts` + `feedbacks.ts` に分離 |
| `apps/backend/src/schemas/user-inputs.ts` | `directions.ts` + `feedbacks.ts` に分離 |

---

## 16. 新しいプロンプト構造（最終形）

```
あなたは「{name}」という名前の熟議エージェントです。

## あなたの人格
{persona JSON}

## 今回の熟議方針                    ← session_strategies（あれば）
{strategy}

## あなたの知識                      ← knowledge_entries（最大10件）
- title: content

## ユーザーからの指示（このターンのみ）  ← directions（あれば）
{direction.content}

## 熟議のルール
1. 他者の意見を尊重し、建設的に議論する
2. 自分の考えを明確に述べる
3. 根拠を示す
4. 150-300文字程度で簡潔に発言する
5. 今回の熟議方針を意識して発言する   ← 方針がある場合のみ
6. ユーザーの指示を今回の発言に反映する ← 指示がある場合のみ
```

---

## 17. ゲームループ（最終形）

```
セッション完了
  ├→ ペルソナ更新（Feedbackで更新）
  └→ ユーザーが Feedback を書ける（1件、400字、次セッション開始まで）

次セッション開始（Master Cron）
  ├→ エージェント選出
  ├→ Feedbackがあるエージェント:
  │    前回の自分の発言 + Feedback → LLM → セッション戦略を生成
  │    → session_strategies に保存（ユーザーも閲覧可能）
  └→ Turn 1 作成

各ターン（Turn Cron → Queue Consumer）
  ├→ プロンプト構築:
  │    人格 + 戦略(あれば) + Knowledge(最大10件) + Direction(あれば)
  └→ 発言生成

ユーザーの操作:
  ├→ Direction: セッション中いつでも、80字の短い指示
  ├→ Knowledge: いつでも追加/削除、最大10スロット
  └→ Feedback: セッション完了後〜次セッション開始前、400字の振り返り
```
