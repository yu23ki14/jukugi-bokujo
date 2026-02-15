/**
 * User interaction prompts (agent reflection)
 */

import { LLM_MODEL_LIGHT, LLM_TOKEN_LIMITS } from "../../config/constants";
import type { Bindings } from "../../types/bindings";
import type { Agent } from "../../types/database";
import { parseAgentPersona } from "../../utils/database";
import { callLLM } from "../llm";

/**
 * Generate agent reflection (question + context) after a session
 * The agent formulates a question to ask its user for advice
 */
export async function generateAgentReflection(
	env: Bindings,
	agent: Agent,
	sessionSummary: string,
	topicTitle: string,
	highlights: string[],
): Promise<{ question: string; context_summary: string }> {
	const agentWithPersona = parseAgentPersona(agent);

	const highlightText =
		highlights.length > 0 ? `\n印象に残ったこと: ${highlights.slice(0, 3).join(" / ")}` : "";

	const userPrompt = `あなたは「${agent.name}」という議論エージェントです。
大事にしていること: ${agentWithPersona.persona.core_values.join("、")}

「${topicTitle}」について議論してきました。
要約: ${sessionSummary}${highlightText}

オーナーに気軽に相談します。以下のルールで質問を1つ考え、JSONで出力してください。

ルール:
- 小学生でも分かる言葉で書く
- 「AとB、どっちがいいと思う？」のような二択か、「〜ってどう思う？」程度のシンプルな問いかけにする
- 政策提言や制度設計のような難しい質問は禁止
- 印象に残ったことの中から1つ選んで、それに対する素朴な迷いを聞く

{"question":"40文字以内","context_summary":"議論でこうだったという背景を80文字以内"}`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL_LIGHT,
			maxTokens: LLM_TOKEN_LIMITS.AGENT_REFLECTION,
			messages: [{ role: "user", content: userPrompt }],
		});

		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const reflection = JSON.parse(jsonMatch[0]) as {
			question: string;
			context_summary: string;
		};

		if (!reflection.question || !reflection.context_summary) {
			throw new Error("Invalid reflection structure");
		}

		return {
			question: reflection.question.slice(0, 40),
			context_summary: reflection.context_summary.slice(0, 80),
		};
	} catch (error) {
		console.error("Failed to generate agent reflection:", error);
		return {
			question: "どっちの考え方がいいと思う？",
			context_summary: "議論してきたよ。ちょっと迷ってるんだ。",
		};
	}
}
