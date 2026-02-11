# セッションモードの追加手順

新しい熟議モード（例: ディベート、ソクラテス道場など）を追加する手順。

## 概要

セッションモードは **Strategy Pattern** で実装されている。
各モードは `SessionModeStrategy` インターフェースを実装し、レジストリに登録するだけで動作する。

```
apps/backend/src/config/session-modes/
├── types.ts              # SessionModeStrategy インターフェース定義
├── registry.ts           # モード登録・取得
├── double-diamond.ts     # ダブルダイアモンド（既存）
└── free-discussion.ts    # 自由放牧討論
```

## 手順

### 1. Strategy ファイルを作成する

`apps/backend/src/config/session-modes/<mode-name>.ts` を作成。

```typescript
import type { PhaseConfig, SessionModeStrategy } from "./types";

export const myModeStrategy: SessionModeStrategy = {
  modeId: "my_mode",           // sessions.mode カラムに格納される値
  modeName: "マイモード",        // UI表示用の名前
  description: "モードの説明文",
  defaultMaxTurns: 10,         // このモードのデフォルトターン数

  getPhaseConfig(turnNumber: number, maxTurns: number): PhaseConfig {
    // turnNumber と maxTurns からフェーズ設定を返す
    return {
      phase: "main",            // フェーズ識別子（自由に定義）
      label: "メインフェーズ",
      roleFraming: "あなたは〜の段階にいます。",
      instruction: "〜してください。",
      constraints: [
        { rule: "ルール", reason: "理由" },
      ],
      charMin: 200,
      charMax: 400,
    };
  },

  buildPhasePromptSection(
    config: PhaseConfig,
    turnNumber: number,
    maxTurns: number,
  ): string {
    // システムプロンプトに注入するフェーズ説明を組み立てる
    const constraintLines = config.constraints
      .map((c) => `- ${c.rule} — ${c.reason}`)
      .join("\n");

    return `## 現在のフェーズ: ${config.label}（ターン ${turnNumber}/${maxTurns}）
${config.roleFraming}

### このターンで意識すること
${config.instruction}

### 制約
${constraintLines}

文字数目安: ${config.charMin}-${config.charMax}文字`;
  },

  getUserPromptSuffix(turnNumber: number, maxTurns: number): string {
    // ユーザープロンプト末尾に追加する指示（不要なら空文字）
    return "";
  },
};
```

### 2. レジストリに登録する

`apps/backend/src/config/session-modes/registry.ts` を編集:

```typescript
import { myModeStrategy } from "./my-mode";

const MODE_REGISTRY: Record<string, SessionModeStrategy> = {
  double_diamond: doubleDiamondStrategy,
  free_discussion: freeDiscussionStrategy,
  my_mode: myModeStrategy,                // 追加
};
```

### 3. SessionMode 型に追加する

`apps/backend/src/types/database.ts`:

```typescript
export type SessionMode = "double_diamond" | "free_discussion" | "my_mode";
```

### 4. API スキーマに追加する

`apps/backend/src/schemas/sessions.ts`:

```typescript
export const SessionModeEnum = z.enum([
  "double_diamond",
  "free_discussion",
  "my_mode",          // 追加
]);
```

### 5. typecheck と lint を通す

```bash
pnpm typecheck
pnpm biome:check
```

## これで完了

`turn-consumer.ts` は `getModeStrategy(session.mode)` でモードを自動判定するため、
上記4箇所の変更だけで新モードが動作する。

## SessionModeStrategy インターフェース

| メソッド | 役割 |
|---------|------|
| `getPhaseConfig(turn, maxTurns)` | ターン番号からフェーズ設定を返す |
| `buildPhasePromptSection(config, turn, maxTurns)` | システムプロンプトに注入するフェーズ説明を生成 |
| `getUserPromptSuffix(turn, maxTurns)` | ユーザープロンプト末尾に追加する指示文 |

## フェーズ設計のコツ

- `phase`: 文字列なので自由に定義できる（`"opening"`, `"rebuttal"` など）
- `constraints`: ルールと理由のペアで記述。LLMがルールに従いやすくなる
- `charMin`/`charMax`: 文字数の目安。厳密な制限ではないが、LLMがおおよそ従う
- ターン進行率 `turnNumber / maxTurns` でフェーズを切り替えると、ターン数が変わっても比例配分される

## DB について

- `sessions.mode`: モード識別子（`TEXT NOT NULL DEFAULT 'double_diamond'`）
- `sessions.mode_config`: モード固有の設定（`TEXT`, JSON）。現在未使用だが将来のモード（チーム分けなど）で活用可能
