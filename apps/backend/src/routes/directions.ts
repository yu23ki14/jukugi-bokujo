/**
 * Directions API routes (OpenAPI)
 * Real-time tactical instructions during active sessions
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import {
	CreateDirectionRequestSchema,
	CreateDirectionResponseSchema,
	ListDirectionsResponseSchema,
} from "../schemas/directions";
import type { Bindings } from "../types/bindings";
import type { Agent, Direction, Session } from "../types/database";
import { forbidden, handleDatabaseError, notFound, sendError } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

const directions = new OpenAPIHono<{ Bindings: Bindings }>();

directions.use("/*", clerkAuth);

// ============================================================================
// POST /agents/:agentId/directions - Add direction during active session
// ============================================================================

const createDirectionRoute = createRoute({
	method: "post",
	path: "/agents/{agentId}/directions",
	tags: ["Directions"],
	summary: "Add direction to agent during session",
	description:
		"Provide a short tactical instruction (max 80 chars) to guide agent behavior for a specific turn",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			agentId: z
				.string()
				.uuid()
				.openapi({
					param: { name: "agentId", in: "path" },
					description: "Agent ID",
				}),
		}),
		body: {
			content: {
				"application/json": {
					schema: CreateDirectionRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Direction created successfully",
			content: { "application/json": { schema: CreateDirectionResponseSchema } },
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Agent or session not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		409: {
			description: "Direction already exists for this turn",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Internal server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

directions.openapi(createDirectionRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const body = c.req.valid("json");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		// Check session is active
		const session = await c.env.DB.prepare("SELECT status, current_turn FROM sessions WHERE id = ?")
			.bind(body.session_id)
			.first<Session>();

		if (!session) return notFound(c, "Session");
		if (session.status !== "active") {
			return sendError(c, 400, "Session is not active", "SESSION_NOT_ACTIVE");
		}

		// Check agent is a participant
		const participant = await c.env.DB.prepare(
			"SELECT id FROM session_participants WHERE session_id = ? AND agent_id = ?",
		)
			.bind(body.session_id, agentId)
			.first();

		if (!participant) {
			return sendError(c, 400, "Agent is not a participant in this session", "NOT_PARTICIPANT");
		}

		// Check no existing direction for this turn
		const existing = await c.env.DB.prepare(
			"SELECT id FROM directions WHERE agent_id = ? AND session_id = ? AND turn_number = ?",
		)
			.bind(agentId, body.session_id, body.turn_number)
			.first();

		if (existing) {
			return sendError(c, 409, "Direction already exists for this turn", "DIRECTION_EXISTS");
		}

		const directionId = generateUUID();
		const now = getCurrentTimestamp();

		await c.env.DB.prepare(
			`INSERT INTO directions (id, agent_id, session_id, turn_number, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(directionId, agentId, body.session_id, body.turn_number, body.content.trim(), now)
			.run();

		return c.json(
			{
				id: directionId,
				agent_id: agentId,
				session_id: body.session_id,
				turn_number: body.turn_number,
				content: body.content.trim(),
				created_at: now,
			},
			201,
		);
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /agents/:agentId/directions - List directions for agent
// ============================================================================

const listDirectionsRoute = createRoute({
	method: "get",
	path: "/agents/{agentId}/directions",
	tags: ["Directions"],
	summary: "List agent's directions",
	description: "Get directions for a specific agent, optionally filtered by session",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			agentId: z
				.string()
				.uuid()
				.openapi({
					param: { name: "agentId", in: "path" },
					description: "Agent ID",
				}),
		}),
		query: z.object({
			session_id: z
				.string()
				.uuid()
				.optional()
				.openapi({
					param: { name: "session_id", in: "query" },
					description: "Filter by session ID",
				}),
		}),
	},
	responses: {
		200: {
			description: "List of directions",
			content: { "application/json": { schema: ListDirectionsResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Agent not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Internal server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

directions.openapi(listDirectionsRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const { session_id } = c.req.valid("query");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		let result: D1Result<Direction>;
		if (session_id) {
			result = await c.env.DB.prepare(
				`SELECT id, session_id, turn_number, content, created_at
         FROM directions WHERE agent_id = ? AND session_id = ?
         ORDER BY turn_number ASC`,
			)
				.bind(agentId, session_id)
				.all<Direction>();
		} else {
			result = await c.env.DB.prepare(
				`SELECT id, session_id, turn_number, content, created_at
         FROM directions WHERE agent_id = ?
         ORDER BY created_at DESC LIMIT 50`,
			)
				.bind(agentId)
				.all<Direction>();
		}

		return c.json({
			directions: result.results.map((d) => ({
				id: d.id,
				session_id: d.session_id,
				turn_number: d.turn_number,
				content: d.content,
				created_at: d.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { directions as directionsRouter };
