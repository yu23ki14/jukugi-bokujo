/**
 * Feedbacks API routes (OpenAPI)
 * Post-session reflection that influences agent persona evolution
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import {
	CreateFeedbackRequestSchema,
	CreateFeedbackWithPersonaResponseSchema,
	FeedbackSchema,
	ListFeedbacksResponseSchema,
	ListSessionStrategiesResponseSchema,
	UpdateFeedbackRequestSchema,
} from "../schemas/feedbacks";
import { updateAgentPersona } from "../services/anthropic";
import type { Bindings } from "../types/bindings";
import type { Agent, Feedback, SessionStrategy } from "../types/database";
import { forbidden, handleDatabaseError, notFound, sendError } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

const feedbacks = new OpenAPIHono<{ Bindings: Bindings }>();

feedbacks.use("/*", clerkAuth);

// ============================================================================
// POST /agents/:agentId/feedbacks - Add feedback after session
// ============================================================================

const createFeedbackRoute = createRoute({
	method: "post",
	path: "/agents/{agentId}/feedbacks",
	tags: ["Feedbacks"],
	summary: "Add feedback for a completed session",
	description:
		"Provide feedback (max 200 chars) for a completed session. One feedback per agent per session.",
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
					schema: CreateFeedbackRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Feedback created successfully",
			content: { "application/json": { schema: CreateFeedbackWithPersonaResponseSchema } },
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
			description: "Feedback already exists for this session",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Internal server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

feedbacks.openapi(createFeedbackRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const body = c.req.valid("json");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		// Check session is completed
		const session = await c.env.DB.prepare("SELECT status FROM sessions WHERE id = ?")
			.bind(body.session_id)
			.first<{ status: string }>();

		if (!session) return notFound(c, "Session");
		if (session.status !== "completed") {
			return sendError(c, 400, "Session is not completed", "SESSION_NOT_COMPLETED");
		}

		// Check agent was a participant
		const participant = await c.env.DB.prepare(
			"SELECT id FROM session_participants WHERE session_id = ? AND agent_id = ?",
		)
			.bind(body.session_id, agentId)
			.first();

		if (!participant) {
			return sendError(c, 400, "Agent is not a participant in this session", "NOT_PARTICIPANT");
		}

		// Check no existing feedback for this agent+session
		const existing = await c.env.DB.prepare(
			"SELECT id FROM feedbacks WHERE agent_id = ? AND session_id = ?",
		)
			.bind(agentId, body.session_id)
			.first();

		if (existing) {
			return sendError(c, 409, "Feedback already exists for this session", "FEEDBACK_EXISTS");
		}

		const feedbackId = generateUUID();
		const now = getCurrentTimestamp();

		await c.env.DB.prepare(
			`INSERT INTO feedbacks (id, agent_id, session_id, content, reflection_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				feedbackId,
				agentId,
				body.session_id,
				body.content.trim(),
				body.reflection_id || null,
				now,
			)
			.run();

		// Attempt immediate persona update (non-fatal)
		let personaChange: { persona_before: string; persona_after: string } | null = null;
		try {
			const fullAgent = await c.env.DB.prepare(
				"SELECT id, user_id, name, persona, status, created_at, updated_at FROM agents WHERE id = ?",
			)
				.bind(agentId)
				.first<Agent>();

			if (fullAgent) {
				const persona_before = fullAgent.persona;

				const newPersona = await updateAgentPersona(c.env, fullAgent, [
					{
						id: feedbackId,
						agent_id: agentId,
						session_id: body.session_id,
						content: body.content.trim(),
						reflection_id: body.reflection_id || null,
						applied_at: null,
						created_at: now,
					},
				]);

				await c.env.DB.prepare("UPDATE agents SET persona = ?, updated_at = ? WHERE id = ?")
					.bind(JSON.stringify(newPersona), now, agentId)
					.run();

				await c.env.DB.prepare("UPDATE feedbacks SET applied_at = ? WHERE id = ?")
					.bind(now, feedbackId)
					.run();

				await c.env.DB.prepare(
					`INSERT INTO persona_changes (id, agent_id, feedback_id, persona_before, persona_after, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						generateUUID(),
						agentId,
						feedbackId,
						persona_before,
						JSON.stringify(newPersona),
						now,
					)
					.run();

				personaChange = {
					persona_before,
					persona_after: JSON.stringify(newPersona),
				};
			}
		} catch (personaError) {
			console.error("Failed to update persona immediately:", personaError);
			personaChange = null;
		}

		return c.json(
			{
				id: feedbackId,
				agent_id: agentId,
				session_id: body.session_id,
				content: body.content.trim(),
				created_at: now,
				persona_change: personaChange,
			},
			201,
		);
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// PUT /agents/:agentId/feedbacks/:id - Update feedback
// ============================================================================

const updateFeedbackRoute = createRoute({
	method: "put",
	path: "/agents/{agentId}/feedbacks/{id}",
	tags: ["Feedbacks"],
	summary: "Update feedback",
	description: "Update feedback content before the next session starts",
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
			id: z
				.string()
				.uuid()
				.openapi({
					param: { name: "id", in: "path" },
					description: "Feedback ID",
				}),
		}),
		body: {
			content: {
				"application/json": {
					schema: UpdateFeedbackRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Feedback updated successfully",
			content: { "application/json": { schema: FeedbackSchema } },
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
			description: "Feedback not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Internal server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

feedbacks.openapi(updateFeedbackRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId, id } = c.req.valid("param");
	const body = c.req.valid("json");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		// Check feedback exists and belongs to this agent
		const feedback = await c.env.DB.prepare(
			"SELECT id, agent_id, session_id, applied_at, created_at FROM feedbacks WHERE id = ? AND agent_id = ?",
		)
			.bind(id, agentId)
			.first<Feedback>();

		if (!feedback) return notFound(c, "Feedback");

		// Cannot update if already applied
		if (feedback.applied_at) {
			return sendError(c, 400, "Feedback has already been applied", "ALREADY_APPLIED");
		}

		await c.env.DB.prepare("UPDATE feedbacks SET content = ? WHERE id = ?")
			.bind(body.content.trim(), id)
			.run();

		return c.json({
			id: feedback.id,
			session_id: feedback.session_id,
			content: body.content.trim(),
			applied_at: feedback.applied_at,
			created_at: feedback.created_at,
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /agents/:agentId/feedbacks - List feedbacks
// ============================================================================

const listFeedbacksRoute = createRoute({
	method: "get",
	path: "/agents/{agentId}/feedbacks",
	tags: ["Feedbacks"],
	summary: "List agent's feedbacks",
	description: "Get all feedbacks for a specific agent",
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
			description: "List of feedbacks",
			content: { "application/json": { schema: ListFeedbacksResponseSchema } },
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

feedbacks.openapi(listFeedbacksRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const { session_id } = c.req.valid("query");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		let result: D1Result<Feedback>;
		if (session_id) {
			result = await c.env.DB.prepare(
				`SELECT id, session_id, content, applied_at, created_at
         FROM feedbacks WHERE agent_id = ? AND session_id = ?`,
			)
				.bind(agentId, session_id)
				.all<Feedback>();
		} else {
			result = await c.env.DB.prepare(
				`SELECT id, session_id, content, applied_at, created_at
         FROM feedbacks WHERE agent_id = ?
         ORDER BY created_at DESC LIMIT 30`,
			)
				.bind(agentId)
				.all<Feedback>();
		}

		return c.json({
			feedbacks: result.results.map((f) => ({
				id: f.id,
				session_id: f.session_id,
				content: f.content,
				applied_at: f.applied_at,
				created_at: f.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /agents/:agentId/strategies - List session strategies
// ============================================================================

const listStrategiesRoute = createRoute({
	method: "get",
	path: "/agents/{agentId}/strategies",
	tags: ["Feedbacks"],
	summary: "List agent's session strategies",
	description: "Get session strategies generated from feedback for a specific agent",
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
			description: "List of session strategies",
			content: { "application/json": { schema: ListSessionStrategiesResponseSchema } },
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

feedbacks.openapi(listStrategiesRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const { session_id } = c.req.valid("query");

	try {
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) return notFound(c, "Agent");
		if (agent.user_id !== userId) return forbidden(c, "You do not have access to this agent");

		let result: D1Result<SessionStrategy>;
		if (session_id) {
			result = await c.env.DB.prepare(
				`SELECT id, agent_id, session_id, strategy, created_at
         FROM session_strategies WHERE agent_id = ? AND session_id = ?`,
			)
				.bind(agentId, session_id)
				.all<SessionStrategy>();
		} else {
			result = await c.env.DB.prepare(
				`SELECT id, agent_id, session_id, strategy, created_at
         FROM session_strategies WHERE agent_id = ?
         ORDER BY created_at DESC LIMIT 20`,
			)
				.bind(agentId)
				.all<SessionStrategy>();
		}

		return c.json({
			strategies: result.results.map((s) => ({
				id: s.id,
				agent_id: s.agent_id,
				session_id: s.session_id,
				strategy: s.strategy,
				created_at: s.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { feedbacks as feedbacksRouter };
