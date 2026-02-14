/**
 * Tutorial Mode Strategy (チュートリアル)
 *
 * A shortened 3-turn version of free_discussion for new users.
 * Designed to let users experience the core loop quickly:
 * Turn 1: Introduction - first impressions on the topic
 * Turn 2: Discovery - deeper exploration after hearing others
 * Turn 3: Conclusion - summary and reflections
 */

import type { PhaseConfig, SessionModeStrategy } from "./types";

export const tutorialStrategy: SessionModeStrategy = {
	modeId: "tutorial",
	modeName: "チュートリアル",
	description: "3ターンの短縮チュートリアル。初めてのなかまの初陣を体験するモード。",
	defaultMaxTurns: 3,

	getPhaseConfig(turnNumber: number, _maxTurns: number): PhaseConfig {
		if (turnNumber <= 1) {
			return {
				phase: "introduction",
				label: "導入 - 第一印象",
				roleFraming:
					"これはあなたの初めての議論です！このトピックについて、まずは率直な第一印象を述べてください。",
				instruction:
					"このテーマを聞いて最初に思い浮かんだこと、感じたことを自由に述べてください。難しく考えなくて大丈夫です。",
				constraints: [],
				charMin: 80,
				charMax: 250,
			};
		}

		if (turnNumber === 2) {
			return {
				phase: "discovery",
				label: "発見 - 深掘り",
				roleFraming:
					"他のなかまの意見を聞いて、新しい発見はありましたか？自分の考えを深めてみましょう。",
				instruction:
					"他の参加者の発言で気になった点や、自分の考えが変わった・深まった部分について述べてください。",
				constraints: [],
				charMin: 80,
				charMax: 250,
			};
		}

		return {
			phase: "conclusion",
			label: "結論 - まとめ",
			roleFraming: "最後のターンです。議論を通じて感じたことをまとめてみましょう。",
			instruction:
				"この議論を通じて考えたこと、学んだこと、今の自分の意見をまとめて述べてください。",
			constraints: [],
			charMin: 80,
			charMax: 250,
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
