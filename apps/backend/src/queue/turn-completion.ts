/**
 * Turn Completion Handler
 * Checks if a turn is complete and handles session completion
 */

import {
	generateJudgeVerdict,
	generateSessionSummary,
	updateAgentPersona,
} from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type { Agent, Session, Statement, UserInput } from "../types/database";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

/**
 * Check if a turn is complete and handle completion
 * Returns true if turn was completed, false if still in progress
 */
export async function checkAndCompleteTurn(
	env: Bindings,
	turnId: string,
	sessionId: string,
	turnNumber: number,
): Promise<boolean> {
	// 1. Get expected participant count
	const participantCount = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM session_participants WHERE session_id = ?",
	)
		.bind(sessionId)
		.first<{ count: number }>();

	if (!participantCount) {
		console.error(`No participants found for session ${sessionId}`);
		return false;
	}

	// 2. Get actual statement count for this turn
	const statementCount = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM statements WHERE turn_id = ?",
	)
		.bind(turnId)
		.first<{ count: number }>();

	// 3. Check if all statements are generated
	if (statementCount && statementCount.count >= participantCount.count) {
		console.log(
			`[Turn Completion] Turn ${turnId} complete: ${statementCount.count}/${participantCount.count} statements`,
		);

		// 4. Mark turn as completed
		const completedAt = getCurrentTimestamp();
		await env.DB.prepare("UPDATE turns SET status = 'completed', completed_at = ? WHERE id = ?")
			.bind(completedAt, turnId)
			.run();

		// 5. Update session current_turn
		await env.DB.prepare("UPDATE sessions SET current_turn = ?, updated_at = ? WHERE id = ?")
			.bind(turnNumber, completedAt, sessionId)
			.run();

		// 6. Get session info to check max_turns
		const session = await getSession(env.DB, sessionId);
		if (!session) {
			console.error(`Session ${sessionId} not found`);
			return true;
		}

		// 7. Check if session is complete
		if (turnNumber >= session.max_turns) {
			console.log(`[Session Completion] Session ${sessionId} reached max turns, completing...`);
			await completeSession(env, session);
		} else {
			// 8. Create next turn
			const nextTurnId = generateUUID();
			await env.DB.prepare(
				"INSERT INTO turns (id, session_id, turn_number, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
			)
				.bind(nextTurnId, sessionId, turnNumber + 1, getCurrentTimestamp())
				.run();

			console.log(`[Turn Completion] Created next turn ${turnNumber + 1} for session ${sessionId}`);
		}

		return true;
	}

	console.log(
		`[Turn Completion] Turn ${turnId} in progress: ${statementCount?.count || 0}/${participantCount.count} statements`,
	);
	return false;
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
 * Complete a session
 */
async function completeSession(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
): Promise<void> {
	console.log(`[Session Completion] Completing session ${session.id}`);

	try {
		// 1. Get all statements from the session
		const allStatements = await getAllStatements(env.DB, session.id);

		// 2. Generate session summary using LLM
		console.log(`[Session Completion] Generating summary for session ${session.id}`);
		const summary = await generateSessionSummary(env, session, allStatements);

		// 3. Generate AI judge verdict using LLM
		console.log(`[Session Completion] Generating judge verdict for session ${session.id}`);
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

		console.log(`[Session Completion] Session ${session.id} completed with summary and verdict`);

		// 5. Update agent personas based on user inputs
		await updateAgentPersonas(env, session.id);
	} catch (error) {
		console.error(`[Session Completion] Failed to complete session ${session.id}:`, error);
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
 * Update personas for all agents in a session
 */
async function updateAgentPersonas(env: Bindings, sessionId: string): Promise<void> {
	console.log(`[Session Completion] Updating agent personas for session ${sessionId}`);

	try {
		// Get all participants
		const participants = await env.DB.prepare(
			"SELECT agent_id FROM session_participants WHERE session_id = ?",
		)
			.bind(sessionId)
			.all<{ agent_id: string }>();

		// Update each agent's persona in parallel for better performance
		const updatePromises = participants.results.map((participant) =>
			updateSingleAgentPersona(env, participant.agent_id).catch((error) => {
				console.error(
					`[Session Completion] Failed to update persona for agent ${participant.agent_id}:`,
					error,
				);
				// Swallow error to continue with other agents
			}),
		);

		await Promise.all(updatePromises);

		console.log(`[Session Completion] Agent personas updated for session ${sessionId}`);
	} catch (error) {
		console.error(
			`[Session Completion] Failed to update agent personas for session ${sessionId}:`,
			error,
		);
	}
}

/**
 * Update a single agent's persona
 */
async function updateSingleAgentPersona(env: Bindings, agentId: string): Promise<void> {
	// Fetch both user inputs and agent data in parallel
	const [unappliedInputs, agent] = await Promise.all([
		env.DB.prepare(
			`SELECT id, input_type, content, created_at
       FROM user_inputs
       WHERE agent_id = ? AND applied_at IS NULL
       ORDER BY created_at ASC`,
		)
			.bind(agentId)
			.all<UserInput>(),
		env.DB.prepare(
			"SELECT id, user_id, name, persona, created_at, updated_at FROM agents WHERE id = ?",
		)
			.bind(agentId)
			.first<Agent>(),
	]);

	// Validation
	if (unappliedInputs.results.length === 0) {
		// No unapplied inputs, skip update
		return;
	}

	if (!agent) {
		console.error(`[Session Completion] Agent ${agentId} not found`);
		return;
	}

	console.log(
		`[Session Completion] Updating persona for agent ${agent.name} with ${unappliedInputs.results.length} inputs`,
	);

	// Update persona using LLM
	const newPersona = await updateAgentPersona(env, agent, unappliedInputs.results);

	// Save updated persona
	const now = getCurrentTimestamp();
	await env.DB.prepare("UPDATE agents SET persona = ?, updated_at = ? WHERE id = ?")
		.bind(JSON.stringify(newPersona), now, agentId)
		.run();

	// Mark user inputs as applied (batch update for better performance)
	if (unappliedInputs.results.length > 0) {
		const inputIds = unappliedInputs.results.map((i) => i.id);
		const placeholders = inputIds.map(() => "?").join(",");
		await env.DB.prepare(`UPDATE user_inputs SET applied_at = ? WHERE id IN (${placeholders})`)
			.bind(now, ...inputIds)
			.run();
	}

	console.log(
		`[Session Completion] Persona updated for agent ${agent.name} to version ${newPersona.version}`,
	);
}
