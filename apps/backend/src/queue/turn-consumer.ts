/**
 * Turn Queue Consumer
 * Processes agent statements in parallel with rate limit control
 */

import { LLM_MODEL, LLM_TOKEN_LIMITS } from "../config/constants";
import { callAnthropicAPI, isRateLimitError } from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type { Agent, KnowledgeEntry, Session, Statement, UserInput } from "../types/database";
import type { TurnProcessingResult, TurnQueueMessage } from "../types/queue";
import { parseAgentPersona } from "../utils/database";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

/**
 * Process a single agent statement from queue message
 */
export async function processAgentStatement(
	env: Bindings,
	message: TurnQueueMessage,
): Promise<TurnProcessingResult> {
	console.log(
		`[Queue] Processing agent ${message.agentId} for turn ${message.turnNumber} (attempt ${message.attempt + 1})`,
	);

	try {
		// 1-5. Fetch all data in parallel for better performance
		const [agent, session, knowledge, userInputs, previousStatements] = await Promise.all([
			getAgent(env.DB, message.agentId),
			getSession(env.DB, message.sessionId),
			getAgentKnowledge(env.DB, message.agentId),
			getRecentUserInputs(env.DB, message.agentId),
			getPreviousStatements(env.DB, message.sessionId),
		]);

		// Validation
		if (!agent) {
			throw new Error(`Agent ${message.agentId} not found`);
		}

		if (!session) {
			throw new Error(`Session ${message.sessionId} not found`);
		}

		// 6. Generate statement using LLM
		const statement = await generateStatement(
			env,
			agent,
			knowledge,
			userInputs,
			session,
			previousStatements,
			message.turnNumber,
		);

		// 7. Save statement
		const statementId = generateUUID();
		await env.DB.prepare(
			`INSERT INTO statements (id, turn_id, agent_id, content, thinking_process, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				statementId,
				message.turnId,
				message.agentId,
				statement.content,
				statement.thinking_process,
				getCurrentTimestamp(),
			)
			.run();

		console.log(`[Queue] Statement generated for agent ${message.agentId}`);

		return {
			success: true,
			agentId: message.agentId,
			statementId,
		};
	} catch (error) {
		console.error(`[Queue] Failed to process agent ${message.agentId}:`, error);

		return {
			success: false,
			agentId: message.agentId,
			error: error instanceof Error ? error.message : String(error),
			isRateLimitError: isRateLimitError(error),
		};
	}
}

/**
 * Get agent
 */
async function getAgent(db: D1Database, agentId: string): Promise<Agent | null> {
	const result = await db
		.prepare("SELECT id, user_id, name, persona, created_at, updated_at FROM agents WHERE id = ?")
		.bind(agentId)
		.first<Agent>();

	return result;
}

/**
 * Get session
 */
async function getSession(
	db: D1Database,
	sessionId: string,
): Promise<(Session & { topic_title: string; topic_description: string }) | null> {
	const result = await db
		.prepare(
			`SELECT s.*, t.title as topic_title, t.description as topic_description
       FROM sessions s
       JOIN topics t ON s.topic_id = t.id
       WHERE s.id = ?`,
		)
		.bind(sessionId)
		.first<Session & { topic_title: string; topic_description: string }>();

	return result;
}

/**
 * Get agent knowledge
 */
async function getAgentKnowledge(db: D1Database, agentId: string): Promise<KnowledgeEntry[]> {
	const result = await db
		.prepare(
			`SELECT id, title, content, created_at
       FROM knowledge_entries
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
		)
		.bind(agentId)
		.all<KnowledgeEntry>();

	return result.results;
}

/**
 * Get recent user inputs
 */
async function getRecentUserInputs(db: D1Database, agentId: string): Promise<UserInput[]> {
	const result = await db
		.prepare(
			`SELECT id, input_type, content, created_at
       FROM user_inputs
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
		)
		.bind(agentId)
		.all<UserInput>();

	return result.results;
}

/**
 * Get previous statements for a session
 */
async function getPreviousStatements(
	db: D1Database,
	sessionId: string,
): Promise<Array<Statement & { agent_name: string; turn_number: number }>> {
	const result = await db
		.prepare(
			`SELECT s.id, s.turn_id, s.agent_id, s.content, s.thinking_process, s.created_at,
              a.name as agent_name, t.turn_number
       FROM statements s
       JOIN agents a ON s.agent_id = a.id
       JOIN turns t ON s.turn_id = t.id
       WHERE t.session_id = ?
       ORDER BY t.turn_number ASC, s.created_at ASC
       LIMIT 50`,
		)
		.bind(sessionId)
		.all<Statement & { agent_name: string; turn_number: number }>();

	return result.results;
}

/**
 * Generate statement for an agent using LLM
 */
async function generateStatement(
	env: Bindings,
	agent: Agent,
	knowledge: KnowledgeEntry[],
	userInputs: UserInput[],
	session: Session & { topic_title: string; topic_description: string },
	previousStatements: Array<Statement & { agent_name: string; turn_number: number }>,
	currentTurn: number,
): Promise<{ content: string; thinking_process: string }> {
	const agentWithPersona = parseAgentPersona(agent);

	const systemPrompt = `あなたは「${agentWithPersona.name}」という名前の熟議エージェントです。

## あなたの人格
${JSON.stringify(agentWithPersona.persona, null, 2)}

## あなたの知識
${knowledge.map((k) => `- ${k.title}: ${k.content}`).join("\n") || "（特に知識はありません）"}

## ユーザーからの方針・フィードバック
${userInputs.map((i) => `[${i.input_type}] ${i.content}`).join("\n") || "（特に指示はありません）"}

## 熟議のルール
1. 他者の意見を尊重し、建設的に議論する
2. 自分の考えを明確に述べる
3. 根拠を示す
4. 150-300文字程度で簡潔に発言する
5. ユーザーの方針を徐々に反映させる

あなたの発言は他の参加者と共に読まれ、ユーザーに観察されます。`;

	const formatPreviousStatements = (
		statements: Array<Statement & { agent_name: string; turn_number: number }>,
	): string => {
		if (statements.length === 0) return "（まだ発言はありません）";

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
タイトル: ${session.topic_title}
説明: ${session.topic_description}

## これまでの議論（ターン ${currentTurn - 1} まで）
${formatPreviousStatements(previousStatements)}

## あなたの番です（ターン ${currentTurn}）

上記の議論を踏まえて、あなたの意見を述べてください。

まず<thinking>タグ内で思考プロセスを記述し、その後に発言を出力してください。

<thinking>
[ここに思考プロセス]
</thinking>

[ここに発言]`;

	try {
		const response = await callAnthropicAPI(env, {
			model: LLM_MODEL,
			max_tokens: LLM_TOKEN_LIMITS.STATEMENT,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse thinking and content
		const thinkingMatch = response.content.match(/<thinking>([\s\S]*?)<\/thinking>/);
		const thinking_process = thinkingMatch ? thinkingMatch[1].trim() : "";
		const content = response.content.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();

		return { content, thinking_process };
	} catch (error) {
		console.error("Failed to generate statement:", error);
		// Re-throw for queue retry handling
		throw error;
	}
}
