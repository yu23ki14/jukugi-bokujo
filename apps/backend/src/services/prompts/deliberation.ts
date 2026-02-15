/**
 * Deliberation session prompts (summary, turn summary, strategy)
 */

import { LLM_MODEL_LIGHT, LLM_TOKEN_LIMITS } from "../../config/constants";
import type { Bindings } from "../../types/bindings";
import type { Agent, Feedback, Session, Statement, StatementWithAgent } from "../../types/database";
import { parseAgentPersona } from "../../utils/database";
import { callLLM } from "../llm";

/**
 * Generate session summary
 */
export async function generateSessionSummary(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
	allStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<string> {
	const systemPrompt = "あなたは熟議セッションの要約を作成する専門家です。";

	const formatAllStatements = (
		statements: Array<Statement & { agent_name: string; turn_number: number }>,
	): string => {
		const grouped: Record<
			number,
			Array<Statement & { agent_name: string; turn_number: number }>
		> = {};
		for (const stmt of statements) {
			if (!grouped[stmt.turn_number]) {
				grouped[stmt.turn_number] = [];
			}
			grouped[stmt.turn_number].push(stmt);
		}

		return Object.entries(grouped)
			.map(([turn, stmts]) => {
				const turnStatements = stmts.map((s) => `  - ${s.agent_name}: ${s.content}`).join("\n");
				return `**ターン ${turn}**\n${turnStatements}`;
			})
			.join("\n\n");
	};

	const userPrompt = `## トピック
${session.topic_title}

## 議論全体（${session.current_turn}ターン）
${formatAllStatements(allStatements)}

## 指示
この熟議セッションを200-400文字で要約してください。
- 主要な論点
- 議論の流れ
- 参加者の立場の変化
- 到達した結論や合意点

を含めてください。`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.SESSION_SUMMARY,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		return response.content;
	} catch (error) {
		console.error("Failed to generate summary:", error);
		return "（要約の生成に失敗しました）";
	}
}

/**
 * Generate rolling turn summary (cumulative)
 * Combines previous summary with new turn's statements into a single summary
 */
export async function generateTurnSummary(
	env: Bindings,
	previousSummary: string | null,
	currentTurnStatements: Array<StatementWithAgent>,
	pastStatements?: Array<StatementWithAgent & { turn_number: number }>,
): Promise<string> {
	const systemPrompt = "あなたは熟議の要約を作成する専門家です。簡潔かつ正確に要約してください。";

	const formatStatements = (stmts: Array<StatementWithAgent>): string =>
		stmts.map((s) => `- ${s.agent_name}: ${s.content}`).join("\n");

	let context: string;
	if (previousSummary) {
		context = `## これまでの要約\n${previousSummary}\n\n## 最新ターンの発言\n${formatStatements(currentTurnStatements)}`;
	} else if (pastStatements && pastStatements.length > 0) {
		// First summary generation: summarize all past turns
		const grouped: Record<number, Array<StatementWithAgent & { turn_number: number }>> = {};
		for (const stmt of pastStatements) {
			if (!grouped[stmt.turn_number]) {
				grouped[stmt.turn_number] = [];
			}
			grouped[stmt.turn_number].push(stmt);
		}
		const formatted = Object.entries(grouped)
			.map(([turn, stmts]) => {
				const lines = stmts.map((s) => `  - ${s.agent_name}: ${s.content}`).join("\n");
				return `ターン ${turn}:\n${lines}`;
			})
			.join("\n");
		context = `## 全発言\n${formatted}\n\n## 最新ターンの発言\n${formatStatements(currentTurnStatements)}`;
	} else {
		context = `## 発言\n${formatStatements(currentTurnStatements)}`;
	}

	const userPrompt = `${context}

## 指示
上記の内容を踏まえて、議論全体の累積要約を200-400文字で作成してください。
以下を含めてください：
- 各参加者の立場・主張
- 議論の流れ
- 合意点・対立点

要約テキストのみを出力してください。`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.TURN_SUMMARY,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		return response.content;
	} catch (error) {
		console.error("[Turn Summary] Failed to generate turn summary:", error);
		return "（要約の生成に失敗しました）";
	}
}

/**
 * Generate session strategy from feedback and previous statements
 */
export async function generateSessionStrategy(
	env: Bindings,
	agent: Agent,
	feedback: Feedback,
	previousStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<string> {
	const agentWithPersona = parseAgentPersona(agent);

	const systemPrompt = "あなたはAI熟議エージェントの戦略立案を支援する専門家です。";

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

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.STRATEGY_GENERATION,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		return response.content;
	} catch (error) {
		console.error("Failed to generate session strategy:", error);
		throw error;
	}
}
