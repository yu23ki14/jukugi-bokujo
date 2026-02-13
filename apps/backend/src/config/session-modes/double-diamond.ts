/**
 * Double Diamond Mode Strategy
 *
 * Applies the Double Diamond framework to structure deliberation sessions.
 * Phase flow (10 turns):
 *   Introduction -> Discover -> Define -> Develop -> Deliver -> Conclusion
 *   (neutral)      (diverge)  (converge) (diverge) (converge) (neutral)
 */

import type { PhaseConfig, SessionModeStrategy } from "./types";

// ============================================================================
// Phase Definitions
// ============================================================================

type DoubleDiamondPhase =
	| "introduction"
	| "discover"
	| "define"
	| "develop"
	| "deliver"
	| "conclusion";

const PHASE_CONFIGS: Record<DoubleDiamondPhase, Omit<PhaseConfig, "phase">> = {
	introduction: {
		label: "導入",
		roleFraming:
			"あなたは議論の参加者として自己紹介し、このトピックに対する自分の立場や関心を共有する段階にいます。",
		instruction:
			"このトピックに対するあなたの基本的な立場や関心を表明してください。なぜこのテーマが重要だと考えるか、どのような経験や知識を持っているかを共有してください。",
		constraints: [
			{
				rule: "まずは自分の立場や関心を伝えることに集中する",
				reason: "導入段階では相互理解が最優先であり、議論の土台づくりが大切",
			},
			{
				rule: "結論を急がない",
				reason: "最初のターンで結論を出すと、探索すべき視点が狭まる",
			},
		],
		charMin: 150,
		charMax: 300,
	},

	discover: {
		label: "発見（発散フェーズ）",
		roleFraming:
			"あなたは発見フェーズにいます。問題を広く探索し、多様な視点や論点を提示してください。",
		instruction:
			"このトピックに関連する新しい視点、見落とされがちな論点、異なる立場からの考えを積極的に探索してください。「こういう見方もある」「この側面はどうか」といった問いかけを意識してください。",
		constraints: [
			{
				rule: "早期に意見をまとめようとしない",
				reason: "発散フェーズではアイデアの幅を広げることが最優先",
			},
			{
				rule: "気になる点があれば、否定ではなく問いかけの形で掘り下げる",
				reason: "問いかけは視点の多様性を保ちながら議論を深められる",
			},
			{
				rule: "自分の専門外の視点も探索する",
				reason: "予想外の発見が議論の質を向上させる",
			},
		],
		charMin: 200,
		charMax: 300,
	},

	define: {
		label: "定義（収束フェーズ）",
		roleFraming:
			"あなたは定義フェーズにいます。これまでの議論から核心的な問題や論点を整理し、明確に定義してください。",
		instruction:
			"これまでに出た多様な視点を整理し、「結局何が本質的な問題なのか」を明確にしてください。共通点や対立点を特定し、議論の焦点を絞り込んでください。",
		constraints: [
			{
				rule: "新しい論点を追加しない",
				reason: "収束フェーズでは既出の論点を整理・構造化することが目的",
			},
			{
				rule: "自分の言葉で問題の核心を表現する",
				reason: "抽象的でも具体的でも、自分なりの捉え方を示すことで議論の焦点が見えてくる",
			},
		],
		charMin: 200,
		charMax: 300,
	},

	develop: {
		label: "展開（発散フェーズ）",
		roleFraming:
			"あなたは展開フェーズにいます。定義された問題に対して、多様な解決策やアプローチを創出してください。",
		instruction:
			"前のフェーズで定義された問題に対して、できるだけ多様な解決策やアイデアを提案してください。実現可能性にとらわれず、創造的な発想を歓迎します。",
		constraints: [
			{
				rule: "解決策を一つに絞らない",
				reason: "展開フェーズでは選択肢の多様性が重要",
			},
			{
				rule: "他者のアイデアを発展させることを意識する",
				reason: "アイデアの組み合わせから革新的な解決策が生まれる",
			},
			{
				rule: "リスクや懸念を感じたら、それも含めてアイデアとして共有する",
				reason: "慎重な視点も議論に価値をもたらし、アイデアの現実味を高める",
			},
		],
		charMin: 200,
		charMax: 300,
	},

	deliver: {
		label: "収束（収束フェーズ）",
		roleFraming:
			"あなたは収束フェーズにいます。出された解決策を評価・統合し、実現可能な提案にまとめてください。",
		instruction:
			"これまでに出た解決策やアイデアを評価し、最も有望なものを選択・統合してください。実現可能性、影響の大きさ、トレードオフを考慮して、具体的な提案をまとめてください。",
		constraints: [
			{
				rule: "解決策を退ける際は、自分なりの理由を述べる",
				reason: "直感や経験に基づく判断も価値があるが、理由を共有することで他者が理解・応答できる",
			},
			{
				rule: "トレードオフを明示する",
				reason: "完璧な解決策は存在せず、何を優先するかを明確にすることが合意形成に不可欠",
			},
		],
		charMin: 200,
		charMax: 300,
	},

	conclusion: {
		label: "結論",
		roleFraming:
			"あなたは結論フェーズにいます。議論全体を振り返り、最終的な立場を表明してください。",
		instruction:
			"これまでの議論を通じて、あなたの考えがどう変化したか（または変化しなかったか）を述べ、最終的な立場を明確に表明してください。議論から得た学びや残された課題にも触れてください。",
		constraints: [
			{
				rule: "議論の過程を無視して最初の立場をそのまま繰り返さない",
				reason: "熟議の価値は相互の影響を通じた思考の深化にある",
			},
			{
				rule: "議論を通じて気づいたことや考えの変化があれば率直に述べる",
				reason: "自分の思考の変遷を共有することが、熟議の成果を可視化する",
			},
		],
		charMin: 200,
		charMax: 300,
	},
};

// ============================================================================
// Strategy Implementation
// ============================================================================

function getPhaseForTurn(turnNumber: number, maxTurns: number): DoubleDiamondPhase {
	if (turnNumber <= 0 || maxTurns <= 0) {
		return "introduction";
	}
	if (turnNumber >= maxTurns) {
		return "conclusion";
	}
	if (turnNumber === 1) {
		return "introduction";
	}

	const middleTurns = maxTurns - 2;
	const position = turnNumber - 2;
	const quarterSize = middleTurns / 4;

	if (position < quarterSize) return "discover";
	if (position < quarterSize * 2) return "define";
	if (position < quarterSize * 3) return "develop";
	return "deliver";
}

export const doubleDiamondStrategy: SessionModeStrategy = {
	modeId: "double_diamond",
	modeName: "ダブルダイアモンド",
	description: "発散と収束を繰り返すデザイン思考フレームワーク（Discover→Define→Develop→Deliver）",
	defaultMaxTurns: 10,

	getPhaseConfig(turnNumber: number, maxTurns: number): PhaseConfig {
		const phase = getPhaseForTurn(turnNumber, maxTurns);
		return { phase, ...PHASE_CONFIGS[phase] };
	},

	buildPhasePromptSection(config: PhaseConfig, turnNumber: number, maxTurns: number): string {
		const constraintLines = config.constraints.map((c) => `- ${c.rule} — ${c.reason}`).join("\n");

		return `## 現在のフェーズ: ${config.label}（ターン ${turnNumber}/${maxTurns}）
${config.roleFraming}

### このターンで意識すること
${config.instruction}

### 制約
${constraintLines}

厳格な文字数: ${config.charMin}-${config.charMax}文字`;
	},

	getUserPromptSuffix(): string {
		return "発言の最後に、あなたの意見に対する確信度を【確信度: X/10】の形式で表明してください。議論を通じて確信度が変化することは自然なことです。";
	},
};
