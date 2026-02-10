/**
 * Jukugi Bokujo (熟議牧場) Backend
 * Cloudflare Workers + Hono API with OpenAPI support
 */

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Bindings } from "./types/bindings";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// ============================================================================
// Middleware
// ============================================================================

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
			// TODO: Update with production frontend URL
			return origin;
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
			name: "User Inputs",
			description: "User directions and feedback for agents",
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

		// Get user inputs count per agent
		const userInputsCount = await c.env.DB.prepare(
			"SELECT agent_id, COUNT(*) as count, MAX(created_at) as last_input FROM user_inputs GROUP BY agent_id",
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
			user_inputs: userInputsCount.results,
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
       LEFT JOIN user_inputs ui ON a.id = ui.agent_id
       WHERE ui.created_at >= ?
          OR a.created_at >= ?
       GROUP BY a.id
       ORDER BY RANDOM()
       LIMIT ?`,
		)
			.bind(thresholdTimestamp, thresholdTimestamp, SESSION_PARTICIPANT_COUNT)
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

		// Get first participant
		const participant = await c.env.DB.prepare(
			"SELECT agent_id FROM session_participants WHERE session_id = ? LIMIT 1",
		)
			.bind(turn.session_id)
			.first<{ agent_id: string }>();

		if (!participant) {
			return c.json({ error: "No participants found for this turn" }, 404);
		}

		// Send test message to queue
		await c.env.TURN_QUEUE.send({
			turnId: turn.id,
			sessionId: turn.session_id,
			agentId: participant.agent_id,
			turnNumber: turn.turn_number,
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
import { knowledgeRouter } from "./routes/knowledge";
import { sessionsRouter } from "./routes/sessions";
import { adminTopicsRouter, publicTopicsRouter } from "./routes/topics";
import { userInputsRouter } from "./routes/user-inputs";

app.route("/api", publicTopicsRouter); // Public topics (no auth) - mount first
app.route("/api", adminTopicsRouter); // Admin topics (with auth)
app.route("/api/agents", agentsRouter);
app.route("/api", knowledgeRouter); // Mounts /agents/:agentId/knowledge and /knowledge/:id
app.route("/api", userInputsRouter); // Mounts /agents/:agentId/inputs
app.route("/api/sessions", sessionsRouter);

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

import { runMasterCron } from "./cron/master";
import { runTurnCron } from "./cron/turn";

async function handleScheduledEvent(event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
	console.log("Cron triggered at:", new Date(event.scheduledTime).toISOString());
	console.log("Cron type:", event.cron);

	try {
		// Both crons run on their scheduled intervals
		// Master Cron: every 6 hours (0 */6 * * *) - Creates new deliberation sessions
		// Turn Cron: every 15 minutes (*/15 * * * *) - Processes pending turns

		// Run Master Cron (session generation)
		await runMasterCron(env);

		// Run Turn Cron (turn processing)
		await runTurnCron(env);

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

async function handleQueueEvent(
	batch: MessageBatch<TurnQueueMessage>,
	env: Bindings,
	_ctx: ExecutionContext,
): Promise<void> {
	console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} messages`);

	// Track turns that had successful processing (for completion check)
	const processedTurns = new Set<string>();

	// Process all messages in parallel using Promise.allSettled
	const results = await Promise.allSettled(
		batch.messages.map(async (message) => {
			try {
				const result = await processAgentStatement(env, message.body);

				if (result.success) {
					console.log(
						`[Queue Consumer] Successfully processed agent ${result.agentId}, statement: ${result.statementId}`,
					);
					message.ack(); // Mark as successfully processed

					// Track this turn for completion check
					processedTurns.add(message.body.turnId);
				} else if (result.isRateLimitError) {
					// Rate limit error - retry with exponential backoff
					const delaySeconds = Math.min(
						API_RETRY_BASE_DELAY ** (message.attempts + 1),
						3600, // Max 1 hour
					);
					console.warn(
						`[Queue Consumer] Rate limit hit for agent ${result.agentId}, retrying after ${delaySeconds}s`,
					);
					message.retry({ delaySeconds });
				} else {
					// Other error - retry with default delay
					console.error(
						`[Queue Consumer] Processing failed for agent ${result.agentId}: ${result.error}`,
					);
					message.retry({ delaySeconds: 60 });
				}
			} catch (error) {
				// Unexpected error
				console.error(`[Queue Consumer] Unexpected error processing message:`, error);
				message.retry({ delaySeconds: 60 });
			}
		}),
	);

	// Log results summary
	const succeeded = results.filter((r) => r.status === "fulfilled").length;
	const failed = results.filter((r) => r.status === "rejected").length;
	console.log(
		`[Queue Consumer] Batch processed: ${succeeded} succeeded, ${failed} failed (will retry)`,
	);

	// Check if any turns are now complete
	// Use the first message to get session/turn info (all messages in batch are from same turn ideally)
	if (processedTurns.size > 0 && batch.messages.length > 0) {
		for (const turnId of processedTurns) {
			// Find a message for this turn
			const message = batch.messages.find((m) => m.body.turnId === turnId);
			if (message) {
				try {
					await checkAndCompleteTurn(
						env,
						message.body.turnId,
						message.body.sessionId,
						message.body.turnNumber,
					);
				} catch (error) {
					console.error(`[Queue Consumer] Failed to check turn completion:`, error);
					// Don't fail the batch if completion check fails
				}
			}
		}
	}
}

// ============================================================================
// Export
// ============================================================================

export default {
	fetch: app.fetch,
	scheduled: handleScheduledEvent,
	queue: handleQueueEvent,
};
