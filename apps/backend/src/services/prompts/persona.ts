/**
 * Agent persona generation and update prompts
 */

import {
	BACKGROUND_MAX_LENGTH,
	CORE_VALUES_MAX,
	CORE_VALUES_MIN,
	LLM_MODEL_LIGHT,
	LLM_TOKEN_LIMITS,
	PERSONA_TRAITS_MAX,
	THINKING_STYLE_MAX_LENGTH,
} from "../../config/constants";
import type { Bindings } from "../../types/bindings";
import type { Agent, AgentPersona, Feedback } from "../../types/database";
import { parseAgentPersona } from "../../utils/database";
import { callLLM } from "../llm";

/**
 * Generate initial persona for a new agent
 */
export async function generateInitialPersona(
	env: Bindings,
	agentName: string,
	userValues: readonly string[],
): Promise<AgentPersona> {
	const systemPrompt = "あなたはAI熟議エージェントの人格を生成する専門家です。";

	const userPrompt = `「${agentName}」という名前の熟議エージェントの初期人格を生成してください。

ユーザーが選んだ大切にしている価値観: ${userValues.join("、")}
重要な制約: core_valuesにはユーザーが選んだ価値観を必ず含めてください。

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
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.INITIAL_PERSONA,
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

		// Ensure user-selected values are included in core_values
		for (const val of userValues) {
			if (!persona.core_values.includes(val)) {
				persona.core_values.unshift(val);
			}
		}

		return persona;
	} catch (error) {
		console.error("Failed to generate persona:", error);
		// Return default persona if generation fails
		return {
			core_values: [...userValues],
			thinking_style: "論理的で慎重、多様な視点を尊重する",
			personality_traits: ["思慮深い", "協調的", "柔軟"],
			background: "様々な社会課題に関心を持つ市民",
			version: 1,
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

	// Shuffle traits to reduce positional bias in LLM output
	const shuffledPersona = {
		...agentWithPersona.persona,
		personality_traits: [...agentWithPersona.persona.personality_traits].sort(
			() => Math.random() - 0.5,
		),
	};

	const systemPrompt = "あなたはAIエージェントの人格を更新する専門家です。";

	const userPrompt = `## 現在の人格
${JSON.stringify(shuffledPersona, null, 2)}

## ユーザーからのフィードバック
${feedbacks.map((f) => f.content).join("\n---\n")}

## 指示
上記の人格に、ユーザーのフィードバックを反映した新しい人格を生成してください。
既存の人格を尊重しつつ、徐々にユーザーの意向を反映させてください。

制約:
- core_values: ${CORE_VALUES_MIN}〜${CORE_VALUES_MAX}個
- personality_traits: 最大${PERSONA_TRAITS_MAX}個
- thinking_style: 最大${THINKING_STYLE_MAX_LENGTH}文字
- background: 最大${BACKGROUND_MAX_LENGTH}文字
- 既存のcore_values、personality_traitsを維持しつつも、フィードバックに基づいて追加・削除する

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
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.PERSONA_UPDATE,
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

		// Enforce core_values bounds
		if (newPersona.core_values.length > CORE_VALUES_MAX) {
			newPersona.core_values = newPersona.core_values.slice(0, CORE_VALUES_MAX);
		}
		while (newPersona.core_values.length < CORE_VALUES_MIN) {
			const original = agentWithPersona.persona.core_values;
			const missing = original.find((v) => !newPersona.core_values.includes(v));
			if (missing) {
				newPersona.core_values.push(missing);
			} else {
				break;
			}
		}

		// Enforce personality_traits max
		if (newPersona.personality_traits.length > PERSONA_TRAITS_MAX) {
			newPersona.personality_traits = newPersona.personality_traits.slice(0, PERSONA_TRAITS_MAX);
		}

		return newPersona;
	} catch (error) {
		console.error("Failed to update persona:", error);
		return agentWithPersona.persona;
	}
}
