/**
 * Tutorial session API route
 * Creates a tutorial session with NPC agents for new users
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { NPC_AGENT_IDS, TUTORIAL_MAX_TURNS, TUTORIAL_TOPIC } from "../config/constants";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import type { Bindings } from "../types/bindings";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

const tutorial = new OpenAPIHono<{ Bindings: Bindings }>();

tutorial.use("/*", clerkAuth);

// ============================================================================
// POST /api/tutorial-session - Create tutorial session
// ============================================================================

tutorial.post("/", async (c) => {
	const userId = getAuthUserId(c);
	const body = await c.req.json<{ agentId: string }>();
	const { agentId } = body;

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	// 1. Verify agent ownership
	const agent = await c.env.DB.prepare("SELECT id, user_id FROM agents WHERE id = ?")
		.bind(agentId)
		.first<{ id: string; user_id: string }>();

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}
	if (agent.user_id !== userId) {
		return c.json({ error: "Not your agent" }, 400);
	}

	// 2. Check if tutorial session already exists for this agent
	const existing = await c.env.DB.prepare(
		`SELECT s.id FROM sessions s
     JOIN session_participants sp ON s.id = sp.session_id
     WHERE s.is_tutorial = 1 AND sp.agent_id = ?
     LIMIT 1`,
	)
		.bind(agentId)
		.first<{ id: string }>();

	if (existing) {
		return c.json({ sessionId: existing.id });
	}

	// 3. Create tutorial topic
	const topicId = generateUUID();
	const now = getCurrentTimestamp();
	await c.env.DB.prepare(
		"INSERT INTO topics (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)",
	)
		.bind(topicId, TUTORIAL_TOPIC.title, TUTORIAL_TOPIC.description, now, now)
		.run();

	// 4. Create tutorial session
	const sessionId = generateUUID();
	await c.env.DB.prepare(
		`INSERT INTO sessions (id, topic_id, status, mode, max_turns, is_tutorial, participant_count, started_at, created_at, updated_at)
     VALUES (?, ?, 'active', 'tutorial', ?, 1, 4, ?, ?, ?)`,
	)
		.bind(sessionId, topicId, TUTORIAL_MAX_TURNS, now, now, now)
		.run();

	// 5. Add participants: user agent + 3 NPCs
	const allAgentIds = [agentId, ...NPC_AGENT_IDS];
	for (let i = 0; i < allAgentIds.length; i++) {
		await c.env.DB.prepare(
			"INSERT INTO session_participants (id, session_id, agent_id, joined_at, speaking_order) VALUES (?, ?, ?, ?, ?)",
		)
			.bind(generateUUID(), sessionId, allAgentIds[i], now, i + 1)
			.run();
	}

	// 6. Create turn 1 as processing and enqueue immediately
	const turnId = generateUUID();
	await c.env.DB.prepare(
		"INSERT INTO turns (id, session_id, turn_number, status, started_at, created_at) VALUES (?, ?, 1, 'processing', ?, ?)",
	)
		.bind(turnId, sessionId, now, now)
		.run();

	// 7. Enqueue first agent to start processing immediately
	const firstParticipant = await c.env.DB.prepare(
		"SELECT agent_id, speaking_order FROM session_participants WHERE session_id = ? ORDER BY speaking_order ASC LIMIT 1",
	)
		.bind(sessionId)
		.first<{ agent_id: string; speaking_order: number }>();

	if (firstParticipant) {
		await c.env.TURN_QUEUE.send({
			turnId,
			sessionId,
			agentId: firstParticipant.agent_id,
			turnNumber: 1,
			speakingOrder: firstParticipant.speaking_order,
			attempt: 0,
		});
	}

	return c.json({ sessionId });
});

export { tutorial as tutorialRouter };
