/**
 * Turn Cron - Turn Processing (every 15 minutes)
 * Processes pending turns and generates agent statements
 */

import {
	callAnthropicAPI,
	generateJudgeVerdict,
	generateSessionSummary,
	updateAgentPersona,
} from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type { Agent, KnowledgeEntry, Session, Statement, Turn, UserInput } from "../types/database";
import { parseAgentPersona } from "../utils/database";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

/**
 * Turn Cron Handler
 * Runs every 15 minutes to process pending turns
 */
export async function runTurnCron(env: Bindings): Promise<void> {
	console.log("Turn Cron started:", new Date().toISOString());

	try {
		// 1. Get processing turns (for retry)
		const processingTurns = await getProcessingTurns(env.DB);

		// 2. Get pending turns
		const pendingTurns = await getPendingTurns(env.DB);

		const turnsToProcess = [...processingTurns, ...pendingTurns];
		console.log(`Found ${turnsToProcess.length} turns to process`);

		for (const turn of turnsToProcess) {
			try {
				await processTurn(env, turn);
			} catch (error) {
				console.error(`Failed to process turn ${turn.id}:`, error);
				await updateTurnStatus(env.DB, turn.id, "failed");
			}
		}

		console.log("Turn Cron completed successfully");
	} catch (error) {
		console.error("Turn Cron failed:", error);
		throw error;
	}
}

/**
 * Get processing turns (for retry)
 */
async function getProcessingTurns(db: D1Database): Promise<Turn[]> {
	const result = await db
		.prepare(
			`SELECT id, session_id, turn_number, status, started_at, completed_at, created_at
       FROM turns
       WHERE status = 'processing'
       ORDER BY created_at ASC
       LIMIT 10`,
		)
		.all<Turn>();

	return result.results;
}

/**
 * Get pending turns
 */
async function getPendingTurns(db: D1Database): Promise<Turn[]> {
	const result = await db
		.prepare(
			`SELECT id, session_id, turn_number, status, started_at, completed_at, created_at
       FROM turns
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 10`,
		)
		.all<Turn>();

	return result.results;
}

/**
 * Process a single turn
 */
async function processTurn(env: Bindings, turn: Turn): Promise<void> {
	console.log(`Processing turn ${turn.id} (turn ${turn.turn_number})`);

	// 1. Update turn status to processing
	await updateTurnStatus(env.DB, turn.id, "processing");
	const now = getCurrentTimestamp();
	await env.DB.prepare("UPDATE turns SET started_at = ? WHERE id = ?").bind(now, turn.id).run();

	// 2. Get session information
	const session = await getSession(env.DB, turn.session_id);
	if (!session) {
		throw new Error(`Session ${turn.session_id} not found`);
	}

	// 3. Get previous statements
	const previousStatements = await getPreviousStatements(env.DB, turn.session_id);

	// 4. Get participants
	const participants = await getSessionParticipants(env.DB, turn.session_id);

	// 5. Generate statements for each participant in parallel
	const statementPromises = participants.map(async (participantAgentId) => {
		try {
			// Get agent data
			const agent = await getAgent(env.DB, participantAgentId);
			if (!agent) {
				console.error(`Agent ${participantAgentId} not found`);
				return;
			}

			// Get knowledge
			const knowledge = await getAgentKnowledge(env.DB, participantAgentId);

			// Get recent user inputs
			const userInputs = await getRecentUserInputs(env.DB, participantAgentId);

			// Generate statement using LLM
			const statement = await generateStatement(
				env,
				agent,
				knowledge,
				userInputs,
				session,
				previousStatements,
				turn.turn_number,
			);

			// Save statement
			const statementId = generateUUID();
			await env.DB.prepare(
				`INSERT INTO statements (id, turn_id, agent_id, content, thinking_process, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					statementId,
					turn.id,
					participantAgentId,
					statement.content,
					statement.thinking_process,
					getCurrentTimestamp(),
				)
				.run();

			console.log(`Statement generated for agent ${participantAgentId}`);
		} catch (error) {
			console.error(`Failed to generate statement for agent ${participantAgentId}:`, error);
			// Continue with other agents even if one fails
		}
	});

	await Promise.all(statementPromises);

	// 6. Mark turn as completed
	const completedAt = getCurrentTimestamp();
	await env.DB.prepare("UPDATE turns SET status = 'completed', completed_at = ? WHERE id = ?")
		.bind(completedAt, turn.id)
		.run();

	// 7. Update session current_turn
	await env.DB.prepare("UPDATE sessions SET current_turn = ?, updated_at = ? WHERE id = ?")
		.bind(turn.turn_number, completedAt, turn.session_id)
		.run();

	// 8. Check if session is complete
	if (turn.turn_number >= session.max_turns) {
		await completeSession(env, session);
	} else {
		// 9. Create next turn
		const nextTurnId = generateUUID();
		await env.DB.prepare(
			`INSERT INTO turns (id, session_id, turn_number, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
		)
			.bind(nextTurnId, turn.session_id, turn.turn_number + 1, getCurrentTimestamp())
			.run();

		console.log(`Created next turn ${turn.turn_number + 1} for session ${turn.session_id}`);
	}
}

/**
 * Complete a session
 */
async function completeSession(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
): Promise<void> {
	console.log(`Completing session ${session.id}`);

	try {
		// 1. Get all statements from the session
		const allStatements = await getAllStatements(env.DB, session.id);

		// 2. Generate session summary using LLM
		console.log(`Generating summary for session ${session.id}`);
		const summary = await generateSessionSummary(env, session, allStatements);

		// 3. Generate AI judge verdict using LLM
		console.log(`Generating judge verdict for session ${session.id}`);
		const judgeVerdict = await generateJudgeVerdict(env, session, allStatements);

		// 4. Update session with summary and verdict
		const now = getCurrentTimestamp();
		await env.DB.prepare(
			`UPDATE sessions
       SET status = 'completed',
           summary = ?,
           judge_verdict = ?,
           completed_at = ?,
           updated_at = ?
       WHERE id = ?`,
		)
			.bind(summary, JSON.stringify(judgeVerdict), now, now, session.id)
			.run();

		console.log(`Session ${session.id} completed with summary and verdict`);

		// 5. Update agent personas based on user inputs (Task #13)
		await updateAgentPersonas(env, session.id);
	} catch (error) {
		console.error(`Failed to complete session ${session.id}:`, error);
		// Mark as completed even if summary/verdict generation fails
		const now = getCurrentTimestamp();
		await env.DB.prepare(
			"UPDATE sessions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
		)
			.bind(now, now, session.id)
			.run();
	}
}

/**
 * Get all statements from a session
 */
async function getAllStatements(
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
       ORDER BY t.turn_number ASC, s.created_at ASC`,
		)
		.bind(sessionId)
		.all<Statement & { agent_name: string; turn_number: number }>();

	return result.results;
}

/**
 * Update turn status
 */
async function updateTurnStatus(
	db: D1Database,
	turnId: string,
	status: "pending" | "processing" | "completed" | "failed",
): Promise<void> {
	await db.prepare("UPDATE turns SET status = ? WHERE id = ?").bind(status, turnId).run();
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
       ORDER BY t.turn_number ASC, s.created_at ASC`,
		)
		.bind(sessionId)
		.all<Statement & { agent_name: string; turn_number: number }>();

	return result.results;
}

/**
 * Get session participants (agent IDs)
 */
async function getSessionParticipants(db: D1Database, sessionId: string): Promise<string[]> {
	const result = await db
		.prepare(
			`SELECT agent_id
       FROM session_participants
       WHERE session_id = ?`,
		)
		.bind(sessionId)
		.all<{ agent_id: string }>();

	return result.results.map((r) => r.agent_id);
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
 * Get agent knowledge
 */
async function getAgentKnowledge(db: D1Database, agentId: string): Promise<KnowledgeEntry[]> {
	const result = await db
		.prepare(
			`SELECT id, title, content, created_at
       FROM knowledge_entries
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
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
       LIMIT 50`,
		)
		.bind(agentId)
		.all<UserInput>();

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
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 1000,
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
		// Return fallback statement
		return {
			content: "（申し訳ございません。現在発言を生成できません。）",
			thinking_process: "Error occurred during statement generation",
		};
	}
}

/**
 * Update personas for all agents in a session
 */
async function updateAgentPersonas(env: Bindings, sessionId: string): Promise<void> {
	console.log(`Updating agent personas for session ${sessionId}`);

	try {
		// Get all participants
		const participants = await getSessionParticipants(env.DB, sessionId);

		// Update each agent's persona if they have unapplied user inputs
		for (const agentId of participants) {
			try {
				await updateSingleAgentPersona(env, agentId);
			} catch (error) {
				console.error(`Failed to update persona for agent ${agentId}:`, error);
				// Continue with other agents even if one fails
			}
		}

		console.log(`Agent personas updated for session ${sessionId}`);
	} catch (error) {
		console.error(`Failed to update agent personas for session ${sessionId}:`, error);
	}
}

/**
 * Update a single agent's persona
 */
async function updateSingleAgentPersona(env: Bindings, agentId: string): Promise<void> {
	// Get unapplied user inputs
	const unappliedInputs = await env.DB.prepare(
		`SELECT id, input_type, content, created_at
     FROM user_inputs
     WHERE agent_id = ? AND applied_at IS NULL
     ORDER BY created_at ASC`,
	)
		.bind(agentId)
		.all<UserInput>();

	if (unappliedInputs.results.length === 0) {
		// No unapplied inputs, skip update
		return;
	}

	// Get agent
	const agent = await getAgent(env.DB, agentId);
	if (!agent) {
		console.error(`Agent ${agentId} not found`);
		return;
	}

	console.log(
		`Updating persona for agent ${agent.name} with ${unappliedInputs.results.length} inputs`,
	);

	// Update persona using LLM
	const newPersona = await updateAgentPersona(env, agent, unappliedInputs.results);

	// Save updated persona
	const now = getCurrentTimestamp();
	await env.DB.prepare("UPDATE agents SET persona = ?, updated_at = ? WHERE id = ?")
		.bind(JSON.stringify(newPersona), now, agentId)
		.run();

	// Mark user inputs as applied
	for (const input of unappliedInputs.results) {
		await env.DB.prepare("UPDATE user_inputs SET applied_at = ? WHERE id = ?")
			.bind(now, input.id)
			.run();
	}

	console.log(`Persona updated for agent ${agent.name} to version ${newPersona.version}`);
}
