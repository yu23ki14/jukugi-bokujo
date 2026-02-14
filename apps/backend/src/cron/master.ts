/**
 * Master Cron - Session Generation (every 6 hours)
 * Creates new deliberation sessions for active topics
 *
 * Algorithm:
 * 1. Fetch all active topics and agents
 * 2. Compute session count S = clamp(T, ceil(N/P), floor(N*M/P))
 * 3. Distribute topics evenly across sessions
 * 4. Assign agents in 2 phases: guarantee round + fill round
 * 5. Create sessions in DB
 */

import {
	AGENT_ACTIVITY_THRESHOLD_DAYS,
	MAX_SESSIONS_PER_AGENT,
	NPC_USER_ID,
	SESSION_PARTICIPANT_COUNT,
} from "../config/constants";
import { getAllModes } from "../config/session-modes/registry";
import { generateSessionStrategy } from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type { Agent, Feedback, Statement, Topic } from "../types/database";
import { getCurrentTimestamp, getTimestampDaysAgo } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

/**
 * Master Cron Handler
 * Runs every 6 hours to create new deliberation sessions
 */
export async function runMasterCron(env: Bindings): Promise<void> {
	console.log("Master Cron started:", new Date().toISOString());

	try {
		const activeTopics = await getActiveTopics(env.DB);
		console.log(`Found ${activeTopics.length} active topics`);

		if (activeTopics.length === 0) {
			console.log("No active topics, skipping session creation");
			return;
		}

		const agents = await getAllActiveAgents(env.DB);
		console.log(`Found ${agents.length} active agents`);

		if (agents.length === 0) {
			console.log("No active agents, skipping session creation");
			return;
		}

		const N = agents.length;
		const T = activeTopics.length;
		const P = SESSION_PARTICIPANT_COUNT;
		const M = MAX_SESSIONS_PER_AGENT;

		const S = computeSessionCount(N, P, M, T);
		console.log(`Session count: ${S} (N=${N}, T=${T}, P=${P}, M=${M})`);

		const topicAssignments = distributeTopics(S, activeTopics);
		const agentAssignments = assignAgents(agents, S, P, M);

		// Log agent participation counts
		const participationCount = new Map<string, number>();
		for (const sessionAgentIds of agentAssignments) {
			for (const id of sessionAgentIds) {
				participationCount.set(id, (participationCount.get(id) ?? 0) + 1);
			}
		}
		for (const agent of agents) {
			console.log(
				`Agent ${agent.name} (${agent.id}): ${participationCount.get(agent.id) ?? 0} sessions`,
			);
		}

		for (let i = 0; i < S; i++) {
			const topic = topicAssignments[i];
			const sessionAgentIds = agentAssignments[i];
			const sessionAgents = sessionAgentIds
				.map((id) => agents.find((a) => a.id === id))
				.filter((a): a is Agent => a !== undefined);

			console.log(
				`Creating session ${i + 1}/${S}: topic="${topic.title}", agents=[${sessionAgents.map((a) => a.name).join(", ")}]`,
			);

			try {
				await createSession(env, topic.id, sessionAgents);
			} catch (error) {
				console.error(`Failed to create session ${i + 1}:`, error);
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
 * Get all active agents (no LIMIT, no ORDER BY RANDOM)
 * Shuffling is done at the application level for fair scheduling.
 */
async function getAllActiveAgents(db: D1Database): Promise<Agent[]> {
	const thresholdTimestamp = getTimestampDaysAgo(AGENT_ACTIVITY_THRESHOLD_DAYS);

	const result = await db
		.prepare(
			`SELECT DISTINCT a.id, a.user_id, a.name, a.persona, a.status, a.created_at, a.updated_at
       FROM agents a
       LEFT JOIN feedbacks f ON a.id = f.agent_id
       LEFT JOIN knowledge_entries ke ON a.id = ke.agent_id
       WHERE a.status = 'active'
         AND a.user_id != ?
         AND (f.created_at >= ?
          OR ke.created_at >= ?
          OR a.created_at >= ?)
       GROUP BY a.id`,
		)
		.bind(NPC_USER_ID, thresholdTimestamp, thresholdTimestamp, thresholdTimestamp)
		.all<Agent>();

	return result.results;
}

/**
 * Compute the number of sessions to create.
 * S = clamp(T, ceil(N/P), floor(N*M/P))
 * If N < P, force S = 1.
 */
function computeSessionCount(N: number, P: number, M: number, T: number): number {
	if (N < P) return 1;

	const lower = Math.ceil(N / P);
	const upper = Math.floor((N * M) / P);
	return Math.max(lower, Math.min(T, upper));
}

/**
 * Distribute S sessions across T topics as evenly as possible.
 * Returns an array of length S where each element is the topic for that session.
 */
function distributeTopics(S: number, topics: Topic[]): Topic[] {
	const shuffledTopics = shuffle([...topics]);
	const T = shuffledTopics.length;
	const result: Topic[] = [];

	// Compute how many sessions each topic gets: floor(S/T) or ceil(S/T)
	const base = Math.floor(S / T);
	const remainder = S % T;

	for (let t = 0; t < T; t++) {
		const count = base + (t < remainder ? 1 : 0);
		for (let j = 0; j < count; j++) {
			result.push(shuffledTopics[t]);
		}
	}

	return result;
}

/**
 * Assign agents to S sessions using a 2-phase approach.
 *
 * Phase 1 (Guarantee): Shuffle all agents and round-robin assign to sessions.
 *   Every agent gets at least 1 session.
 *
 * Phase 2 (Fill): For sessions with fewer than P agents, fill from agents
 *   that have fewer than M assignments and are not already in the session.
 *   Prefer agents with the fewest current assignments.
 *
 * Returns an array of S arrays, each containing agent IDs.
 */
function assignAgents(agents: Agent[], S: number, P: number, M: number): string[][] {
	const sessions: string[][] = Array.from({ length: S }, () => []);
	const count = new Map<string, number>();
	for (const a of agents) {
		count.set(a.id, 0);
	}

	// Phase 1: guarantee round
	const shuffled = shuffle([...agents]);
	for (let i = 0; i < shuffled.length; i++) {
		const sessionIndex = i % S;
		sessions[sessionIndex].push(shuffled[i].id);
		count.set(shuffled[i].id, 1);
	}

	// Phase 2: fill remaining slots
	for (const session of sessions) {
		while (session.length < P) {
			const candidates = agents.filter(
				(a) => (count.get(a.id) ?? 0) < M && !session.includes(a.id),
			);
			if (candidates.length === 0) break;

			const minCount = Math.min(...candidates.map((a) => count.get(a.id) ?? 0));
			const best = candidates.filter((a) => count.get(a.id) === minCount);
			const chosen = best[Math.floor(Math.random() * best.length)];

			session.push(chosen.id);
			count.set(chosen.id, (count.get(chosen.id) ?? 0) + 1);
		}
	}

	return sessions;
}

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Create a single session in the database with the given topic and agents
 */
async function createSession(env: Bindings, topicId: string, agents: Agent[]): Promise<void> {
	const sessionId = generateUUID();
	const now = getCurrentTimestamp();

	// Pick a random mode
	const modes = getAllModes();
	const selectedMode = modes[Math.floor(Math.random() * modes.length)];
	const maxTurns = selectedMode.defaultMaxTurns;

	await env.DB.prepare(
		`INSERT INTO sessions (id, topic_id, status, mode, max_turns, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
	)
		.bind(sessionId, topicId, selectedMode.id, maxTurns, now, now)
		.run();

	console.log(`Selected mode: ${selectedMode.name} (${selectedMode.id}), maxTurns: ${maxTurns}`);

	// Add participants with speaking order
	for (let i = 0; i < agents.length; i++) {
		const agent = agents[i];
		const participantId = generateUUID();
		const speakingOrder = i + 1;

		await env.DB.prepare(
			`INSERT INTO session_participants (id, session_id, agent_id, joined_at, speaking_order)
       VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(participantId, sessionId, agent.id, now, speakingOrder)
			.run();
	}

	// Generate session strategies from feedback for each agent
	for (const agent of agents) {
		try {
			await generateAndSaveStrategy(env, agent, sessionId);
		} catch (error) {
			console.error(`Failed to generate strategy for agent ${agent.id}:`, error);
		}
	}

	// Update session status to active
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

	// Create initial turn (turn 1)
	const turnId = generateUUID();
	await env.DB.prepare(
		`INSERT INTO turns (id, session_id, turn_number, status, created_at)
     VALUES (?, ?, 1, 'pending', ?)`,
	)
		.bind(turnId, sessionId, now)
		.run();

	console.log(`Session ${sessionId} created with ${agents.length} participants`);
}

/**
 * Generate and save a session strategy for an agent based on their latest feedback
 */
async function generateAndSaveStrategy(
	env: Bindings,
	agent: Agent,
	sessionId: string,
): Promise<void> {
	const lastSession = await env.DB.prepare(
		`SELECT s.id FROM sessions s
     JOIN session_participants sp ON s.id = sp.session_id
     WHERE sp.agent_id = ? AND s.status = 'completed'
     ORDER BY s.completed_at DESC LIMIT 1`,
	)
		.bind(agent.id)
		.first<{ id: string }>();

	if (!lastSession) return;

	const feedback = await env.DB.prepare(
		`SELECT id, agent_id, session_id, content, applied_at, created_at
     FROM feedbacks
     WHERE agent_id = ? AND session_id = ?
     LIMIT 1`,
	)
		.bind(agent.id, lastSession.id)
		.first<Feedback>();

	if (!feedback) return;

	const previousStatements = await env.DB.prepare(
		`SELECT s.id, s.turn_id, s.agent_id, s.content, s.thinking_process, s.created_at,
            a.name as agent_name, t.turn_number
     FROM statements s
     JOIN agents a ON s.agent_id = a.id
     JOIN turns t ON s.turn_id = t.id
     WHERE t.session_id = ?
     ORDER BY t.turn_number ASC, s.created_at ASC`,
	)
		.bind(lastSession.id)
		.all<Statement & { agent_name: string; turn_number: number }>();

	const strategy = await generateSessionStrategy(env, agent, feedback, previousStatements.results);

	const strategyId = generateUUID();
	const now = getCurrentTimestamp();
	await env.DB.prepare(
		`INSERT INTO session_strategies (id, agent_id, session_id, feedback_id, strategy, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
	)
		.bind(strategyId, agent.id, sessionId, feedback.id, strategy, now)
		.run();

	console.log(`[Master Cron] Generated strategy for agent ${agent.name} in session ${sessionId}`);
}
