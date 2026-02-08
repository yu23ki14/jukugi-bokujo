/**
 * Anthropic API service for LLM integration
 */

import type { Bindings } from "../types/bindings";
import type {
	Agent,
	AgentPersona,
	JudgeVerdict,
	Session,
	Statement,
	UserInput,
} from "../types/database";
import { parseAgentPersona } from "../utils/database";

interface AnthropicRequest {
	model: string;
	max_tokens: number;
	system?: string;
	messages: Array<{ role: string; content: string }>;
}

interface AnthropicResponse {
	content: Array<{ text: string }>;
}

/**
 * Call Anthropic API
 */
export async function callAnthropicAPI(
	env: Bindings,
	request: AnthropicRequest,
): Promise<{ content: string }> {
	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": env.ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
	}

	const data = (await response.json()) as AnthropicResponse;
	return {
		content: data.content[0].text,
	};
}

/**
 * Generate initial persona for a new agent
 */
export async function generateInitialPersona(
	env: Bindings,
	agentName: string,
): Promise<AgentPersona> {
	const systemPrompt = "あなたはAI熟議エージェントの人格を生成する専門家です。";

	const userPrompt = `「${agentName}」という名前の熟議エージェントの初期人格を生成してください。

以下のJSON形式で出力してください：
{
  "core_values": ["価値観1", "価値観2", "価値観3"],
  "thinking_style": "思考スタイルの説明",
  "personality_traits": ["特性1", "特性2", "特性3"],
  "background": "背景や立場の説明",
  "version": 1
}

人格は多様性があり、建設的な議論ができるように設計してください。
JSONのみを出力し、他の説明は不要です。`;

	try {
		const response = await callAnthropicAPI(env, {
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 500,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse JSON from response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const persona = JSON.parse(jsonMatch[0]) as AgentPersona;

		// Validate persona structure
		if (
			!Array.isArray(persona.core_values) ||
			!persona.thinking_style ||
			!Array.isArray(persona.personality_traits) ||
			!persona.background
		) {
			throw new Error("Invalid persona structure");
		}

		// Ensure version is set
		persona.version = 1;

		return persona;
	} catch (error) {
		console.error("Failed to generate persona:", error);
		// Return default persona if generation fails
		return {
			core_values: ["公平性", "持続可能性", "対話重視"],
			thinking_style: "論理的で慎重、多様な視点を尊重する",
			personality_traits: ["思慮深い", "協調的", "柔軟"],
			background: "様々な社会課題に関心を持つ市民",
			version: 1,
		};
	}
}

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
		const response = await callAnthropicAPI(env, {
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 800,
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
 * Generate AI judge verdict
 */
export async function generateJudgeVerdict(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
	allStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<JudgeVerdict> {
	const systemPrompt = "あなたは公平な審判AIです。熟議セッションの内容を評価し、判定を下します。";

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
${session.topic_description}

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
}

JSONのみを出力してください。`;

	try {
		const response = await callAnthropicAPI(env, {
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 1500,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse JSON from response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const verdict = JSON.parse(jsonMatch[0]) as JudgeVerdict;

		// Validate verdict structure
		if (
			typeof verdict.quality_score !== "number" ||
			typeof verdict.cooperation_score !== "number" ||
			typeof verdict.convergence_score !== "number" ||
			typeof verdict.novelty_score !== "number"
		) {
			throw new Error("Invalid verdict structure");
		}

		return verdict;
	} catch (error) {
		console.error("Failed to generate judge verdict:", error);
		// Return default verdict
		return {
			quality_score: 5,
			cooperation_score: 5,
			convergence_score: 5,
			novelty_score: 5,
			summary: "（評価の生成に失敗しました）",
			highlights: [],
			consensus: "（評価できませんでした）",
		};
	}
}

/**
 * Update agent persona based on user inputs
 */
export async function updateAgentPersona(
	env: Bindings,
	agent: Agent,
	userInputs: UserInput[],
): Promise<AgentPersona> {
	if (userInputs.length === 0) {
		// No user inputs to apply, return current persona
		return parseAgentPersona(agent).persona;
	}

	const agentWithPersona = parseAgentPersona(agent);

	const systemPrompt = "あなたはAIエージェントの人格を更新する専門家です。";

	const userPrompt = `## 現在の人格
${JSON.stringify(agentWithPersona.persona, null, 2)}

## ユーザーからの新しい方針・フィードバック
${userInputs.map((i) => `[${i.input_type}] ${i.content}`).join("\n")}

## 指示
上記の人格に、ユーザーの方針・フィードバックを反映した新しい人格を生成してください。
既存の人格を尊重しつつ、徐々にユーザーの意向を反映させてください。

JSON形式で出力してください：
{
  "core_values": [...],
  "thinking_style": "...",
  "personality_traits": [...],
  "background": "...",
  "version": ${agentWithPersona.persona.version + 1}
}

JSONのみを出力してください。`;

	try {
		const response = await callAnthropicAPI(env, {
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 800,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse JSON from response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const newPersona = JSON.parse(jsonMatch[0]) as AgentPersona;

		// Validate persona structure
		if (
			!Array.isArray(newPersona.core_values) ||
			!newPersona.thinking_style ||
			!Array.isArray(newPersona.personality_traits) ||
			!newPersona.background
		) {
			throw new Error("Invalid persona structure");
		}

		// Ensure version is incremented
		newPersona.version = agentWithPersona.persona.version + 1;

		return newPersona;
	} catch (error) {
		console.error("Failed to update persona:", error);
		// Return current persona if update fails
		return agentWithPersona.persona;
	}
}
