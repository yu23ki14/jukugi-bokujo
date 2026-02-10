/**
 * Master Cron - Session Generation (every 6 hours)
 * Creates new deliberation sessions for active topics
 */

import {
	AGENT_ACTIVITY_THRESHOLD_DAYS,
	SESSION_MAX_TURNS,
	SESSION_PARTICIPANT_COUNT,
} from "../config/constants";
import type { Bindings } from "../types/bindings";
import type { Agent, Topic } from "../types/database";
import { getCurrentTimestamp, getTimestampDaysAgo } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

/**
 * Master Cron Handler
 * Runs every 6 hours to create new deliberation sessions
 */
export async function runMasterCron(env: Bindings): Promise<void> {
	console.log("Master Cron started:", new Date().toISOString());

	try {
		// 1. Get active topics
		const activeTopics = await getActiveTopics(env.DB);
		console.log(`Found ${activeTopics.length} active topics`);

		for (const topic of activeTopics) {
			try {
				await createSessionForTopic(env, topic);
			} catch (error) {
				console.error(`Failed to create session for topic ${topic.id}:`, error);
				// Continue with next topic even if one fails
			}
		}

		console.log("Master Cron completed successfully");
	} catch (error) {
		console.error("Master Cron failed:", error);
		throw error;
	}
}

/**
 * Get all active topics
 */
async function getActiveTopics(db: D1Database): Promise<Topic[]> {
	const result = await db
		.prepare(
			`SELECT id, title, description, status, created_at, updated_at
       FROM topics
       WHERE status = 'active'
       ORDER BY created_at DESC`,
		)
		.all<Topic>();

	return result.results;
}

/**
 * Create a new session for a topic
 */
async function createSessionForTopic(env: Bindings, topic: Topic): Promise<void> {
	console.log(`Creating session for topic: ${topic.title}`);

	// 2. Create new session
	const sessionId = generateUUID();
	const now = getCurrentTimestamp();

	await env.DB.prepare(
		`INSERT INTO sessions (id, topic_id, status, max_turns, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?)`,
	)
		.bind(sessionId, topic.id, SESSION_MAX_TURNS, now, now)
		.run();

	// 3. Select active agents (fixed count: 4 agents)
	const participantCount = SESSION_PARTICIPANT_COUNT;
	const agents = await selectActiveAgents(env.DB, participantCount);

	if (agents.length === 0) {
		console.log(`No active agents available for topic ${topic.id}`);
		// Cancel the session if no agents available
		await env.DB.prepare("UPDATE sessions SET status = 'cancelled' WHERE id = ?")
			.bind(sessionId)
			.run();
		return;
	}

	console.log(`Selected ${agents.length} agents for session ${sessionId}`);

	// 4. Add participants with speaking order
	for (let i = 0; i < agents.length; i++) {
		const agent = agents[i];
		const participantId = generateUUID();
		const speakingOrder = i + 1; // 1-based order (1, 2, 3, 4)

		console.log(
			`Adding participant ${i + 1}/${agents.length}: agent=${agent.id} (${agent.name}), order=${speakingOrder}`,
		);

		try {
			const result = await env.DB.prepare(
				`INSERT INTO session_participants (id, session_id, agent_id, joined_at, speaking_order)
         VALUES (?, ?, ?, ?, ?)`,
			)
				.bind(participantId, sessionId, agent.id, now, speakingOrder)
				.run();

			console.log(`Participant ${agent.name} added successfully. Result:`, result);
		} catch (error) {
			console.error(`Failed to add participant ${agent.name}:`, error);
			throw error;
		}
	}

	// Verify participants were added
	const verifyResult = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM session_participants WHERE session_id = ?",
	)
		.bind(sessionId)
		.first<{ count: number }>();
	console.log(
		`Verification: ${verifyResult?.count || 0} participants added to session ${sessionId}`,
	);

	// 5. Update session status to active
	await env.DB.prepare(
		`UPDATE sessions
     SET status = 'active',
         started_at = ?,
         participant_count = ?,
         updated_at = ?
     WHERE id = ?`,
	)
		.bind(now, agents.length, now, sessionId)
		.run();

	// 6. Create initial turn (turn 1)
	const turnId = generateUUID();
	await env.DB.prepare(
		`INSERT INTO turns (id, session_id, turn_number, status, created_at)
     VALUES (?, ?, 1, 'pending', ?)`,
	)
		.bind(turnId, sessionId, now)
		.run();

	console.log(`Session ${sessionId} created successfully with ${agents.length} participants`);
}

/**
 * Select active agents for deliberation
 * Criteria:
 * - User input within last N days, OR
 * - Agent created within last N days
 */
async function selectActiveAgents(db: D1Database, count: number): Promise<Agent[]> {
	const thresholdTimestamp = getTimestampDaysAgo(AGENT_ACTIVITY_THRESHOLD_DAYS);

	const result = await db
		.prepare(
			`SELECT DISTINCT a.id, a.user_id, a.name, a.persona, a.created_at, a.updated_at
       FROM agents a
       LEFT JOIN user_inputs ui ON a.id = ui.agent_id
       WHERE ui.created_at >= ?          -- User input within threshold days
          OR a.created_at >= ?            -- OR agent created within threshold days
       GROUP BY a.id
       ORDER BY RANDOM()
       LIMIT ?`,
		)
		.bind(thresholdTimestamp, thresholdTimestamp, count)
		.all<Agent>();

	return result.results;
}
