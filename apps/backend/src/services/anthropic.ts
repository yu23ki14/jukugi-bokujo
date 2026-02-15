/**
 * LLM API service for multi-provider integration
 * Supports Anthropic, OpenAI, and Google Gemini through Vercel AI SDK
 */

import {
	BACKGROUND_MAX_LENGTH,
	CORE_VALUES_MAX,
	CORE_VALUES_MIN,
	LLM_MODEL,
	LLM_MODEL_LIGHT,
	LLM_TOKEN_LIMITS,
	PERSONA_TRAITS_MAX,
	THINKING_STYLE_MAX_LENGTH,
} from "../config/constants";
import type { Bindings } from "../types/bindings";
import type {
	Agent,
	AgentPersona,
	Feedback,
	JudgeVerdict,
	NextTopic,
	Session,
	Statement,
	StatementWithAgent,
} from "../types/database";
import { parseAgentPersona } from "../utils/database";
import { callLLM } from "./llm";

// Re-export for backward compatibility
export { isRateLimitError, LLMAPIError as AnthropicAPIError } from "./llm";

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
 * Generate AI judge verdict
 */
export async function generateJudgeVerdict(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
	allStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<JudgeVerdict> {
	const systemPrompt = `あなたは議論の良し悪しを判断する厳格な審判です。甘い採点は議論の改善を妨げるため、問題点を積極的に見つけてください。

## 採点基準（全軸共通・1-10点）
1-2: 著しく不足。該当する要素がほぼ見られない
3-4: 不十分。断片的にはあるが全体として弱い
5-6: 平均的。基本はできているが深みや際立つ点に欠ける
7-8: 優良。明確な強みがあり問題点が少ない
9-10: 卓越。極めて稀な水準

大半の議論は3-6点に収まります。7点以上には具体的根拠が必要です。`;

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

## 評価軸
1. quality: 論理性、根拠の明確さ、議論の深さ
2. cooperation: 建設的対話、相互理解
3. convergence: 合意形成の明確さ
4. novelty: 独自の視点、通説からの脱却
5. inclusiveness: 多様な立場への配慮、少数意見の尊重
6. transformation: 議論を通じた意見の変化・発展
7. cross_reference: 他者の発言への言及、対話の連続性

## 回答手順
まず各軸について問題点・不足点を必ず1つ以上指摘し、それを踏まえて採点してください。
問題点が見つからない軸のみ7点以上を付けてください。

以下のJSON形式で出力してください：
{
  "quality_score": number, "quality_issue": "問題点を1文で",
  "cooperation_score": number, "cooperation_issue": "問題点を1文で",
  "convergence_score": number, "convergence_issue": "問題点を1文で",
  "novelty_score": number, "novelty_issue": "問題点を1文で",
  "inclusiveness_score": number, "inclusiveness_issue": "問題点を1文で",
  "transformation_score": number, "transformation_issue": "問題点を1文で",
  "cross_reference_score": number, "cross_reference_issue": "問題点を1文で",
  "summary": "総合評価を2-3文で",
  "highlights": ["注目すべき発言1", "注目すべき発言2"],
  "consensus": "到達したコンセンサス（あれば）"
}

JSONのみを出力してください。`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL,
			maxTokens: LLM_TOKEN_LIMITS.JUDGE_VERDICT,
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
			typeof verdict.novelty_score !== "number" ||
			typeof verdict.inclusiveness_score !== "number" ||
			typeof verdict.transformation_score !== "number" ||
			typeof verdict.cross_reference_score !== "number"
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
			inclusiveness_score: 5,
			transformation_score: 5,
			cross_reference_score: 5,
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

/**
 * Generate next topic based on session results
 * Returns a single topic suggestion for continuing the deliberation
 */
export async function generateNextTopic(
	env: Bindings,
	session: { topic_title: string; topic_description: string },
	sessionSummary: string,
	judgeVerdict: JudgeVerdict,
): Promise<NextTopic | null> {
	const systemPrompt = "あなたは熟議の論点を分析し、次に議論すべきテーマを提案する専門家です。";

	const userPrompt = `## 今回のトピック
${session.topic_title}: ${session.topic_description}

## セッションのサマリー
${sessionSummary}

## 審判の評価
- 評価サマリー: ${judgeVerdict.summary}
- コンセンサス: ${judgeVerdict.consensus}

## 指示
この議論を踏まえて、次に議論すべき論点を1つ提案してください。
この議論に参加していない人々だけでも議論が進められるように、文脈に依存しないかつ、具体的なタイトルと説明を含めてください。
議論には専門家のみならず、一般市民含めさまざまな背景を持つ人が参加します、なるべく平易な表現を用いてください。

- 今回の議論で合意できなかったが、溝が埋まる可能性のある論点
- 合意の次のステップとして議論すべき論点
- 新たに浮上した論点
のいずれかの観点から、最も重要な論点を選んでください。

### 例

{ "title": "オンライン広告詐欺対策: プラットフォーマーの責任", "description": "日本では現在オンライン広告詐欺が蔓延しています。この問題に大規模広告プラットフォームはどんなことが出来るでしょう？すべての広告主に対して出稿前に実在性確認（KYA）を義務付けるべき？広告プラットフォームは、詐欺広告から収益を得ている以上、当該詐欺に対して一定の法的責任を負うべき？プラットフォームが「詐欺だ」と知ってから一定時間（例24時間）以内に削除しない場合は、政府は高額の罰金あるいは罰則を課すべき？" }
{ "title": "地方創生は本当に必要か？", "description": "これまでの地方創生は「地方を元気に」というスローガンのもと、補助金と箱モノに偏りがちだった。そもそも人口が増えない前提の社会で、何をもって地方創生が「必要」と言えるのか、その目的と評価軸から問い直す。" }
{ "title": "毒親家庭と教師: 家庭環境に合わせた教育と教師の負担について", "description": "教師が抱える対応には限界があるなかで、どのような対策が求められるか？本人が家庭環境を普通だと思っている場合が多く、問題が表面化しにくい。指導や会話が長引き業務負担が極めて重くなる。子どもの発達に大きく影響し学校の指導だけで解決しないこともある。" }

JSON形式で出力してください（他の説明は不要です）：
{ "title": "30文字以内のタイトル", "description": "120文字以内の説明" }`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL,
			maxTokens: LLM_TOKEN_LIMITS.NEXT_TOPICS,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const topic = JSON.parse(jsonMatch[0]) as NextTopic;

		if (!topic.title || !topic.description) {
			throw new Error("Invalid topic structure: missing title or description");
		}

		return {
			title: topic.title,
			description: topic.description,
		};
	} catch (error) {
		console.error("Failed to generate next topic:", error);
		return null;
	}
}

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
