/**
 * Session management API routes (OpenAPI)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import {
	GetSessionResponseSchema,
	GetSessionTurnsResponseSchema,
	ListSessionsQuerySchema,
	ListSessionsResponseSchema,
} from "../schemas/sessions";
import type { Bindings } from "../types/bindings";
import type { JudgeVerdict, Session, Statement, Turn } from "../types/database";
import { handleDatabaseError, notFound } from "../utils/errors";

const sessions = new OpenAPIHono<{ Bindings: Bindings }>();

// Apply authentication to all routes
sessions.use("/*", clerkAuth);

// ============================================================================
// GET /api/sessions - List sessions (user's agents participated in)
// ============================================================================

const listSessionsRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Sessions"],
	summary: "List sessions",
	description: "Get a list of deliberation sessions where the user's agents participated",
	security: [{ bearerAuth: [] }],
	request: {
		query: ListSessionsQuerySchema,
	},
	responses: {
		200: {
			description: "List of sessions",
			content: {
				"application/json": {
					schema: ListSessionsResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

sessions.openapi(listSessionsRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { status, limit, offset } = c.req.valid("query");

	try {
		// Build query to get sessions where user's agents participated
		let query = `
      SELECT DISTINCT
        s.id, s.topic_id, s.status, s.mode, s.current_turn, s.max_turns,
        s.participant_count, s.started_at, s.completed_at,
        t.title as topic_title
      FROM sessions s
      JOIN topics t ON s.topic_id = t.id
      JOIN session_participants sp ON s.id = sp.session_id
      JOIN agents a ON sp.agent_id = a.id
      WHERE a.user_id = ?
    `;

		const params: (string | number)[] = [userId];

		if (status) {
			query += " AND s.status = ?";
			params.push(status);
		}

		query += " ORDER BY s.created_at DESC LIMIT ? OFFSET ?";
		params.push(limit, offset);

		const result = await c.env.DB.prepare(query)
			.bind(...params)
			.all<
				Session & {
					topic_title: string;
				}
			>();

		// Get total count
		let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM sessions s
      JOIN session_participants sp ON s.id = sp.session_id
      JOIN agents a ON sp.agent_id = a.id
      WHERE a.user_id = ?
    `;

		const countParams: (string | number)[] = [userId];

		if (status) {
			countQuery += " AND s.status = ?";
			countParams.push(status);
		}

		const countResult = await c.env.DB.prepare(countQuery)
			.bind(...countParams)
			.first<{ total: number }>();

		const total = countResult?.total || 0;

		return c.json({
			sessions: result.results.map((session) => ({
				id: session.id,
				topic: {
					id: session.topic_id,
					title: session.topic_title,
				},
				mode: session.mode ?? "double_diamond",
				status: session.status,
				current_turn: session.current_turn,
				max_turns: session.max_turns,
				participant_count: session.participant_count,
				started_at: session.started_at,
				completed_at: session.completed_at,
			})),
			total,
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /api/sessions/:id - Get session details
// ============================================================================

const getSessionRoute = createRoute({
	method: "get",
	path: "/{id}",
	tags: ["Sessions"],
	summary: "Get session details",
	description: "Get detailed information about a specific deliberation session",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "id",
						in: "path",
					},
					description: "Session ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
	},
	responses: {
		200: {
			description: "Session details",
			content: {
				"application/json": {
					schema: GetSessionResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Session not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

sessions.openapi(getSessionRoute, async (c) => {
	const userId = getAuthUserId(c);
	const sessionId = c.req.param("id");

	try {
		// Get session with topic
		const session = await c.env.DB.prepare(
			`SELECT s.*, t.title as topic_title, t.description as topic_description
       FROM sessions s
       JOIN topics t ON s.topic_id = t.id
       WHERE s.id = ?`,
		)
			.bind(sessionId)
			.first<
				Session & {
					topic_title: string;
					topic_description: string;
				}
			>();

		if (!session) {
			return notFound(c, "Session");
		}

		// Check if user has access (one of their agents participated)
		const hasAccess = await c.env.DB.prepare(
			`SELECT COUNT(*) as count
       FROM session_participants sp
       JOIN agents a ON sp.agent_id = a.id
       WHERE sp.session_id = ? AND a.user_id = ?`,
		)
			.bind(sessionId, userId)
			.first<{ count: number }>();

		if (!hasAccess || hasAccess.count === 0) {
			// Allow viewing any session for MVP
			// In production, you might want to restrict access
			// return forbidden(c, "You do not have access to this session");
		}

		// Get participants
		const participants = await c.env.DB.prepare(
			`SELECT sp.agent_id, a.name as agent_name, a.user_id
       FROM session_participants sp
       JOIN agents a ON sp.agent_id = a.id
       WHERE sp.session_id = ?`,
		)
			.bind(sessionId)
			.all<{ agent_id: string; agent_name: string; user_id: string }>();

		// Parse judge verdict if exists
		let judgeVerdict: JudgeVerdict | null = null;
		if (session.judge_verdict) {
			try {
				judgeVerdict = JSON.parse(session.judge_verdict) as JudgeVerdict;
			} catch {
				console.error("Failed to parse judge_verdict");
			}
		}

		return c.json({
			id: session.id,
			topic: {
				id: session.topic_id,
				title: session.topic_title,
				description: session.topic_description,
			},
			mode: session.mode ?? "double_diamond",
			status: session.status,
			current_turn: session.current_turn,
			max_turns: session.max_turns,
			participants: participants.results.map((p) => ({
				agent_id: p.agent_id,
				agent_name: p.agent_name,
				user_id: p.user_id,
			})),
			summary: session.summary,
			judge_verdict: judgeVerdict,
			started_at: session.started_at,
			completed_at: session.completed_at,
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /api/sessions/:id/turns - Get session turns with statements
// ============================================================================

const getSessionTurnsRoute = createRoute({
	method: "get",
	path: "/{id}/turns",
	tags: ["Sessions"],
	summary: "Get session turns",
	description: "Get all turns and statements for a specific deliberation session",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "id",
						in: "path",
					},
					description: "Session ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
	},
	responses: {
		200: {
			description: "Session turns with statements",
			content: {
				"application/json": {
					schema: GetSessionTurnsResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Session not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

sessions.openapi(getSessionTurnsRoute, async (c) => {
	const _userId = getAuthUserId(c);
	const sessionId = c.req.param("id");

	try {
		// Check if session exists
		const session = await c.env.DB.prepare("SELECT id FROM sessions WHERE id = ?")
			.bind(sessionId)
			.first<{ id: string }>();

		if (!session) {
			return notFound(c, "Session");
		}

		// Get turns for this session
		const turns = await c.env.DB.prepare(
			`SELECT id, turn_number, status, completed_at
       FROM turns
       WHERE session_id = ?
       ORDER BY turn_number ASC`,
		)
			.bind(sessionId)
			.all<Turn>();

		// Get statements for each turn
		const turnsWithStatements = await Promise.all(
			turns.results.map(async (turn) => {
				const statements = await c.env.DB.prepare(
					`SELECT s.id, s.agent_id, s.content, s.created_at, a.name as agent_name
           FROM statements s
           JOIN agents a ON s.agent_id = a.id
           WHERE s.turn_id = ?
           ORDER BY s.created_at ASC`,
				)
					.bind(turn.id)
					.all<Statement & { agent_name: string }>();

				return {
					id: turn.id,
					turn_number: turn.turn_number,
					status: turn.status,
					statements: statements.results.map((stmt) => ({
						id: stmt.id,
						agent_id: stmt.agent_id,
						agent_name: stmt.agent_name,
						content: stmt.content,
						created_at: stmt.created_at,
					})),
					completed_at: turn.completed_at,
				};
			}),
		);

		return c.json({
			turns: turnsWithStatements,
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { sessions as sessionsRouter };
