/**
 * Anthropic API service for LLM integration
 */

import Anthropic from "@anthropic-ai/sdk";
import {
	API_MAX_RETRIES,
	API_RETRY_BASE_DELAY,
	API_RETRY_MAX_DELAY,
	LLM_MODEL,
	LLM_TOKEN_LIMITS,
} from "../config/constants";
import type { Bindings } from "../types/bindings";
import type {
	Agent,
	AgentPersona,
	Feedback,
	JudgeVerdict,
	Session,
	Statement,
} from "../types/database";
import { parseAgentPersona } from "../utils/database";

interface AnthropicRequest {
	model: string;
	max_tokens: number;
	system?: string;
	messages: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * API Error with rate limit information
 */
export class AnthropicAPIError extends Error {
	constructor(
		message: string,
		public status?: number,
		public retryAfter?: number,
	) {
		super(message);
		this.name = "AnthropicAPIError";
	}
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): error is AnthropicAPIError {
	return error instanceof AnthropicAPIError && error.status === 429;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
	const exponentialDelay = API_RETRY_BASE_DELAY ** attempt;
	const jitter = Math.random() * 1000; // 0-1000ms jitter
	const delayMs = Math.min(exponentialDelay * 1000, API_RETRY_MAX_DELAY * 1000) + jitter;
	return delayMs;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Anthropic API using the official SDK with retry logic
 */
export async function callAnthropicAPI(
	env: Bindings,
	request: AnthropicRequest,
): Promise<{ content: string }> {
	const client = new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
	});

	let attempt = 0;

	while (attempt < API_MAX_RETRIES) {
		try {
			const message = await client.messages.create({
				model: request.model,
				max_tokens: request.max_tokens,
				system: request.system,
				messages: request.messages,
			});

			// Extract text content from the first content block
			const firstContent = message.content[0];
			if (firstContent.type === "text") {
				return { content: firstContent.text };
			}

			throw new Error("Unexpected response format: first content block is not text");
		} catch (error) {
			attempt++;

			// Check if it's a rate limit error
			if (error instanceof Anthropic.APIError && error.status === 429) {
				console.warn(`Rate limit hit (attempt ${attempt}/${API_MAX_RETRIES}):`, error.message);

				// Get retry-after from headers if available
				const retryAfter = error.headers?.["retry-after"];
				const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : undefined;

				if (attempt < API_MAX_RETRIES) {
					// Use retry-after if provided, otherwise use exponential backoff
					const delayMs = retryAfterSeconds
						? retryAfterSeconds * 1000
						: calculateBackoffDelay(attempt);

					console.log(`Retrying after ${Math.round(delayMs / 1000)}s...`);
					await sleep(delayMs);
					continue;
				}

				// Max retries reached, throw rate limit error
				throw new AnthropicAPIError(
					`Rate limit exceeded after ${API_MAX_RETRIES} retries`,
					429,
					retryAfterSeconds,
				);
			}

			// Other errors (non-429) should not be retried here
			if (error instanceof Anthropic.APIError) {
				throw new AnthropicAPIError(error.message || "Anthropic API error", error.status);
			}

			// Unknown error
			throw error;
		}
	}

	// Should never reach here
	throw new Error("Unexpected error in callAnthropicAPI");
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
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.INITIAL_PERSONA,
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
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.SESSION_SUMMARY,
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
	const systemPrompt =
		"あなたは議論の良し悪しを判断する公平な審判です。熟議セッションの内容を評価し、判定を下します。";

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
以下の観点から厳密に評価してください：

1. 議論の質（1-10点）：論理性、根拠の明確さ、深さを厳しく評価
2. 参加者の協調性（1-10点）：建設的対話、相互理解、攻撃性の有無を厳しく評価
3. 結論への収束度（1-10点）：明確な合意形成、曖昧さの排除を厳しく評価
4. 新しい視点の提示（1-10点）：創造性、既存の通説からの脱却を厳しく評価

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
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.JUDGE_VERDICT,
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
 * Update agent persona based on feedbacks
 */
export async function updateAgentPersona(
	env: Bindings,
	agent: Agent,
	feedbacks: Feedback[],
): Promise<AgentPersona> {
	if (feedbacks.length === 0) {
		return parseAgentPersona(agent).persona;
	}

	const agentWithPersona = parseAgentPersona(agent);

	const systemPrompt = "あなたはAIエージェントの人格を更新する専門家です。";

	const userPrompt = `## 現在の人格
${JSON.stringify(agentWithPersona.persona, null, 2)}

## ユーザーからのフィードバック
${feedbacks.map((f) => f.content).join("\n---\n")}

## 指示
上記の人格に、ユーザーのフィードバックを反映した新しい人格を生成してください。
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
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.PERSONA_UPDATE,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const newPersona = JSON.parse(jsonMatch[0]) as AgentPersona;

		if (
			!Array.isArray(newPersona.core_values) ||
			!newPersona.thinking_style ||
			!Array.isArray(newPersona.personality_traits) ||
			!newPersona.background
		) {
			throw new Error("Invalid persona structure");
		}

		newPersona.version = agentWithPersona.persona.version + 1;

		return newPersona;
	} catch (error) {
		console.error("Failed to update persona:", error);
		return agentWithPersona.persona;
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
		const response = await callAnthropicAPI(env, {
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.STRATEGY_GENERATION,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		return response.content;
	} catch (error) {
		console.error("Failed to generate session strategy:", error);
		throw error;
	}
}
