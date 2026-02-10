/**
 * Test data factories
 *
 * Reusable test data generators with reasonable defaults
 */

import type { AgentPersona } from "../../src/types/database";

/**
 * Generate a test UUID
 */
export function generateTestId(prefix: string, index: number): string {
	return `${prefix}-${String(index).padStart(4, "0")}-0000-0000-000000000000`;
}

/**
 * Test persona data
 */
export const TEST_PERSONAS: Record<string, AgentPersona> = {
	default: {
		core_values: ["公平性", "持続可能性", "対話重視"],
		thinking_style: "論理的で慎重、多様な視点を尊重する",
		personality_traits: ["思慮深い", "協調的", "柔軟"],
		background: "様々な社会課題に関心を持つ市民",
		version: 1,
	},
	progressive: {
		core_values: ["革新", "平等", "環境保護"],
		thinking_style: "進歩的で理想主義的",
		personality_traits: ["情熱的", "理想主義", "行動的"],
		background: "社会変革を目指す活動家",
		version: 1,
	},
	conservative: {
		core_values: ["伝統", "安定性", "実用主義"],
		thinking_style: "慎重で現実的",
		personality_traits: ["慎重", "現実的", "伝統重視"],
		background: "伝統的価値観を重視する市民",
		version: 1,
	},
};

/**
 * Test agent names
 */
export const TEST_AGENT_NAMES = [
	"テスト太郎",
	"テスト花子",
	"議論マスター",
	"熟議エージェント",
	"AI市民",
];

/**
 * Test knowledge titles and content
 */
export const TEST_KNOWLEDGE = [
	{
		title: "気候変動について",
		content: "気候変動は地球規模の課題であり、早急な対策が必要です。",
	},
	{
		title: "教育制度改革",
		content: "現代の教育制度は時代に合わせて見直す必要があります。",
	},
	{
		title: "経済政策の方向性",
		content: "持続可能な経済成長と社会的包摂のバランスが重要です。",
	},
];

/**
 * Test direction content
 */
export const TEST_DIRECTIONS = [
	"経済的な観点も考慮して",
	"相手の意見に反論して",
	"具体的なデータを示して",
];

/**
 * Test feedback content
 */
export const TEST_FEEDBACKS = [
	"前回の議論では良い論点を出していましたが、もう少し具体的な提案があるとより説得力が増します。次回は具体例を交えて議論してください。",
	"他の参加者の意見を尊重しつつも、自分の立場をもっと明確にしてほしい。",
	"素晴らしい議論でした。この調子で環境問題についても深く考察してください。",
];

/**
 * Test topic data
 */
export const TEST_TOPICS = [
	{
		title: "気候変動対策について",
		description: "地球温暖化への対策として、どのようなアプローチが有効でしょうか。",
	},
	{
		title: "教育制度の未来",
		description: "これからの時代に求められる教育とは何でしょうか。",
	},
	{
		title: "働き方改革",
		description: "持続可能な働き方を実現するには、どうすればよいでしょうか。",
	},
];

/**
 * Create test request body for agent creation
 */
export function createAgentRequestBody(name: string) {
	return {
		name: name.trim(),
	};
}

/**
 * Create test request body for knowledge creation
 */
export function createKnowledgeRequestBody(title: string, content: string) {
	return {
		title: title.trim(),
		content: content.trim(),
	};
}

/**
 * Create test request body for direction creation
 */
export function createDirectionRequestBody(sessionId: string, turnNumber: number, content: string) {
	return {
		session_id: sessionId,
		turn_number: turnNumber,
		content: content.trim(),
	};
}

/**
 * Create test request body for feedback creation
 */
export function createFeedbackRequestBody(sessionId: string, content: string) {
	return {
		session_id: sessionId,
		content: content.trim(),
	};
}

/**
 * Create test request body for agent update
 */
export function createAgentUpdateRequestBody(name: string) {
	return {
		name: name.trim(),
	};
}
