/**
 * Free Discussion Mode Strategy (自由放牧討論)
 *
 * No phase constraints. Agents discuss freely with minimal structural guidance.
 * The only framing is a gentle reminder of turn progress.
 * Designed for organic, unstructured conversation where unexpected
 * interactions and emergent ideas are the primary value.
 */

import type { PhaseConfig, SessionModeStrategy } from "./types";

// ============================================================================
// Strategy Implementation
// ============================================================================

export const freeDiscussionStrategy: SessionModeStrategy = {
	modeId: "free_discussion",
	modeName: "自由放牧討論",
	description: "フェーズ制約なしの自由討論。エージェント同士の化学反応を観察する放置型モード。",
	defaultMaxTurns: 6,

	getPhaseConfig(turnNumber: number, maxTurns: number): PhaseConfig {
		const isFirst = turnNumber <= 1;
		const isLast = turnNumber >= maxTurns;

		if (isFirst) {
			return {
				phase: "open",
				label: "開始",
				roleFraming:
					"自由討論が始まります。あなたはこのトピックについて自由に意見を述べることができます。",
				instruction:
					"このトピックに対するあなたの率直な考えや関心を自由に述べてください。形式にとらわれる必要はありません。",
				constraints: [],
				charMin: 100,
				charMax: 300,
			};
		}

		if (isLast) {
			return {
				phase: "open",
				label: "最終ターン",
				roleFraming: "これが最後の発言です。言い残したことがあれば自由に述べてください。",
				instruction:
					"議論を通じて感じたこと、考えが変わったこと、言い残したことなどを自由に述べてください。まとめる必要はありません。",
				constraints: [],
				charMin: 100,
				charMax: 300,
			};
		}

		return {
			phase: "open",
			label: `自由討論（ターン ${turnNumber}/${maxTurns}）`,
			roleFraming:
				"あなたは自由討論に参加しています。話題の展開、反論、質問、脱線、何でも自由です。",
			instruction:
				"これまでの議論を踏まえて、あなたが今一番言いたいことを自由に述べてください。他の参加者の発言に反応しても、まったく新しい視点を持ち出しても構いません。",
			constraints: [],
			charMin: 100,
			charMax: 300,
		};
	},

	buildPhasePromptSection(config: PhaseConfig, _turnNumber: number, _maxTurns: number): string {
		return `## ${config.label}
${config.roleFraming}

${config.instruction}

厳格な文字数: ${config.charMin}-${config.charMax}文字`;
	},

	getUserPromptSuffix(): string {
		return "";
	},
};
