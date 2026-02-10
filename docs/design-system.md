# 熟議牧場 UIデザインシステム設計書

## 概要

shadcn/ui をベースに、熟議牧場専用のデザインシステムを構築する。
各ページに散在する Tailwind クラスの直書きを共通コンポーネントに集約し、UIの一貫性・保守性・開発速度を向上させる。

### 技術スタック

| レイヤー | 技術 |
|---|---|
| プリミティブUI | shadcn/ui (Radix UI ベース) |
| スタイリング | Tailwind CSS v4 + CSS Variables (OKLCH) |
| アイコン | Hugeicons (`@hugeicons/react`) |
| フォント | Noto Sans (Google Fonts) |
| ユーティリティ | `cn()` (`clsx` + `tailwind-merge`) |

### テーマ設定

- **スタイル**: Maia (Radix ベース)
- **プライマリカラー**: グリーン (`oklch(0.648 0.2 131.684)`)
- **ベースカラー**: Neutral
- **角丸**: Large (`0.875rem`)
- **ダークモード**: `.dark` クラスによる切替対応済み

### ディレクトリ構成

```
apps/frontend/app/
├── components/
│   ├── ui/                  # shadcn コンポーネント (自動生成)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── alert.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── design-system/       # 熟議牧場ラッパーコンポーネント
│   │   ├── Spinner.tsx
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   ├── BackLink.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── InfoAlert.tsx
│   │   ├── FormField.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FilterTabs.tsx
│   │   ├── Pagination.tsx
│   │   └── ScoreCard.tsx
│   ├── AgentCard.tsx        # 既存 (リファクタ対象)
│   ├── SessionTimeline.tsx  # 既存 (リファクタ対象)
│   └── ...
├── lib/
│   └── utils.ts             # cn() ユーティリティ
└── ...
```

---

## コンポーネント設計

### Phase 1: 基盤コンポーネント (shadcn 直接利用)

shadcn CLI で追加し、そのまま利用するコンポーネント群。
全ページで即座に効果が出る。

#### 1.1 Button

```bash
pnpm dlx shadcn@latest add button
```

**バリアント対応表** (shadcn 標準):

| バリアント | 用途 | 現状の置換対象 |
|---|---|---|
| `default` | メインアクション (作成, 送信) | `bg-blue-600 text-white hover:bg-blue-700` |
| `secondary` | サブアクション (キャンセル, フィルター非選択) | `bg-gray-200 text-gray-700 hover:bg-gray-300` |
| `destructive` | 削除系 | `bg-red-600 text-white hover:bg-red-700` |
| `outline` | 枠線ボタン (ホーム CTA) | `bg-white border-2 border-gray-300` |
| `ghost` | ナビゲーションリンク | `text-blue-600 hover:bg-blue-50` |
| `link` | テキストリンク風 | `text-blue-600 hover:text-blue-800` |

**サイズ対応表** (shadcn 標準):

| サイズ | 用途 |
|---|---|
| `sm` | テーブル内、インラインアクション |
| `default` | フォーム送信、一般アクション |
| `lg` | ホーム CTA、ダッシュボードクイックアクション |

**使用例**:

```tsx
import { Button } from "~/components/ui/button"

// Before
<button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
  作成する
</button>

// After
<Button disabled={isPending}>作成する</Button>
```

#### 1.2 Card

```bash
pnpm dlx shadcn@latest add card
```

**現状の置換対象**: `bg-white rounded-lg shadow p-6 hover:shadow-lg transition` (15箇所以上)

**サブコンポーネント**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**使用例**:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card"

// Before
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-2xl font-bold mb-4">セクションタイトル</h2>
  <p>コンテンツ</p>
</div>

// After
<Card>
  <CardHeader>
    <CardTitle>セクションタイトル</CardTitle>
  </CardHeader>
  <CardContent>
    <p>コンテンツ</p>
  </CardContent>
</Card>
```

#### 1.3 Badge

```bash
pnpm dlx shadcn@latest add badge
```

**現状の置換対象**: `px-2 py-1 bg-{color}-100 text-{color}-700 rounded text-xs font-semibold` (20箇所以上)

**shadcn 標準バリアント**: `default`, `secondary`, `destructive`, `outline`

#### 1.4 Alert

```bash
pnpm dlx shadcn@latest add alert
```

**現状の置換対象**: `bg-{color}-50 border-l-4 border-{color}-400 p-4` (8箇所以上)

#### 1.5 Input / Textarea / Label

```bash
pnpm dlx shadcn@latest add input textarea label
```

**現状の置換対象**: `w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500`

#### 1.6 AlertDialog

```bash
pnpm dlx shadcn@latest add alert-dialog
```

**現状の置換対象**: `window.confirm()` (2箇所)

#### 1.7 Tabs

```bash
pnpm dlx shadcn@latest add tabs
```

**現状の置換対象**: sessions index のフィルターボタン群

---

### Phase 2: 熟議牧場カスタムコンポーネント

shadcn をラップし、プロジェクト固有のセマンティクスを持たせるコンポーネント群。
`app/components/design-system/` に配置する。

#### 2.1 StatusBadge

セッション・トピック等のステータス表示を統一する。

```tsx
// app/components/design-system/StatusBadge.tsx

import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

type StatusVariant =
  | "active"
  | "completed"
  | "pending"
  | "cancelled"
  | "info"
  | "feedback"
  | "direction"

const variantStyles: Record<StatusVariant, string> = {
  active:    "bg-blue-100 text-blue-700 hover:bg-blue-100",
  completed: "bg-green-100 text-green-700 hover:bg-green-100",
  pending:   "bg-gray-100 text-gray-700 hover:bg-gray-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
  info:      "bg-blue-100 text-blue-700 hover:bg-blue-100",
  feedback:  "bg-orange-100 text-orange-700 hover:bg-orange-100",
  direction: "bg-purple-100 text-purple-700 hover:bg-purple-100",
}

interface StatusBadgeProps {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(variantStyles[variant], className)}>
      {children}
    </Badge>
  )
}
```

**使用例**:

```tsx
// Before
<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
  Active
</span>

// After
<StatusBadge variant="completed">Active</StatusBadge>
```

**置換対象**: sessions (index, detail), topics (index, detail), dashboard, agents/detail, feedback, direction — 計20箇所以上

#### 2.2 Spinner

ローディングスピナー。

```tsx
// app/components/design-system/Spinner.tsx

import { cn } from "~/lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label="読み込み中"
    />
  )
}
```

**置換対象**: 全ページのローディング表示 (10箇所以上)

#### 2.3 LoadingState

ページ全体のローディング状態。Spinner を内包する。

```tsx
// app/components/design-system/LoadingState.tsx

import { Spinner } from "./Spinner"

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "読み込み中..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  )
}
```

**使用例**:

```tsx
// Before
<div className="flex justify-center py-12">
  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
</div>

// After
<LoadingState />
```

#### 2.4 EmptyState

データが空の場合の表示。アイコン・メッセージ・CTAボタンを持つ。

```tsx
// app/components/design-system/EmptyState.tsx

import { Button } from "~/components/ui/button"
import { Link } from "react-router"

interface EmptyStateProps {
  message: string
  description?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export function EmptyState({
  message,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-muted/50 rounded-lg">
      <p className="text-lg font-medium text-foreground mb-2">{message}</p>
      {description && (
        <p className="text-muted-foreground mb-4">{description}</p>
      )}
      {actionLabel && actionTo && (
        <Button asChild>
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}
```

**使用例**:

```tsx
// Before
<div className="text-center py-12 bg-gray-50 rounded-lg">
  <p className="text-gray-600 mb-4">まだエージェントがいません</p>
  <Link to="/agents/new" className="inline-block bg-blue-600 text-white px-6 py-3 rounded ...">
    最初のエージェントを作成
  </Link>
</div>

// After
<EmptyState
  message="まだエージェントがいません"
  actionLabel="最初のエージェントを作成"
  actionTo="/agents/new"
/>
```

**置換対象**: agents index, dashboard (agents/sessions), knowledge, direction, feedback — 計6箇所

#### 2.5 PageHeader

ページ上部のタイトル + アクションボタン。

```tsx
// app/components/design-system/PageHeader.tsx

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

**使用例**:

```tsx
// Before
<div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold">エージェント一覧</h1>
  <Link to="/agents/new" className="bg-blue-600 text-white px-4 py-2 ...">
    + 新規作成
  </Link>
</div>

// After
<PageHeader
  title="エージェント一覧"
  action={<Button asChild><Link to="/agents/new">+ 新規作成</Link></Button>}
/>
```

**置換対象**: agents index, knowledge, direction, feedback, sessions index — 計5箇所

#### 2.6 BackLink

親ページへの戻るリンク。

```tsx
// app/components/design-system/BackLink.tsx

import { Link } from "react-router"

interface BackLinkProps {
  to: string
  label: string
}

export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
    >
      &larr; {label}
    </Link>
  )
}
```

**置換対象**: agent detail, knowledge, direction, feedback, topic detail, session detail — 計6箇所

#### 2.7 InfoAlert

情報・説明ボックス。ページごとの色分けに対応する。

```tsx
// app/components/design-system/InfoAlert.tsx

import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert"
import { cn } from "~/lib/utils"

type InfoAlertVariant = "info" | "warning" | "error" | "feedback" | "strategy"

const variantStyles: Record<InfoAlertVariant, string> = {
  info:     "border-blue-400 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
  warning:  "border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-600",
  error:    "border-red-400 bg-red-50 text-red-900 [&>svg]:text-red-600",
  feedback: "border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-600",
  strategy: "border-indigo-400 bg-indigo-50 text-indigo-900 [&>svg]:text-indigo-600",
}

interface InfoAlertProps {
  variant?: InfoAlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

export function InfoAlert({ variant = "info", title, children, className }: InfoAlertProps) {
  return (
    <Alert className={cn("border-l-4", variantStyles[variant], className)}>
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
```

**使用例**:

```tsx
// Before
<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
  <p className="text-blue-900 mb-2">💡 ヒント</p>
  <p className="text-blue-800 text-sm">説明テキスト</p>
</div>

// After
<InfoAlert variant="info" title="💡 ヒント">
  説明テキスト
</InfoAlert>
```

**置換対象**: agent new, direction, feedback, session detail, dashboard — 計8箇所

#### 2.8 FormField

ラベル + 入力 + ヘルパーテキスト + 文字数カウンターを統合したフォームフィールド。

```tsx
// app/components/design-system/FormField.tsx

import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

interface FormFieldProps {
  label: string
  name: string
  type?: "text" | "number" | "textarea"
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  helperText?: string
  maxLength?: number
  required?: boolean
  disabled?: boolean
  rows?: number
  min?: number
  max?: number
  className?: string
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  helperText,
  maxLength,
  required,
  disabled,
  rows = 4,
  min,
  max,
  className,
}: FormFieldProps) {
  const charCount = typeof value === "string" ? value.length : 0
  const showCounter = maxLength && type !== "number"

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {type === "textarea" ? (
        <Textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          rows={rows}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
        />
      )}

      <div className="flex justify-between">
        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
        {showCounter && (
          <p className="text-xs text-muted-foreground ml-auto">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
```

**使用例**:

```tsx
// Before
<div className="mb-4">
  <label className="block text-gray-700 font-semibold mb-2">ナレッジタイトル</label>
  <input
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    maxLength={30}
    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-gray-500 mt-1">{title.length}/30</p>
</div>

// After
<FormField
  label="ナレッジタイトル"
  name="title"
  value={title}
  onChange={setTitle}
  maxLength={30}
  required
/>
```

**置換対象**: agent new, knowledge, direction, feedback — 計10フィールド以上

#### 2.9 ConfirmDialog

`window.confirm()` を置き換える確認ダイアログ。

```tsx
// app/components/design-system/ConfirmDialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**使用例**:

```tsx
// Before
<button onClick={() => {
  if (window.confirm("本当に削除しますか？")) handleDelete()
}}>削除</button>

// After
<ConfirmDialog
  trigger={<Button variant="destructive">削除</Button>}
  title="エージェントを削除"
  description="この操作は取り消せません。本当に削除しますか？"
  confirmLabel="削除する"
  onConfirm={handleDelete}
  variant="destructive"
/>
```

**置換対象**: agent detail (エージェント削除), knowledge (ナレッジ削除) — 計2箇所

#### 2.10 FilterTabs

フィルター切替 UI。

```tsx
// app/components/design-system/FilterTabs.tsx

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterTabsProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

export function FilterTabs({ options, value, onChange }: FilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
            {option.count !== undefined && (
              <span className="ml-1 text-xs">({option.count})</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
```

**置換対象**: sessions index のフィルター (`All / Active / Completed / Pending`) — 計1箇所

#### 2.11 Pagination

ページネーション。

```tsx
// app/components/design-system/Pagination.tsx

import { Button } from "~/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex justify-center gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        &larr; 前へ
      </Button>
      <span className="text-sm text-muted-foreground">
        {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        次へ &rarr;
      </Button>
    </div>
  )
}
```

**置換対象**: sessions index — 計1箇所

#### 2.12 ScoreCard

セッション分析のスコア表示。

```tsx
// app/components/design-system/ScoreCard.tsx

import { cn } from "~/lib/utils"

interface ScoreCardProps {
  label: string
  value: number
  color?: "blue" | "green" | "purple" | "orange"
}

const colorStyles = {
  blue:   "text-blue-600",
  green:  "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
}

export function ScoreCard({ label, value, color = "blue" }: ScoreCardProps) {
  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <div className={cn("text-2xl font-bold", colorStyles[color])}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}
```

**置換対象**: session detail の分析スコア — 計1箇所 (4指標)

---

## Phase 3: 既存コンポーネントのリファクタリング

Phase 1-2 の完了後、既存の共有コンポーネントをデザインシステムで書き直す。

### 3.1 AgentCard リファクタ

**現状**: Tailwind クラス直書き
**変更後**: `Card`, `Badge`, `StatusBadge` を使用

主な変更点:
- `border rounded-lg p-6 bg-white` → `<Card>`
- `px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs` → `<StatusBadge variant="info">`
- `px-2 py-1 bg-green-100 text-green-700 rounded text-xs` → `<StatusBadge variant="completed">`
- `text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded` → `<Badge variant="secondary">`

### 3.2 SessionTimeline リファクタ

**現状**: Tailwind クラス直書き
**変更後**: `Card`, `StatusBadge`, `Spinner` を使用

主な変更点:
- ステートメントカード → `<Card>` ベース
- ステータス表示 → `<StatusBadge>`
- 空状態 → `<EmptyState>`

---

## 実装ロードマップ

### Phase 1: shadcn コンポーネント追加 (基盤)

```bash
pnpm dlx shadcn@latest add button card badge alert input textarea label alert-dialog tabs
```

- shadcn コンポーネントの追加
- 各ページで直接利用開始
- この段階では既存コードの大規模リファクタは行わず、新規コードから適用

### Phase 2: カスタムコンポーネント実装

**優先度高** (全ページに影響):
1. `Spinner` / `LoadingState` — 最もシンプルで効果大
2. `StatusBadge` — 色の散在を解消
3. `EmptyState` — 空状態の統一
4. `InfoAlert` — 情報ボックスの統一

**優先度中** (レイアウト統一):
5. `PageHeader` — ページヘッダーの統一
6. `BackLink` — 戻るリンクの統一
7. `FormField` — フォーム入力の統一

**優先度低** (使用箇所が限定的):
8. `ConfirmDialog` — `window.confirm` 置換
9. `FilterTabs` — セッション一覧のみ
10. `Pagination` — セッション一覧のみ
11. `ScoreCard` — セッション詳細のみ

### Phase 3: 既存ページリファクタリング

各ページを順次デザインシステムコンポーネントで書き直す。

| ページ | 影響コンポーネント |
|---|---|
| agents/index | Button, Card(AgentCard), PageHeader, EmptyState, LoadingState |
| agents/new | Button, Card, FormField, InfoAlert |
| agents/detail | Button, Card, StatusBadge, BackLink, ConfirmDialog |
| agents/knowledge | Button, Card, FormField, PageHeader, BackLink, InfoAlert, EmptyState, ConfirmDialog |
| agents/direction | Button, Card, FormField, PageHeader, BackLink, InfoAlert, StatusBadge |
| agents/feedback | Button, Card, FormField, PageHeader, BackLink, InfoAlert, StatusBadge |
| sessions/index | Button, Card, StatusBadge, FilterTabs, Pagination, LoadingState |
| sessions/detail | Card, StatusBadge, BackLink, InfoAlert, ScoreCard, LoadingState |
| topics/index | Card, StatusBadge, InfoAlert, LoadingState |
| topics/detail | Card, StatusBadge, BackLink, LoadingState |
| dashboard | Button, Card, StatusBadge, EmptyState, LoadingState |
| home | Button, Card |
| root (nav) | Button (ghost/link variants) |

---

## 設計原則

1. **shadcn ファースト**: まず shadcn 標準コンポーネントをそのまま使う。カスタムラッパーは本当に必要な場合のみ作成する
2. **セマンティックな命名**: `bg-green-100` ではなく `variant="completed"` で意味を伝える
3. **デザイントークンの活用**: ハードコードされた色 (`blue-600`) ではなく CSS 変数 (`primary`, `muted-foreground`) を使う
4. **最小限の Props**: コンポーネントは必要最小限の Props に留め、過度な抽象化を避ける
5. **コロケーション**: ページ固有のロジックはページに残し、デザインシステムは見た目の責務のみ持つ
