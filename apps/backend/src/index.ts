/**
 * Jukugi Bokujo (熟議牧場) Backend
 * Cloudflare Workers + Hono API with OpenAPI support
 */

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { Bindings } from "./types/bindings";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// ============================================================================
// Middleware
// ============================================================================

// Request/Response logger
app.use("/*", logger());

// CORS middleware - allow frontend origin
app.use(
	"/*",
	cors({
		origin: (origin) => {
			// In development, allow localhost
			if (origin.startsWith("http://localhost:")) {
				return origin;
			}
			// In production, allow specific domains
			if (origin.includes("https://jukugi-bokujo.pages.dev")) {
				return origin;
			}
			return null;
		},
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// ============================================================================
// Health Check
// ============================================================================

app.get("/", (c) => {
	return c.json({
		message: "Jukugi Bokujo API",
		version: "1.0.0",
		environment: c.env.ENVIRONMENT || "development",
		openapi: "/api/openapi.json",
		docs: "/api/docs",
	});
});

app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================================
// OpenAPI Documentation (must be before route mounting)
// ============================================================================

// OpenAPI JSON specification
app.doc("/api/openapi.json", {
	openapi: "3.0.0",
	info: {
		title: "Jukugi Bokujo API",
		version: "1.0.0",
		description:
			"API for Jukugi Bokujo (熟議牧場 / Deliberation Ranch) - A civic tech platform where users own AI deliberation agents that automatically engage in discussions.",
	},
	servers: [
		{
			url: "http://localhost:8787",
			description: "Local development server",
		},
	],
	tags: [
		{
			name: "Agents",
			description: "Agent management endpoints",
		},
		{
			name: "Knowledge",
			description: "Knowledge base management for agents",
		},
		{
			name: "Directions",
			description: "Real-time tactical directions during sessions",
		},
		{
			name: "Feedbacks",
			description: "Post-session feedback, reflection, and strategies",
		},
		{
			name: "Sessions",
			description: "Deliberation session endpoints",
		},
		{
			name: "Topics",
			description: "Topic management endpoints",
		},
	],
} as const);

// Swagger UI
app.get(
	"/api/docs",
	swaggerUI({
		url: "/api/openapi.json",
	}),
);

// Database Test Endpoint (public for testing)
app.get("/api/test-db", async (c) => {
	try {
		const result = await c.env.DB.prepare("SELECT 1 as test").first();
		return c.json({ success: true, result });
	} catch (error) {
		console.error("Database error:", error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Debug endpoint to check database state (development only)
app.get("/api/test-db/state", async (c) => {
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		// Count records in key tables
		const [topics, agents, sessions, participants] = await Promise.all([
			c.env.DB.prepare("SELECT COUNT(*) as count, status FROM topics GROUP BY status").all(),
			c.env.DB.prepare("SELECT COUNT(*) as count FROM agents").first<{ count: number }>(),
			c.env.DB.prepare("SELECT COUNT(*) as count, status FROM sessions GROUP BY status").all(),
			c.env.DB.prepare("SELECT COUNT(*) as count FROM session_participants").first<{
				count: number;
			}>(),
		]);

		// Get recent sessions
		const recentSessions = await c.env.DB.prepare(
			"SELECT id, topic_id, status, participant_count, created_at FROM sessions ORDER BY created_at DESC LIMIT 5",
		).all();

		// Get agents with their created_at timestamps
		const allAgents = await c.env.DB.prepare(
			"SELECT id, name, created_at, updated_at FROM agents ORDER BY created_at DESC",
		).all();

		// Get feedbacks count per agent
		const feedbacksCount = await c.env.DB.prepare(
			"SELECT agent_id, COUNT(*) as count, MAX(created_at) as last_feedback FROM feedbacks GROUP BY agent_id",
		).all();

		// Calculate current timestamp and 3-day threshold
		const now = Math.floor(Date.now() / 1000);
		const threeDaysAgo = now - 3 * 24 * 60 * 60;

		return c.json({
			topics: topics.results,
			agents: agents?.count || 0,
			sessions: sessions.results,
			participants: participants?.count || 0,
			recent_sessions: recentSessions.results,
			agent_details: allAgents.results,
			feedbacks: feedbacksCount.results,
			timestamp_info: {
				current_timestamp: now,
				three_days_ago_threshold: threeDaysAgo,
				note: "Agents need created_at >= threshold OR user_input within threshold to be selected",
			},
		});
	} catch (error) {
		console.error("Database state check failed:", error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Debug endpoint to test agent selection query (development only)
app.get("/api/test-db/agent-selection", async (c) => {
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		const { getTimestampDaysAgo } = await import("./utils/timestamp");
		const { AGENT_ACTIVITY_THRESHOLD_DAYS, SESSION_PARTICIPANT_COUNT } = await import(
			"./config/constants"
		);

		const thresholdTimestamp = getTimestampDaysAgo(AGENT_ACTIVITY_THRESHOLD_DAYS);
		const now = Math.floor(Date.now() / 1000);

		// Test the exact query used in selectActiveAgents
		const result = await c.env.DB.prepare(
			`SELECT DISTINCT a.id, a.user_id, a.name, a.persona, a.created_at, a.updated_at
       FROM agents a
       LEFT JOIN feedbacks f ON a.id = f.agent_id
       LEFT JOIN knowledge_entries ke ON a.id = ke.agent_id
       WHERE f.created_at >= ?
          OR ke.created_at >= ?
          OR a.created_at >= ?
       GROUP BY a.id
       ORDER BY RANDOM()
       LIMIT ?`,
		)
			.bind(thresholdTimestamp, thresholdTimestamp, thresholdTimestamp, SESSION_PARTICIPANT_COUNT)
			.all();

		// Also test a simpler query
		const simpleResult = await c.env.DB.prepare(
			`SELECT id, name, created_at FROM agents WHERE created_at >= ? LIMIT ?`,
		)
			.bind(thresholdTimestamp, SESSION_PARTICIPANT_COUNT)
			.all();

		return c.json({
			threshold_timestamp: thresholdTimestamp,
			current_timestamp: now,
			days_threshold: AGENT_ACTIVITY_THRESHOLD_DAYS,
			participant_count: SESSION_PARTICIPANT_COUNT,
			complex_query_results: result.results,
			simple_query_results: simpleResult.results,
		});
	} catch (error) {
		console.error("Agent selection test failed:", error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Clean up test data (development only)
app.delete("/api/test-db/clean-sessions", async (c) => {
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		// Delete sessions and related data
		await c.env.DB.prepare("DELETE FROM statements").run();
		await c.env.DB.prepare("DELETE FROM turns").run();
		await c.env.DB.prepare("DELETE FROM session_participants").run();
		await c.env.DB.prepare("DELETE FROM sessions").run();

		return c.json({
			success: true,
			message: "All sessions and related data deleted",
		});
	} catch (error) {
		console.error("Clean sessions failed:", error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Cron Test Endpoints (development only)
app.post("/api/test-cron/master", async (c) => {
	// Only allow in development/test mode
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		const { runMasterCron } = await import("./cron/master");
		console.log("Manual Master Cron trigger at:", new Date().toISOString());

		await runMasterCron(c.env);

		return c.json({
			success: true,
			message: "Master Cron executed successfully (session generation)",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Master Cron execution failed:", error);
		return c.json(
			{
				success: false,
				error: String(error),
				message: "Master Cron execution failed",
			},
			500,
		);
	}
});

app.post("/api/test-cron/turn", async (c) => {
	// Only allow in development/test mode
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		const { runTurnCron } = await import("./cron/turn");
		console.log("Manual Turn Cron trigger at:", new Date().toISOString());

		await runTurnCron(c.env);

		return c.json({
			success: true,
			message: "Turn Cron executed successfully (enqueued turns to Queue for processing)",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Turn Cron execution failed:", error);
		return c.json(
			{
				success: false,
				error: String(error),
				message: "Turn Cron execution failed",
			},
			500,
		);
	}
});

// Queue Test Endpoint (development only)
app.post("/api/test-queue/send", async (c) => {
	// Only allow in development/test mode
	if (c.env.ENVIRONMENT !== "development" && c.env.TEST_MODE !== "true") {
		return c.json({ error: "Forbidden - only available in development" }, 403);
	}

	try {
		// Get a pending turn to test with
		const turn = await c.env.DB.prepare(
			"SELECT id, session_id, turn_number FROM turns WHERE status = 'pending' LIMIT 1",
		).first<{ id: string; session_id: string; turn_number: number }>();

		if (!turn) {
			return c.json({ error: "No pending turns found. Run master cron first." }, 404);
		}

		// Get first participant (by speaking_order)
		const participant = await c.env.DB.prepare(
			"SELECT agent_id, speaking_order FROM session_participants WHERE session_id = ? ORDER BY speaking_order ASC LIMIT 1",
		)
			.bind(turn.session_id)
			.first<{ agent_id: string; speaking_order: number }>();

		if (!participant) {
			return c.json({ error: "No participants found for this turn" }, 404);
		}

		// Send test message to queue
		await c.env.TURN_QUEUE.send({
			turnId: turn.id,
			sessionId: turn.session_id,
			agentId: participant.agent_id,
			turnNumber: turn.turn_number,
			speakingOrder: participant.speaking_order,
			attempt: 0,
		});

		return c.json({
			success: true,
			message: "Test message sent to Queue",
			data: {
				turnId: turn.id,
				sessionId: turn.session_id,
				agentId: participant.agent_id,
				turnNumber: turn.turn_number,
				speakingOrder: participant.speaking_order,
			},
		});
	} catch (error) {
		console.error("Queue test failed:", error);
		return c.json(
			{
				success: false,
				error: String(error),
			},
			500,
		);
	}
});

// ============================================================================
// API Routes
// ============================================================================

import { agentsRouter } from "./routes/agents";
import { directionsRouter } from "./routes/directions";
import { feedbackRequestsRouter } from "./routes/feedback-requests";
import { feedbacksRouter } from "./routes/feedbacks";
import { knowledgeRouter } from "./routes/knowledge";
import { reflectionsRouter } from "./routes/reflections";
import { protectedSessionsRouter, publicSessionsRouter } from "./routes/sessions";
import { adminTopicsRouter, publicTopicsRouter } from "./routes/topics";
import { tutorialRouter } from "./routes/tutorial";

app.route("/api", publicTopicsRouter); // Public topics (no auth) - mount first
app.route("/api", adminTopicsRouter); // Admin topics (with auth)
app.route("/api/agents", agentsRouter);
app.route("/api", knowledgeRouter); // Mounts /agents/:agentId/knowledge and /knowledge/:id
app.route("/api", directionsRouter); // Mounts /agents/:agentId/directions
app.route("/api", feedbacksRouter); // Mounts /agents/:agentId/feedbacks and /agents/:agentId/strategies
app.route("/api", feedbackRequestsRouter); // Mounts /feedback-requests
app.route("/api", reflectionsRouter); // Mounts /agents/:agentId/reflections and /agents/:agentId/persona-changes
app.route("/api/sessions", publicSessionsRouter); // Public sessions (no auth)
app.route("/api/sessions", protectedSessionsRouter); // Protected sessions (with auth)
app.route("/api/tutorial-session", tutorialRouter); // Tutorial session (with auth)

// ============================================================================
// 404 Handler
// ============================================================================

app.notFound((c) => {
	return c.json({ error: "Not Found" }, 404);
});

// ============================================================================
// Error Handler
// ============================================================================

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ error: err.message }, err.status);
	}
	console.error("Unhandled error:", err);
	return c.json(
		{
			error: "Internal Server Error",
			message: err.message,
		},
		500,
	);
});

// ============================================================================
// Cron Handler
// ============================================================================

import { CRON_SCHEDULE_MASTER, CRON_SCHEDULE_TURN } from "./config/constants";
import { runMasterCron } from "./cron/master";
import { runTurnCron } from "./cron/turn";

async function handleScheduledEvent(event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
	console.log("Cron triggered at:", new Date(event.scheduledTime).toISOString());
	console.log("Cron type:", event.cron);

	try {
		switch (event.cron) {
			case CRON_SCHEDULE_MASTER:
				await runMasterCron(env);
				break;
			case CRON_SCHEDULE_TURN:
				await runTurnCron(env);
				break;
			default:
				console.warn("Unknown cron schedule:", event.cron);
		}

		console.log("Cron execution completed successfully");
	} catch (error) {
		console.error("Cron execution failed:", error);
		// Re-throw to let Cloudflare Workers know the cron failed
		throw error;
	}
}

// ============================================================================
// Queue Consumer Handler
// ============================================================================

import { API_RETRY_BASE_DELAY } from "./config/constants";
import { checkAndCompleteTurn } from "./queue/turn-completion";
import { processAgentStatement } from "./queue/turn-consumer";
import type { TurnQueueMessage } from "./types/queue";

/**
 * Get the next session participant after the given speaking order
 */
async function getNextSessionParticipant(
	db: D1Database,
	sessionId: string,
	currentSpeakingOrder: number,
): Promise<{ agentId: string; speakingOrder: number } | null> {
	const result = await db
		.prepare(
			`SELECT agent_id, speaking_order
       FROM session_participants
       WHERE session_id = ? AND speaking_order > ?
       ORDER BY speaking_order ASC
       LIMIT 1`,
		)
		.bind(sessionId, currentSpeakingOrder)
		.first<{ agent_id: string; speaking_order: number }>();

	if (!result) return null;
	return { agentId: result.agent_id, speakingOrder: result.speaking_order };
}

async function handleQueueEvent(
	batch: MessageBatch<TurnQueueMessage>,
	env: Bindings,
	_ctx: ExecutionContext,
): Promise<void> {
	console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} messages`);

	// Process messages in parallel
	await Promise.all(
		batch.messages.map(async (message) => {
			// 0. If this is the first agent in the turn, flip pending → processing
			if (message.body.speakingOrder === 1) {
				const now = Math.floor(Date.now() / 1000);
				await env.DB.prepare(
					"UPDATE turns SET status = 'processing', started_at = COALESCE(started_at, ?) WHERE id = ? AND status = 'pending'",
				)
					.bind(now, message.body.turnId)
					.run();
			}

			// 1. Process this agent's statement
			try {
				const result = await processAgentStatement(env, message.body);

				if (result.success) {
					console.log(
						`[Queue Consumer] Successfully processed agent ${result.agentId} ` +
							`(order ${message.body.speakingOrder}), statement: ${result.statementId}`,
					);
					message.ack();
				} else {
					// Failed but don't block the chain - ack and move on
					console.error(
						`[Queue Consumer] Processing failed for agent ${result.agentId}: ${result.error}, ` +
							`skipping and continuing chain`,
					);
					message.ack();
				}
			} catch (error) {
				console.error(
					`[Queue Consumer] Unexpected error for agent ${message.body.agentId}, ` +
						`skipping and continuing chain:`,
					error,
				);
				message.ack();
			}

			// 2. Always chain to next agent or complete the turn
			try {
				const nextParticipant = await getNextSessionParticipant(
					env.DB,
					message.body.sessionId,
					message.body.speakingOrder,
				);

				if (nextParticipant) {
					await env.TURN_QUEUE.send({
						turnId: message.body.turnId,
						sessionId: message.body.sessionId,
						agentId: nextParticipant.agentId,
						turnNumber: message.body.turnNumber,
						speakingOrder: nextParticipant.speakingOrder,
						attempt: 0,
					});
					console.log(
						`[Queue Consumer] Chained next agent (order ${nextParticipant.speakingOrder}) ` +
							`for turn ${message.body.turnId}`,
					);
				} else {
					// Last agent in order - complete the turn regardless of failures
					await checkAndCompleteTurn(
						env,
						message.body.turnId,
						message.body.sessionId,
						message.body.turnNumber,
					);
				}
			} catch (chainError) {
				console.error(`[Queue Consumer] Failed to chain next agent:`, chainError);
			}
		}),
	);
}

// ============================================================================
// Export
// ============================================================================

export default {
	fetch: app.fetch,
	scheduled: handleScheduledEvent,
	queue: handleQueueEvent,
};
