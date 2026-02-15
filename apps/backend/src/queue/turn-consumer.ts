/**
 * Turn Queue Consumer
 * Processes agent statements in parallel with rate limit control
 */

import {
	COMPRESSION_MIN_TURN,
	KNOWLEDGE_SLOTS_LIMIT,
	LLM_MODEL,
	LLM_TOKEN_LIMITS,
} from "../config/constants";
import { getModeStrategy } from "../config/session-modes/registry";
import { callLLM, isRateLimitError } from "../services/llm";
import type { Bindings } from "../types/bindings";
import type {
	Agent,
	Direction,
	KnowledgeEntry,
	Session,
	SessionStrategy,
	Statement,
	StatementWithAgent,
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
		const [agent, session, knowledge, direction, strategy, context] = await Promise.all([
			getAgent(env.DB, message.agentId),
			getSession(env.DB, message.sessionId),
			getAgentKnowledge(env.DB, message.agentId),
			getDirectionForTurn(env.DB, message.agentId, message.sessionId, message.turnNumber),
			getSessionStrategy(env.DB, message.agentId, message.sessionId),
			getContextForStatement(env.DB, message.sessionId, message.turnNumber, message.agentId),
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
			context,
			message.turnNumber,
		);

		// Save statement (including summary)
		const statementId = generateUUID();
		await env.DB.prepare(
			`INSERT INTO statements (id, turn_id, agent_id, content, summary, thinking_process, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				statementId,
				message.turnId,
				message.agentId,
				statement.content,
				statement.summary,
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

/**
 * Context data for statement generation, supporting 3-tier compression
 */
interface StatementContext {
	/** Whether compression is active */
	compressed: boolean;
	/** Tier 1: Rolling summary covering turns 1 through N-3 (null if no compression) */
	rollingSummary: string | null;
	/** The turn number covered up to by the rolling summary */
	summaryUpToTurn: number | null;
	/** Tier 2: Statements from turn N-2 with summary for masking */
	tier2Statements: Array<StatementWithAgent & { turn_number: number }> | null;
	/** Tier 2 turn number */
	tier2Turn: number | null;
	/** Tier 3: Full-text statements from turn N-1 */
	tier3Statements: Array<StatementWithAgent & { turn_number: number }> | null;
	/** Tier 3 turn number */
	tier3Turn: number | null;
	/** Fallback: all previous statements (used when compression is off or fallback) */
	allStatements: Array<Statement & { agent_name: string; turn_number: number }> | null;
}

async function getPreviousStatements(
	db: D1Database,
	sessionId: string,
): Promise<Array<Statement & { agent_name: string; turn_number: number }>> {
	const result = await db
		.prepare(
			`SELECT s.id, s.turn_id, s.agent_id, s.content, s.summary, s.thinking_process, s.created_at,
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
 * Get context for statement generation with 3-tier compression
 */
async function getContextForStatement(
	db: D1Database,
	sessionId: string,
	currentTurn: number,
	_agentId: string,
): Promise<StatementContext> {
	// No compression for early turns
	if (currentTurn < COMPRESSION_MIN_TURN) {
		const allStatements = await getPreviousStatements(db, sessionId);
		return {
			compressed: false,
			rollingSummary: null,
			summaryUpToTurn: null,
			tier2Statements: null,
			tier2Turn: null,
			tier3Statements: null,
			tier3Turn: null,
			allStatements,
		};
	}

	const tier2TurnNum = currentTurn - 2;
	const tier3TurnNum = currentTurn - 1;
	const summaryTurnNum = currentTurn - 3; // Summary should cover up to N-3

	// Fetch all three tiers in parallel
	const [summaryResult, tier2Result, tier3Result] = await Promise.all([
		// Tier 1: Rolling summary from turn N-3
		db
			.prepare(
				`SELECT summary FROM turns
         WHERE session_id = ? AND turn_number = ? AND status = 'completed'`,
			)
			.bind(sessionId, summaryTurnNum)
			.first<{ summary: string | null }>(),

		// Tier 2: Statements from turn N-2 (with summary column)
		db
			.prepare(
				`SELECT s.id, s.turn_id, s.agent_id, s.content, s.summary, s.thinking_process, s.created_at,
                a.name as agent_name, t.turn_number
         FROM statements s
         JOIN agents a ON s.agent_id = a.id
         JOIN turns t ON s.turn_id = t.id
         WHERE t.session_id = ? AND t.turn_number = ?
         ORDER BY s.created_at ASC`,
			)
			.bind(sessionId, tier2TurnNum)
			.all<StatementWithAgent & { turn_number: number }>(),

		// Tier 3: Statements from turn N-1 (full text)
		db
			.prepare(
				`SELECT s.id, s.turn_id, s.agent_id, s.content, s.summary, s.thinking_process, s.created_at,
                a.name as agent_name, t.turn_number
         FROM statements s
         JOIN agents a ON s.agent_id = a.id
         JOIN turns t ON s.turn_id = t.id
         WHERE t.session_id = ? AND t.turn_number = ?
         ORDER BY s.created_at ASC`,
			)
			.bind(sessionId, tier3TurnNum)
			.all<StatementWithAgent & { turn_number: number }>(),
	]);

	const rollingSummary = summaryResult?.summary ?? null;

	// Fallback: if no rolling summary available, use full text
	if (!rollingSummary) {
		console.log(
			`[Context Compression] No summary for turn ${summaryTurnNum}, falling back to full text`,
		);
		const allStatements = await getPreviousStatements(db, sessionId);
		return {
			compressed: false,
			rollingSummary: null,
			summaryUpToTurn: null,
			tier2Statements: null,
			tier2Turn: null,
			tier3Statements: null,
			tier3Turn: null,
			allStatements,
		};
	}

	return {
		compressed: true,
		rollingSummary,
		summaryUpToTurn: summaryTurnNum,
		tier2Statements: tier2Result.results,
		tier2Turn: tier2TurnNum,
		tier3Statements: tier3Result.results,
		tier3Turn: tier3TurnNum,
		allStatements: null,
	};
}

/**
 * Format context using 3-tier compression
 */
function formatCompressedContext(context: StatementContext, agentId: string): string {
	if (!context.compressed || !context.rollingSummary) {
		// Should not reach here, but fallback
		return "（コンテキスト情報がありません）";
	}

	const parts: string[] = [];

	// Tier 1: Rolling summary
	parts.push(`### 議論の要約（ターン1〜${context.summaryUpToTurn}）\n${context.rollingSummary}`);

	// Tier 2: Masked statements (self=full, others=summary)
	if (context.tier2Statements && context.tier2Statements.length > 0 && context.tier2Turn) {
		const tier2Lines = context.tier2Statements.map((s) => {
			const isSelf = s.agent_id === agentId;
			if (isSelf) {
				return `  - ${s.agent_name}（自分）: ${s.content}`;
			}
			// Use summary if available, otherwise fallback to full content
			const display = s.summary || s.content;
			return `  - ${s.agent_name}: ${display}`;
		});
		parts.push(`**ターン ${context.tier2Turn}**（概要）\n${tier2Lines.join("\n")}`);
	}

	// Tier 3: Full text
	if (context.tier3Statements && context.tier3Statements.length > 0 && context.tier3Turn) {
		const tier3Lines = context.tier3Statements.map((s) => `  - ${s.agent_name}: ${s.content}`);
		parts.push(`**ターン ${context.tier3Turn}**\n${tier3Lines.join("\n")}`);
	}

	return parts.join("\n\n");
}

/**
 * Format all previous statements (uncompressed, legacy format)
 */
function formatPreviousStatements(
	statements: Array<Statement & { agent_name: string; turn_number: number }>,
): string {
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
}

async function generateStatement(
	env: Bindings,
	agent: Agent,
	knowledge: KnowledgeEntry[],
	direction: Direction | null,
	strategy: SessionStrategy | null,
	session: Session & { topic_title: string; topic_description: string },
	context: StatementContext,
	currentTurn: number,
): Promise<{ content: string; summary: string | null; thinking_process: string }> {
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

	// Build context section based on compression state
	const contextSection = context.compressed
		? formatCompressedContext(context, agent.id)
		: formatPreviousStatements(context.allStatements ?? []);

	const userPrompt = `## トピック
タイトル: ${session.topic_title}
説明: ${session.topic_description}

## これまでの議論（ターン ${currentTurn - 1} まで）
${contextSection}

## あなたの番です（ターン ${currentTurn}）

上記の議論を踏まえて、あなたの意見を述べてください。
${modeStrategy.getUserPromptSuffix(currentTurn, session.max_turns)}

まず<thinking>タグ内で思考プロセスを記述し、その後に会話調の発言を出力してください。最後に<summary>タグ内にあなたの発言の1行要約（50文字以内）を記述してください。アスタリスクやMarkdownのフォーマットを一切使用せず、プレーンテキストだけで回答してください。

<thinking>
[ここに思考プロセス]
</thinking>

[ここに発言]

<summary>[1行要約 50文字以内]</summary>`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL,
			maxTokens: LLM_TOKEN_LIMITS.STATEMENT,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse thinking, summary, and content
		const thinkingMatch = response.content.match(/<thinking>([\s\S]*?)<\/thinking>/);
		const thinking_process = thinkingMatch ? thinkingMatch[1].trim() : "";

		const summaryMatch = response.content.match(/<summary>([\s\S]*?)<\/summary>/);
		const summary = summaryMatch ? summaryMatch[1].trim() : null;

		const content = response.content
			.replace(/<thinking>[\s\S]*?<\/thinking>/, "")
			.replace(/<summary>[\s\S]*?<\/summary>/, "")
			.trim();

		return { content, summary, thinking_process };
	} catch (error) {
		console.error("Failed to generate statement:", error);
		throw error;
	}
}
