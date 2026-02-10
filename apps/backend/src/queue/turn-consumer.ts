/**
 * Turn Queue Consumer
 * Processes agent statements in parallel with rate limit control
 */

import { KNOWLEDGE_SLOTS_LIMIT, LLM_MODEL, LLM_TOKEN_LIMITS } from "../config/constants";
import { getModeStrategy } from "../config/session-modes/registry";
import { callAnthropicAPI, isRateLimitError } from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type {
	Agent,
	Direction,
	KnowledgeEntry,
	Session,
	SessionStrategy,
	Statement,
} from "../types/database";
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
		// Fetch all data in parallel
		const [agent, session, knowledge, direction, strategy, previousStatements] = await Promise.all([
			getAgent(env.DB, message.agentId),
			getSession(env.DB, message.sessionId),
			getAgentKnowledge(env.DB, message.agentId),
			getDirectionForTurn(env.DB, message.agentId, message.sessionId, message.turnNumber),
			getSessionStrategy(env.DB, message.agentId, message.sessionId),
			getPreviousStatements(env.DB, message.sessionId),
		]);

		if (!agent) {
			throw new Error(`Agent ${message.agentId} not found`);
		}

		if (!session) {
			throw new Error(`Session ${message.sessionId} not found`);
		}

		// Generate statement using LLM
		const statement = await generateStatement(
			env,
			agent,
			knowledge,
			direction,
			strategy,
			session,
			previousStatements,
			message.turnNumber,
		);

		// Save statement
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

async function getAgent(db: D1Database, agentId: string): Promise<Agent | null> {
	return await db
		.prepare("SELECT id, user_id, name, persona, created_at, updated_at FROM agents WHERE id = ?")
		.bind(agentId)
		.first<Agent>();
}

async function getSession(
	db: D1Database,
	sessionId: string,
): Promise<(Session & { topic_title: string; topic_description: string }) | null> {
	return await db
		.prepare(
			`SELECT s.id, s.topic_id, s.status, s.mode, s.mode_config,
              s.participant_count, s.current_turn, s.max_turns,
              s.summary, s.judge_verdict, s.started_at, s.completed_at,
              s.created_at, s.updated_at,
              t.title as topic_title, t.description as topic_description
       FROM sessions s
       JOIN topics t ON s.topic_id = t.id
       WHERE s.id = ?`,
		)
		.bind(sessionId)
		.first<Session & { topic_title: string; topic_description: string }>();
}

async function getAgentKnowledge(db: D1Database, agentId: string): Promise<KnowledgeEntry[]> {
	const result = await db
		.prepare(
			`SELECT id, title, content, created_at
       FROM knowledge_entries
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
		)
		.bind(agentId, KNOWLEDGE_SLOTS_LIMIT)
		.all<KnowledgeEntry>();

	return result.results;
}

async function getDirectionForTurn(
	db: D1Database,
	agentId: string,
	sessionId: string,
	turnNumber: number,
): Promise<Direction | null> {
	return await db
		.prepare(
			`SELECT id, agent_id, session_id, turn_number, content, created_at
       FROM directions
       WHERE agent_id = ? AND session_id = ? AND turn_number = ?
       LIMIT 1`,
		)
		.bind(agentId, sessionId, turnNumber)
		.first<Direction>();
}

async function getSessionStrategy(
	db: D1Database,
	agentId: string,
	sessionId: string,
): Promise<SessionStrategy | null> {
	return await db
		.prepare(
			`SELECT id, agent_id, session_id, feedback_id, strategy, created_at
       FROM session_strategies
       WHERE agent_id = ? AND session_id = ?
       LIMIT 1`,
		)
		.bind(agentId, sessionId)
		.first<SessionStrategy>();
}

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

async function generateStatement(
	env: Bindings,
	agent: Agent,
	knowledge: KnowledgeEntry[],
	direction: Direction | null,
	strategy: SessionStrategy | null,
	session: Session & { topic_title: string; topic_description: string },
	previousStatements: Array<Statement & { agent_name: string; turn_number: number }>,
	currentTurn: number,
): Promise<{ content: string; thinking_process: string }> {
	const agentWithPersona = parseAgentPersona(agent);

	const knowledgeSection =
		knowledge.map((k) => `- ${k.title}: ${k.content}`).join("\n") || "（特に知識はありません）";

	const strategySection = strategy ? `\n## 今回の熟議方針\n${strategy.strategy}\n` : "";

	const directionSection = direction
		? `\n## ユーザーからの指示（このターンのみ）\n${direction.content}\n`
		: "";

	const modeStrategy = getModeStrategy(session.mode ?? "double_diamond");
	const phaseConfig = modeStrategy.getPhaseConfig(currentTurn, session.max_turns);
	const phaseSection = modeStrategy.buildPhasePromptSection(
		phaseConfig,
		currentTurn,
		session.max_turns,
	);

	const rules = ["1. 他者の意見を尊重し、建設的に議論する", "2. 根拠を示す"];
	if (strategy) rules.push("3. 今回の熟議方針を意識して発言する");
	if (direction) rules.push(`${rules.length + 1}. ユーザーの指示を今回の発言に反映する`);

	const systemPrompt = `あなたは「${agentWithPersona.name}」という名前の熟議エージェントです。

## あなたの人格
${JSON.stringify(agentWithPersona.persona, null, 2)}
${strategySection}
## あなたの知識
${knowledgeSection}
${directionSection}
${phaseSection}

## 基本ルール
${rules.join("\n")}

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
${modeStrategy.getUserPromptSuffix(currentTurn, session.max_turns)}

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

		const thinkingMatch = response.content.match(/<thinking>([\s\S]*?)<\/thinking>/);
		const thinking_process = thinkingMatch ? thinkingMatch[1].trim() : "";
		const content = response.content.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();

		return { content, thinking_process };
	} catch (error) {
		console.error("Failed to generate statement:", error);
		throw error;
	}
}
