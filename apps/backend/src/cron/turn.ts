/**
 * Turn Cron - Turn Processing (every 15 minutes)
 * Enqueues agent statements to Queue for parallel processing with rate limit control
 */

import type { Bindings } from "../types/bindings";
import type { Session, Turn } from "../types/database";
import { getCurrentTimestamp } from "../utils/timestamp";

/**
 * Turn Cron Handler
 * Runs every 15 minutes to enqueue pending turns
 */
export async function runTurnCron(env: Bindings): Promise<void> {
	console.log("Turn Cron started:", new Date().toISOString());

	try {
		// 1. Get processing turns (for retry)
		const processingTurns = await getProcessingTurns(env.DB);

		// 2. Get pending turns
		const pendingTurns = await getPendingTurns(env.DB);

		// 3. Deduplicate: skip pending turns whose session already has a processing turn
		const processingSessions = new Set(processingTurns.map((t) => t.session_id));
		const filteredPendingTurns = pendingTurns.filter((t) => {
			if (processingSessions.has(t.session_id)) {
				console.log(
					`Skipping pending turn ${t.id} (session ${t.session_id} already has a processing turn)`,
				);
				return false;
			}
			return true;
		});

		const turnsToProcess = [...processingTurns, ...filteredPendingTurns];
		console.log(`Found ${turnsToProcess.length} turns to enqueue`);

		// 4. Enqueue all turns to Queue for parallel processing
		for (const turn of turnsToProcess) {
			try {
				await enqueueTurn(env, turn);
			} catch (error) {
				console.error(`Failed to enqueue turn ${turn.id}:`, error);
				// Don't mark as failed here - retry next cron run
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
 * Enqueue a single turn for processing
 * Sends messages to Queue for each participant
 */
async function enqueueTurn(env: Bindings, turn: Turn): Promise<void> {
	console.log(`Enqueueing turn ${turn.id} (turn ${turn.turn_number})`);

	// 1. Update turn status to processing
	await updateTurnStatus(env.DB, turn.id, "processing");
	const now = getCurrentTimestamp();
	await env.DB.prepare("UPDATE turns SET started_at = ? WHERE id = ?").bind(now, turn.id).run();

	// 2. Get session information
	const session = await getSession(env.DB, turn.session_id);
	if (!session) {
		throw new Error(`Session ${turn.session_id} not found`);
	}

	// 3. Get first participant (ordered by speaking_order) for sequential processing
	const firstParticipant = await getFirstSessionParticipant(env.DB, turn.session_id);
	if (!firstParticipant) {
		throw new Error(`No participants found for session ${turn.session_id}`);
	}

	// 4. Enqueue only the first participant; subsequent agents are chained by the consumer
	await env.TURN_QUEUE.send({
		turnId: turn.id,
		sessionId: turn.session_id,
		agentId: firstParticipant.agentId,
		turnNumber: turn.turn_number,
		speakingOrder: firstParticipant.speakingOrder,
		attempt: 0,
	});

	console.log(`Enqueued first agent (order ${firstParticipant.speakingOrder}) for turn ${turn.id}`);
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
 * Get the first session participant (lowest speaking_order)
 */
async function getFirstSessionParticipant(
	db: D1Database,
	sessionId: string,
): Promise<{ agentId: string; speakingOrder: number } | null> {
	const result = await db
		.prepare(
			`SELECT agent_id, speaking_order
       FROM session_participants
       WHERE session_id = ?
       ORDER BY speaking_order ASC
       LIMIT 1`,
		)
		.bind(sessionId)
		.first<{ agent_id: string; speaking_order: number }>();

	if (!result) return null;
	return { agentId: result.agent_id, speakingOrder: result.speaking_order };
}
