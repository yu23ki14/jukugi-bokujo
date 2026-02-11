# 熟議牧場（Jukugi Bokujo）詳細設計書

## 目次
1. [データベーススキーマ設計](#1-データベーススキーマ設計)
2. [APIエンドポイント設計](#2-apiエンドポイント設計)
3. [Cron処理フロー](#3-cron処理フロー)
4. [LLM統合ポイント](#4-llm統合ポイント)
5. [RAG知識管理](#5-rag知識管理)
6. [フロントエンド構成](#6-フロントエンド構成)
7. [実装優先順位](#7-実装優先順位)

---

## 1. データベーススキーマ設計

### 1.1 テーブル設計

#### users テーブル
ユーザーアカウント情報（Clerk認証と連携）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  created_at INTEGER NOT NULL,      -- UNIX timestamp
  updated_at INTEGER NOT NULL
);
```

#### agents テーブル
ユーザーが所有するAI熟議エージェント

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- Clerkユーザー ID
  name TEXT NOT NULL,               -- エージェント名
  persona TEXT NOT NULL,            -- 人格記述（JSON）
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
```

**persona カラム（JSON構造）:**
```json
{
  "core_values": ["平等", "持続可能性"],
  "thinking_style": "論理的で慎重",
  "personality_traits": ["思慮深い", "公平性を重視"],
  "background": "環境問題に関心のある市民",
  "version": 1
}
```

#### topics テーブル
熟議のトピック

```sql
CREATE TABLE topics (
  id TEXT PRIMARY KEY,              -- UUID
  title TEXT NOT NULL,              -- トピック名
  description TEXT NOT NULL,        -- トピック詳細
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_topics_status ON topics(status);
```

#### sessions テーブル
熟議セッション（6時間ごとに自動生成）

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- UUID
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | completed | cancelled
  participant_count INTEGER NOT NULL DEFAULT 0, -- 参加エージェント数
  current_turn INTEGER NOT NULL DEFAULT 0,      -- 現在のターン番号
  max_turns INTEGER NOT NULL DEFAULT 10,        -- 最大ターン数（10ターン固定、約2.5時間）
  summary TEXT,                     -- セッション要約（完了時に生成）
  judge_verdict TEXT,               -- AI審判の最終判定（JSON）
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_topic_id ON sessions(topic_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
```

#### session_participants テーブル
セッション参加者（多対多関係）

```sql
CREATE TABLE session_participants (
  id TEXT PRIMARY KEY,              -- UUID
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(session_id, agent_id)
);

CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_agent_id ON session_participants(agent_id);
```

#### turns テーブル
熟議のターン（15分ごとに自動進行）

```sql
CREATE TABLE turns (
  id TEXT PRIMARY KEY,              -- UUID
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,     -- ターン番号（1から開始）
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, turn_number)
);

CREATE INDEX idx_turns_session_id ON turns(session_id);
CREATE INDEX idx_turns_status ON turns(status);
CREATE INDEX idx_turns_session_turn ON turns(session_id, turn_number);
```

#### statements テーブル
エージェントの発言

```sql
CREATE TABLE statements (
  id TEXT PRIMARY KEY,              -- UUID
  turn_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,            -- 発言内容
  thinking_process TEXT,            -- 思考プロセス（デバッグ用）
  created_at INTEGER NOT NULL,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_statements_turn_id ON statements(turn_id);
CREATE INDEX idx_statements_agent_id ON statements(agent_id);
CREATE INDEX idx_statements_created_at ON statements(created_at);
```

#### knowledge_entries テーブル
ユーザーがエージェントに追加する知識

```sql
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,              -- UUID
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,            -- 知識内容
  embedding_text TEXT,              -- embedding用テキスト（前処理済み）
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_agent_id ON knowledge_entries(agent_id);
CREATE INDEX idx_knowledge_created_at ON knowledge_entries(created_at);
```

#### user_inputs テーブル
ユーザーの方針入力（エージェントへの指示）

```sql
CREATE TABLE user_inputs (
  id TEXT PRIMARY KEY,              -- UUID
  agent_id TEXT NOT NULL,
  input_type TEXT NOT NULL,         -- direction | knowledge | feedback
  content TEXT NOT NULL,
  applied_at INTEGER,               -- 人格に反映された時刻
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_inputs_agent_id ON user_inputs(agent_id);
CREATE INDEX idx_user_inputs_type ON user_inputs(input_type);
CREATE INDEX idx_user_inputs_applied_at ON user_inputs(applied_at);
```

### 1.2 マイグレーション戦略

- 初期マイグレーション: `migrations/0001_initial.sql`
- 以降の変更は番号付きマイグレーションファイルで管理
- ローカル: `pnpm wrangler d1 execute DB --local --file=./migrations/XXXX.sql`
- 本番: `pnpm wrangler d1 execute DB --remote --file=./migrations/XXXX.sql`

---

## 2. APIエンドポイント設計

### 2.1 認証

全てのエンドポイント（`/api/*`）はClerk認証が必要。

```typescript
// Middleware
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'

app.use('/api/*', clerkMiddleware())

// 各ルートで認証情報取得
const auth = getAuth(c)
if (!auth?.userId) {
  return c.json({ error: 'Unauthorized' }, 401)
}
```

### 2.2 エンドポイント一覧

#### 2.2.1 エージェント管理

**POST /api/agents**
エージェント作成

```typescript
// Request
{
  name: string  // エージェント名
}

// Response
{
  id: string,
  user_id: string,
  name: string,
  persona: {
    core_values: string[],
    thinking_style: string,
    personality_traits: string[],
    background: string,
    version: number
  },
  created_at: number
}
```

処理フロー:
1. Clerk認証からuser_idを取得
2. usersテーブルにユーザーが存在しない場合は作成
3. LLMを使って初期人格（persona）を生成
4. agentsテーブルにレコード作成

**GET /api/agents**
自分のエージェント一覧取得

```typescript
// Response
{
  agents: [
    {
      id: string,
      name: string,
      persona: {...},
      created_at: number
    }
  ]
}
```

**GET /api/agents/:id**
エージェント詳細取得

**PATCH /api/agents/:id**
エージェント更新（名前変更など）

**DELETE /api/agents/:id**
エージェント削除

#### 2.2.2 知識管理

**POST /api/agents/:agentId/knowledge**
知識追加

```typescript
// Request
{
  title: string,
  content: string
}

// Response
{
  id: string,
  agent_id: string,
  title: string,
  content: string,
  created_at: number
}
```

**GET /api/agents/:agentId/knowledge**
知識一覧取得

**DELETE /api/knowledge/:id**
知識削除

#### 2.2.3 ユーザー入力

**POST /api/agents/:agentId/inputs**
方針・フィードバック入力

```typescript
// Request
{
  input_type: 'direction' | 'feedback',
  content: string
}

// Response
{
  id: string,
  agent_id: string,
  input_type: string,
  content: string,
  created_at: number
}
```

**GET /api/agents/:agentId/inputs**
入力履歴取得

#### 2.2.4 セッション

**GET /api/sessions**
セッション一覧取得（自分のエージェントが参加したもの）

```typescript
// Query params
?status=active|completed&limit=20&offset=0

// Response
{
  sessions: [
    {
      id: string,
      topic: { id: string, title: string },
      status: string,
      current_turn: number,
      max_turns: number,
      participant_count: number,
      started_at: number,
      completed_at?: number
    }
  ],
  total: number
}
```

**GET /api/sessions/:id**
セッション詳細取得

```typescript
// Response
{
  id: string,
  topic: {
    id: string,
    title: string,
    description: string
  },
  status: string,
  current_turn: number,
  max_turns: number,
  participants: [
    {
      agent_id: string,
      agent_name: string,
      user_id: string
    }
  ],
  summary?: string,
  judge_verdict?: {...},
  started_at: number,
  completed_at?: number
}
```

**GET /api/sessions/:id/turns**
セッションのターン一覧取得

```typescript
// Response
{
  turns: [
    {
      id: string,
      turn_number: number,
      status: string,
      statements: [
        {
          id: string,
          agent_id: string,
          agent_name: string,
          content: string,
          created_at: number
        }
      ],
      completed_at: number
    }
  ]
}
```

#### 2.2.5 トピック

**GET /api/topics**
アクティブなトピック一覧取得

**GET /api/topics/:id**
トピック詳細取得

#### 2.2.6 管理者用（将来拡張）

**POST /api/admin/topics**
トピック作成（管理者のみ）

**POST /api/admin/sessions/trigger**
セッション生成の手動トリガー（開発用）

### 2.3 エラーハンドリング

統一エラーレスポンス形式:

```typescript
{
  error: string,        // エラーメッセージ
  code?: string,        // エラーコード
  details?: any         // 詳細情報
}
```

主なHTTPステータスコード:
- 200: 成功
- 201: 作成成功
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限エラー
- 404: リソースが見つからない
- 500: サーバーエラー

---

## 3. Cron処理フロー

### 3.1 Master Cron（6時間ごと）

**トリガー**: `0 */6 * * *` (0:00, 6:00, 12:00, 18:00 UTC)

```typescript
async function masterCron(env: Bindings) {
  // 1. アクティブなトピックを取得
  const activeTopics = await getActiveTopics(env.DB)

  for (const topic of activeTopics) {
    // 2. 新しいセッションを作成
    const sessionId = crypto.randomUUID()
    await env.DB.prepare(`
      INSERT INTO sessions (id, topic_id, status, max_turns, created_at, updated_at)
      VALUES (?, ?, 'pending', 10, ?, ?)
    `).bind(sessionId, topic.id, Date.now(), Date.now()).run()

    // 3. 参加エージェントをランダムに選出（4-6体）
    // 条件: 3日以内にユーザー入力があるか、作成後3日以内のエージェント
    const participantCount = Math.floor(Math.random() * 3) + 4 // 4-6
    const agents = await selectActiveAgents(env.DB, participantCount)

    for (const agent of agents) {
      await env.DB.prepare(`
        INSERT INTO session_participants (id, session_id, agent_id, joined_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        sessionId,
        agent.id,
        Date.now()
      ).run()
    }

    // 4. セッションをactiveに変更
    await env.DB.prepare(`
      UPDATE sessions
      SET status = 'active',
          started_at = ?,
          participant_count = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), participantCount, Date.now(), sessionId).run()

    // 5. 初回ターン（turn 1）を作成
    await env.DB.prepare(`
      INSERT INTO turns (id, session_id, turn_number, status, created_at)
      VALUES (?, ?, 1, 'pending', ?)
    `).bind(crypto.randomUUID(), sessionId, Date.now()).run()

    console.log(`Created session ${sessionId} for topic ${topic.id}`)
  }
}

/**
 * アクティブなエージェントを選出
 * 条件: 3日以内にユーザー入力があるか、作成後3日以内のエージェント
 */
async function selectActiveAgents(db: D1Database, count: number): Promise<Agent[]> {
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000)

  const result = await db.prepare(`
    SELECT DISTINCT a.id, a.user_id, a.name, a.persona, a.created_at
    FROM agents a
    LEFT JOIN user_inputs ui ON a.id = ui.agent_id
    WHERE ui.created_at >= ?          -- 3日以内にユーザー入力あり
       OR a.created_at >= ?            -- または作成後3日以内
    GROUP BY a.id
    ORDER BY RANDOM()
    LIMIT ?
  `).bind(threeDaysAgo, threeDaysAgo, count).all()

  return result.results as Agent[]
}
```

### 3.2 Turn Cron（15分ごと）

**トリガー**: `*/15 * * * *`

```typescript
async function turnCron(env: Bindings) {
  // 1. processing中のターンを取得（失敗したものを再試行）
  const processingTurns = await getProcessingTurns(env.DB)

  // 2. pending中のターンを取得
  const pendingTurns = await getPendingTurns(env.DB)

  const turnsToProcess = [...processingTurns, ...pendingTurns]

  for (const turn of turnsToProcess) {
    try {
      // 3. ターンをprocessingに更新
      await updateTurnStatus(env.DB, turn.id, 'processing')

      // 4. セッション情報とこれまでの発言履歴を取得
      const session = await getSession(env.DB, turn.session_id)
      const previousStatements = await getPreviousStatements(env.DB, turn.session_id)

      // 5. 参加エージェントごとに並列で発言生成
      const participants = await getSessionParticipants(env.DB, turn.session_id)

      const statementPromises = participants.map(async (participant) => {
        // エージェントの人格、知識、ユーザー入力を取得
        const agent = await getAgent(env.DB, participant.agent_id)
        const knowledge = await getAgentKnowledge(env.DB, participant.agent_id)
        const userInputs = await getRecentUserInputs(env.DB, participant.agent_id)

        // LLMで発言生成
        const statement = await generateStatement(
          env,
          agent,
          knowledge,
          userInputs,
          session,
          previousStatements,
          turn.turn_number
        )

        // 発言を保存
        await env.DB.prepare(`
          INSERT INTO statements (id, turn_id, agent_id, content, thinking_process, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          turn.id,
          participant.agent_id,
          statement.content,
          statement.thinking_process,
          Date.now()
        ).run()
      })

      await Promise.all(statementPromises)

      // 6. ターンをcompletedに更新
      await env.DB.prepare(`
        UPDATE turns
        SET status = 'completed', completed_at = ?
        WHERE id = ?
      `).bind(Date.now(), turn.id).run()

      // 7. セッションのcurrent_turnを更新
      await env.DB.prepare(`
        UPDATE sessions
        SET current_turn = ?, updated_at = ?
        WHERE id = ?
      `).bind(turn.turn_number, Date.now(), turn.session_id).run()

      // 8. 最終ターンの場合、セッションを完了
      if (turn.turn_number >= session.max_turns) {
        await completeSession(env, session)
      } else {
        // 9. 次のターンを作成
        await env.DB.prepare(`
          INSERT INTO turns (id, session_id, turn_number, status, created_at)
          VALUES (?, ?, ?, 'pending', ?)
        `).bind(
          crypto.randomUUID(),
          turn.session_id,
          turn.turn_number + 1,
          Date.now()
        ).run()
      }

    } catch (error) {
      console.error(`Failed to process turn ${turn.id}:`, error)
      await updateTurnStatus(env.DB, turn.id, 'failed')
    }
  }
}

async function completeSession(env: Bindings, session: Session) {
  // 全発言を取得
  const allStatements = await getAllStatements(env.DB, session.id)

  // LLMでセッション要約を生成
  const summary = await generateSessionSummary(env, session, allStatements)

  // AI審判の判定を生成
  const judgeVerdict = await generateJudgeVerdict(env, session, allStatements)

  // セッションを完了状態に更新
  await env.DB.prepare(`
    UPDATE sessions
    SET status = 'completed',
        summary = ?,
        judge_verdict = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    summary,
    JSON.stringify(judgeVerdict),
    Date.now(),
    Date.now(),
    session.id
  ).run()

  // 参加エージェントの人格を更新（ユーザー入力を反映）
  await updateAgentPersonas(env, session.id)
}
```

### 3.3 エラーリカバリー戦略

1. **Turn失敗時**: ステータスを`failed`に更新し、次回のTurn Cronで再試行しない
2. **LLMタイムアウト**: 30秒でタイムアウト、エラーログを記録
3. **データベースエラー**: トランザクションは使えないため、各ステップで冪等性を確保
4. **部分的な失敗**: 一部のエージェントの発言生成が失敗しても、成功した発言は保存

---

## 4. LLM統合ポイント

### 4.1 使用モデル

- **メインモデル**: Claude 3.5 Sonnet (Anthropic API)
- **用途別の使い分け**:
  - エージェント発言生成: Claude 3.5 Sonnet
  - セッション要約: Claude 3.5 Sonnet
  - AI審判: Claude 3.5 Sonnet
  - 初期人格生成: Claude 3.5 Sonnet

### 4.2 エージェント発言生成プロンプト

```typescript
async function generateStatement(
  env: Bindings,
  agent: Agent,
  knowledge: KnowledgeEntry[],
  userInputs: UserInput[],
  session: Session,
  previousStatements: Statement[],
  currentTurn: number
): Promise<{ content: string; thinking_process: string }> {

  const systemPrompt = `あなたは「${agent.name}」という名前の熟議エージェントです。

## あなたの人格
${JSON.stringify(agent.persona, null, 2)}

## あなたの知識
${knowledge.map(k => `- ${k.title}: ${k.content}`).join('\n')}

## ユーザーからの方針・フィードバック
${userInputs.map(i => `[${i.input_type}] ${i.content}`).join('\n')}

## 熟議のルール
1. 他者の意見を尊重し、建設的に議論する
2. 自分の考えを明確に述べる
3. 根拠を示す
4. 150-300文字程度で簡潔に発言する
5. ユーザーの方針を徐々に反映させる

あなたの発言は他の参加者と共に読まれ、ユーザーに観察されます。`

  const userPrompt = `## トピック
タイトル: ${session.topic.title}
説明: ${session.topic.description}

## これまでの議論（ターン ${currentTurn - 1} まで）
${formatPreviousStatements(previousStatements)}

## あなたの番です（ターン ${currentTurn}）

上記の議論を踏まえて、あなたの意見を述べてください。

まず<thinking>タグ内で思考プロセスを記述し、その後に発言を出力してください。

<thinking>
[ここに思考プロセス]
</thinking>

[ここに発言]`

  const response = await callAnthropicAPI(env, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  // レスポンスをパース
  const thinkingMatch = response.content.match(/<thinking>([\s\S]*?)<\/thinking>/)
  const thinking_process = thinkingMatch ? thinkingMatch[1].trim() : ''
  const content = response.content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()

  return { content, thinking_process }
}
```

### 4.3 AI審判プロンプト

```typescript
async function generateJudgeVerdict(
  env: Bindings,
  session: Session,
  allStatements: Statement[]
): Promise<JudgeVerdict> {

  const systemPrompt = `あなたは公平な審判AIです。熟議セッションの内容を評価し、判定を下します。`

  const userPrompt = `## トピック
${session.topic.title}
${session.topic.description}

## 議論全体
${formatAllStatements(allStatements)}

## 評価項目
以下の観点から評価してください：

1. 議論の質（1-10点）
2. 参加者の協調性（1-10点）
3. 結論への収束度（1-10点）
4. 新しい視点の提示（1-10点）

JSON形式で以下の構造で回答してください：
{
  "quality_score": number,
  "cooperation_score": number,
  "convergence_score": number,
  "novelty_score": number,
  "summary": "評価のサマリー",
  "highlights": ["注目すべき発言1", "注目すべき発言2"],
  "consensus": "到達したコンセンサス（あれば）"
}`

  const response = await callAnthropicAPI(env, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  return JSON.parse(response.content)
}
```

### 4.4 セッション要約生成プロンプト

```typescript
async function generateSessionSummary(
  env: Bindings,
  session: Session,
  allStatements: Statement[]
): Promise<string> {

  const systemPrompt = `あなたは熟議セッションの要約を作成する専門家です。`

  const userPrompt = `## トピック
${session.topic.title}

## 議論全体（${session.current_turn}ターン）
${formatAllStatements(allStatements)}

## 指示
この熟議セッションを200-400文字で要約してください。
- 主要な論点
- 議論の流れ
- 参加者の立場の変化
- 到達した結論や合意点

を含めてください。`

  const response = await callAnthropicAPI(env, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  return response.content
}
```

### 4.5 初期人格生成プロンプト

```typescript
async function generateInitialPersona(
  env: Bindings,
  agentName: string
): Promise<AgentPersona> {

  const systemPrompt = `あなたはAI熟議エージェントの人格を生成する専門家です。`

  const userPrompt = `「${agentName}」という名前の熟議エージェントの初期人格を生成してください。

以下のJSON形式で出力してください：
{
  "core_values": ["価値観1", "価値観2", "価値観3"],
  "thinking_style": "思考スタイルの説明",
  "personality_traits": ["特性1", "特性2", "特性3"],
  "background": "背景や立場の説明",
  "version": 1
}

人格は多様性があり、建設的な議論ができるように設計してください。`

  const response = await callAnthropicAPI(env, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  return JSON.parse(response.content)
}
```

### 4.6 Anthropic API呼び出し

```typescript
interface AnthropicRequest {
  model: string
  max_tokens: number
  system?: string
  messages: { role: string; content: string }[]
}

async function callAnthropicAPI(
  env: Bindings,
  request: AnthropicRequest
): Promise<{ content: string }> {

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    content: data.content[0].text
  }
}
```

---

## 5. RAG知識管理

### 5.1 Embedding戦略

**MVP版: シンプルな全文検索**

D1はベクトル検索をネイティブサポートしていないため、MVP版では以下のアプローチを採用:

1. **知識の取得**: エージェントの全knowledge_entriesを取得
2. **コンテキスト注入**: LLMプロンプトに全知識を含める（上限100エントリー程度）
3. **将来の拡張**: Cloudflare Vectorizeを使用したベクトル検索

```typescript
async function getAgentKnowledge(
  db: D1Database,
  agentId: string
): Promise<KnowledgeEntry[]> {
  const result = await db.prepare(`
    SELECT id, title, content, created_at
    FROM knowledge_entries
    WHERE agent_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(agentId).all()

  return result.results as KnowledgeEntry[]
}
```

### 5.2 将来の拡張: Cloudflare Vectorize

```typescript
// 将来実装時のコード例
interface VectorizeBinding {
  insert(vectors: { id: string; values: number[]; metadata?: any }[]): Promise<void>
  query(queryVector: number[], options?: { topK?: number }): Promise<VectorizeMatch[]>
}

type Bindings = {
  DB: D1Database
  VECTORIZE: VectorizeBinding
  ANTHROPIC_API_KEY: string
}

async function addKnowledgeWithEmbedding(
  env: Bindings,
  agentId: string,
  title: string,
  content: string
): Promise<void> {
  const knowledgeId = crypto.randomUUID()

  // 1. D1に保存
  await env.DB.prepare(`
    INSERT INTO knowledge_entries (id, agent_id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(knowledgeId, agentId, title, content, Date.now(), Date.now()).run()

  // 2. Embeddingを生成（Cloudflare AI Workers or OpenAI Embeddings）
  const embedding = await generateEmbedding(env, content)

  // 3. Vectorizeに保存
  await env.VECTORIZE.insert([{
    id: knowledgeId,
    values: embedding,
    metadata: { agent_id: agentId, title }
  }])
}

async function searchRelevantKnowledge(
  env: Bindings,
  agentId: string,
  query: string,
  topK: number = 5
): Promise<KnowledgeEntry[]> {
  // 1. クエリのembeddingを生成
  const queryEmbedding = await generateEmbedding(env, query)

  // 2. Vectorizeで検索
  const matches = await env.VECTORIZE.query(queryEmbedding, { topK })

  // 3. マッチしたknowledge_entriesを取得
  const knowledgeIds = matches
    .filter(m => m.metadata.agent_id === agentId)
    .map(m => m.id)

  const placeholders = knowledgeIds.map(() => '?').join(',')
  const result = await env.DB.prepare(`
    SELECT id, title, content, created_at
    FROM knowledge_entries
    WHERE id IN (${placeholders})
  `).bind(...knowledgeIds).all()

  return result.results as KnowledgeEntry[]
}
```

### 5.3 ユーザー入力の人格反映

ユーザーの方針・フィードバックは以下のタイミングで人格に反映:

1. **リアルタイム反映**: 発言生成時にプロンプトに含める
2. **定期的な人格更新**: セッション完了時に人格JSONを更新

```typescript
async function updateAgentPersona(
  env: Bindings,
  agentId: string,
  userInputs: UserInput[]
): Promise<void> {
  const agent = await getAgent(env.DB, agentId)

  const systemPrompt = `あなたはAIエージェントの人格を更新する専門家です。`

  const userPrompt = `## 現在の人格
${JSON.stringify(agent.persona, null, 2)}

## ユーザーからの新しい方針・フィードバック
${userInputs.map(i => `[${i.input_type}] ${i.content}`).join('\n')}

## 指示
上記の人格に、ユーザーの方針・フィードバックを反映した新しい人格を生成してください。
既存の人格を尊重しつつ、徐々にユーザーの意向を反映させてください。

JSON形式で出力してください：
{
  "core_values": [...],
  "thinking_style": "...",
  "personality_traits": [...],
  "background": "...",
  "version": ${agent.persona.version + 1}
}`

  const response = await callAnthropicAPI(env, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  const newPersona = JSON.parse(response.content)

  await env.DB.prepare(`
    UPDATE agents
    SET persona = ?, updated_at = ?
    WHERE id = ?
  `).bind(JSON.stringify(newPersona), Date.now(), agentId).run()

  // ユーザー入力をappliedとしてマーク
  for (const input of userInputs) {
    await env.DB.prepare(`
      UPDATE user_inputs
      SET applied_at = ?
      WHERE id = ?
    `).bind(Date.now(), input.id).run()
  }
}
```

---

## 6. フロントエンド構成

### 6.1 ページ構造（React Router v7）

```
/                              # ランディングページ
/signin                        # サインイン
/signup                        # サインアップ
/dashboard                     # ダッシュボード（要認証）
/agents                        # エージェント一覧（要認証）
/agents/new                    # エージェント作成（要認証）
/agents/:id                    # エージェント詳細（要認証）
/agents/:id/knowledge          # 知識管理（要認証）
/agents/:id/direction          # 方針入力（要認証）
/sessions                      # セッション一覧（要認証）
/sessions/:id                  # セッション詳細（要認証）
/topics                        # トピック一覧
/topics/:id                    # トピック詳細
```

### 6.2 ルート定義（app/routes.ts）

```typescript
import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  route('signin', 'routes/auth/signin.tsx'),
  route('signup', 'routes/auth/signup.tsx'),

  route('dashboard', 'routes/dashboard.tsx'),

  route('agents', 'routes/agents/index.tsx'),
  route('agents/new', 'routes/agents/new.tsx'),
  route('agents/:id', 'routes/agents/detail.tsx'),
  route('agents/:id/knowledge', 'routes/agents/knowledge.tsx'),
  route('agents/:id/direction', 'routes/agents/direction.tsx'),

  route('sessions', 'routes/sessions/index.tsx'),
  route('sessions/:id', 'routes/sessions/detail.tsx'),

  route('topics', 'routes/topics/index.tsx'),
  route('topics/:id', 'routes/topics/detail.tsx'),
] satisfies RouteConfig
```

### 6.3 主要コンポーネント設計

#### 6.3.1 AgentCard

```typescript
// app/components/AgentCard.tsx
interface AgentCardProps {
  agent: {
    id: string
    name: string
    persona: AgentPersona
    created_at: number
  }
  onClick?: () => void
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div
      className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition"
      onClick={onClick}
    >
      <h3 className="font-bold text-lg">{agent.name}</h3>
      <div className="mt-2 text-sm text-gray-600">
        <p>思考スタイル: {agent.persona.thinking_style}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {agent.persona.core_values.map(value => (
            <span key={value} className="px-2 py-1 bg-blue-100 rounded text-xs">
              {value}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        作成日: {new Date(agent.created_at).toLocaleDateString('ja-JP')}
      </p>
    </div>
  )
}
```

#### 6.3.2 SessionTimeline

```typescript
// app/components/SessionTimeline.tsx
interface SessionTimelineProps {
  turns: Turn[]
}

export function SessionTimeline({ turns }: SessionTimelineProps) {
  return (
    <div className="space-y-6">
      {turns.map(turn => (
        <div key={turn.id} className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-semibold">ターン {turn.turn_number}</h4>
          <div className="mt-2 space-y-3">
            {turn.statements.map(statement => (
              <div key={statement.id} className="bg-gray-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{statement.agent_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(statement.created_at).toLocaleTimeString('ja-JP')}
                  </span>
                </div>
                <p className="text-sm">{statement.content}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 6.3.3 KnowledgeList

```typescript
// app/components/KnowledgeList.tsx
interface KnowledgeListProps {
  knowledge: KnowledgeEntry[]
  onDelete: (id: string) => void
}

export function KnowledgeList({ knowledge, onDelete }: KnowledgeListProps) {
  return (
    <div className="space-y-2">
      {knowledge.map(entry => (
        <div key={entry.id} className="border rounded p-3 flex justify-between">
          <div className="flex-1">
            <h4 className="font-semibold">{entry.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{entry.content}</p>
          </div>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-red-500 hover:text-red-700"
          >
            削除
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 6.4 状態管理

MVP版ではReact Routerのloader/actionを活用し、グローバル状態管理ライブラリは不使用。

```typescript
// app/routes/agents/detail.tsx
import { useLoaderData } from 'react-router'
import type { Route } from './+types/detail'

export async function loader({ params, request }: Route.LoaderArgs) {
  const response = await fetch(`${API_URL}/api/agents/${params.id}`, {
    headers: {
      Authorization: `Bearer ${await getClerkToken(request)}`
    }
  })

  if (!response.ok) {
    throw new Response('Not Found', { status: 404 })
  }

  return response.json()
}

export default function AgentDetail() {
  const agent = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>{agent.name}</h1>
      {/* ... */}
    </div>
  )
}
```

### 6.5 API通信

```typescript
// app/lib/api.ts
export class ApiClient {
  constructor(private baseUrl: string, private getToken: () => Promise<string>) {}

  async get<T>(path: string): Promise<T> {
    const token = await this.getToken()
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
  }

  async post<T>(path: string, data: any): Promise<T> {
    const token = await this.getToken()
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
  }

  // patch, delete も同様に実装
}
```

---

## 7. 実装優先順位

### Phase 1: 基盤構築（Week 1）

1. **データベーススキーマ実装**
   - マイグレーションファイル作成
   - ローカル・本番DBセットアップ

2. **基本API実装**
   - 認証ミドルウェア（Clerk統合）
   - エージェントCRUD
   - エラーハンドリング

3. **フロントエンド基盤**
   - ルート設定
   - 認証フロー（Clerk）
   - APIクライアント

### Phase 2: コア機能実装（Week 2）

4. **LLM統合**
   - Anthropic API呼び出し
   - 初期人格生成
   - 発言生成プロンプト

5. **セッション管理API**
   - セッション取得
   - ターン取得
   - トピック管理

6. **フロントエンドUI**
   - エージェント一覧・詳細
   - ダッシュボード
   - セッション閲覧

### Phase 3: 自動化実装（Week 3）

7. **Master Cron**
   - セッション自動生成
   - 参加者ランダム選出
   - 初回ターン作成

8. **Turn Cron**
   - ターン進行ロジック
   - 並列発言生成
   - セッション完了処理

9. **AI審判・要約**
   - セッション要約生成
   - AI審判判定
   - 結果保存

### Phase 4: 育成機能（Week 4）

10. **知識管理**
    - 知識追加API
    - 知識表示UI
    - プロンプトへの統合

11. **ユーザー入力**
    - 方針入力API/UI
    - フィードバック入力
    - 人格更新ロジック

12. **人格進化**
    - 定期的な人格更新
    - 履歴表示
    - バージョン管理

### Phase 5: 完成・テスト（Week 5）

13. **統合テスト**
    - E2Eテスト
    - Cron処理テスト
    - エラーケーステスト

14. **UI/UX改善**
    - レスポンシブ対応
    - ローディング状態
    - エラー表示

15. **デプロイ準備**
    - 本番環境設定
    - モニタリング
    - ドキュメント整備

---

## 8. 技術的懸念点と代替案

### 8.1 Cloudflare Workers実行時間制限

**懸念**: CPU時間10ms制限により、複数エージェントの発言を同期生成できない可能性

**対策**:
1. 発言生成を並列化（Promise.all）
2. 必要に応じてDurable Objectsを使用して長時間処理を実現
3. 最悪の場合、外部Queue（Cloudflare Queue）で非同期処理

### 8.2 D1のトランザクションサポート

**懸念**: D1は限定的なトランザクションサポート、複雑な一貫性保証が難しい

**対策**:
1. 各ステップで冪等性を確保
2. ステータス管理で部分的な失敗をリカバリー
3. 楽観的ロック（version カラム）で競合検出

### 8.3 LLMコスト

**懸念**: 頻繁な発言生成でAPI費用が高騰する可能性

**対策**:
1. セッション数・参加者数を制限（初期はトピック1つ、セッション4つ/日）
2. キャッシュ戦略（類似プロンプトの再利用）
3. ユーザー数に応じたスケール調整

### 8.4 RAG実装の複雑さ

**懸念**: MVP版のシンプルな全文検索では知識が多いと性能低下

**対策**:
1. MVP版: 知識100件上限、全件取得
2. Phase 2: Cloudflare Vectorizeを統合
3. プロンプト最適化でコンテキスト長を節約

### 8.5 リアルタイム更新

**懸念**: SPA構成でセッション進行をリアルタイム表示する必要がある

**対策**:
1. MVP版: ポーリング（15秒ごと）
2. 将来: Cloudflare Durable Objects + WebSocketでリアルタイム通信

---

## 9. 実装時の注意点

### 9.1 セキュリティ

- Clerk認証の徹底: 全APIエンドポイントで認証チェック
- SQLインジェクション対策: D1のプリペアドステートメント使用
- XSS対策: Reactのデフォルト挙動を信頼、dangerouslySetInnerHTML禁止
- CORS設定: フロントエンドのオリジンのみ許可

### 9.2 パフォーマンス

- インデックス作成: 頻繁に検索されるカラムにインデックス
- N+1問題回避: JOINまたは一括取得を使用
- LLM呼び出し並列化: Promise.allで複数エージェントを同時処理
- キャッシュ: Cloudflare Cache APIで静的コンテンツをキャッシュ

### 9.3 エラーハンドリング

- Cronエラーログ: console.errorで記録、将来的にSentryなど
- LLMタイムアウト: 30秒でタイムアウト、リトライなし
- ユーザーフィードバック: API エラーは明確なメッセージで表示

### 9.4 データ整合性

- ステータス遷移の明確化: pending → processing → completed/failed
- 孤立レコード防止: ON DELETE CASCADE で関連レコードを削除
- バージョン管理: persona.version で人格の変更履歴を追跡

---

## 10. 次のステップ

設計完了後の実装ステップ:

1. **マイグレーションファイル作成**: `apps/backend/migrations/0001_initial.sql`
2. **型定義**: `apps/backend/src/types/` にDBモデル定義
3. **API実装**: `apps/backend/src/routes/` にエンドポイント実装
4. **Cron実装**: `apps/backend/src/cron/` にCronロジック実装
5. **フロントエンド実装**: `apps/frontend/app/routes/` にページ実装

各Phaseの完了ごとにデプロイ・テストを行い、早期にフィードバックを得る。
