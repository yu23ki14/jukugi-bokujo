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
// Export
// ============================================================================

export default {
	fetch: app.fetch,
	scheduled: handleScheduledEvent,
};
