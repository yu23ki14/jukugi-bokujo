/**
 * Knowledge management API routes (OpenAPI)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getAuthUserId, openapiAuth } from "../middleware/openapi-auth";
import { ErrorResponseSchema, SuccessResponseSchema } from "../schemas/common";
import {
	CreateKnowledgeRequestSchema,
	CreateKnowledgeResponseSchema,
	ListKnowledgeResponseSchema,
} from "../schemas/knowledge";
import type { Bindings } from "../types/bindings";
import type { Agent, KnowledgeEntry } from "../types/database";
import { forbidden, handleDatabaseError, notFound } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

const knowledge = new OpenAPIHono<{ Bindings: Bindings }>();

// Apply authentication to all routes
knowledge.use("/*", openapiAuth);

// ============================================================================
// POST /agents/:agentId/knowledge - Add knowledge to agent
// ============================================================================

const createKnowledgeRoute = createRoute({
	method: "post",
	path: "/agents/{agentId}/knowledge",
	tags: ["Knowledge"],
	summary: "Add knowledge to agent",
	description: "Add a new knowledge entry to an agent's knowledge base",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			agentId: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "agentId",
						in: "path",
					},
					description: "Agent ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
		body: {
			content: {
				"application/json": {
					schema: CreateKnowledgeRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Knowledge entry created successfully",
			content: {
				"application/json": {
					schema: CreateKnowledgeResponseSchema,
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
		403: {
			description: "Forbidden - Agent belongs to another user",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Agent not found",
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

knowledge.openapi(createKnowledgeRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");
	const body = c.req.valid("json");

	try {
		// Check if agent exists and user owns it
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) {
			return notFound(c, "Agent");
		}

		if (agent.user_id !== userId) {
			return forbidden(c, "You do not have access to this agent");
		}

		// Create knowledge entry
		const knowledgeId = generateUUID();
		const now = getCurrentTimestamp();

		await c.env.DB.prepare(
			`INSERT INTO knowledge_entries (id, agent_id, title, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(knowledgeId, agentId, body.title.trim(), body.content.trim(), now, now)
			.run();

		return c.json(
			{
				id: knowledgeId,
				agent_id: agentId,
				title: body.title.trim(),
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
// GET /agents/:agentId/knowledge - List agent's knowledge
// ============================================================================

const listKnowledgeRoute = createRoute({
	method: "get",
	path: "/agents/{agentId}/knowledge",
	tags: ["Knowledge"],
	summary: "List agent's knowledge",
	description: "Get all knowledge entries for a specific agent",
	security: [{ bearerAuth: [] }],
	request: {
		params: z.object({
			agentId: z
				.string()
				.uuid()
				.openapi({
					param: {
						name: "agentId",
						in: "path",
					},
					description: "Agent ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
	},
	responses: {
		200: {
			description: "List of knowledge entries",
			content: {
				"application/json": {
					schema: ListKnowledgeResponseSchema,
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
		403: {
			description: "Forbidden - Agent belongs to another user",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Agent not found",
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

knowledge.openapi(listKnowledgeRoute, async (c) => {
	const userId = getAuthUserId(c);
	const { agentId } = c.req.valid("param");

	try {
		// Check if agent exists and user owns it
		const agent = await c.env.DB.prepare("SELECT user_id FROM agents WHERE id = ?")
			.bind(agentId)
			.first<Agent>();

		if (!agent) {
			return notFound(c, "Agent");
		}

		if (agent.user_id !== userId) {
			return forbidden(c, "You do not have access to this agent");
		}

		// Get knowledge entries
		const result = await c.env.DB.prepare(
			`SELECT id, title, content, created_at
       FROM knowledge_entries
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
		)
			.bind(agentId)
			.all<KnowledgeEntry>();

		return c.json({
			knowledge: result.results.map((entry) => ({
				id: entry.id,
				title: entry.title,
				content: entry.content,
				created_at: entry.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// DELETE /knowledge/:id - Delete knowledge entry
// ============================================================================

const deleteKnowledgeRoute = createRoute({
	method: "delete",
	path: "/knowledge/{id}",
	tags: ["Knowledge"],
	summary: "Delete knowledge entry",
	description: "Delete a specific knowledge entry",
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
					description: "Knowledge entry ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
	},
	responses: {
		200: {
			description: "Knowledge entry deleted successfully",
			content: {
				"application/json": {
					schema: SuccessResponseSchema,
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
		403: {
			description: "Forbidden - Knowledge entry belongs to another user's agent",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Knowledge entry not found",
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

knowledge.openapi(deleteKnowledgeRoute, async (c) => {
	const userId = getAuthUserId(c);
	const knowledgeId = c.req.param("id");

	try {
		// Check if knowledge exists and user owns the agent
		const knowledgeEntry = await c.env.DB.prepare(
			`SELECT ke.id, a.user_id
       FROM knowledge_entries ke
       JOIN agents a ON ke.agent_id = a.id
       WHERE ke.id = ?`,
		)
			.bind(knowledgeId)
			.first<{ id: string; user_id: string }>();

		if (!knowledgeEntry) {
			return notFound(c, "Knowledge entry");
		}

		if (knowledgeEntry.user_id !== userId) {
			return forbidden(c, "You do not have access to this knowledge entry");
		}

		// Delete knowledge entry
		await c.env.DB.prepare("DELETE FROM knowledge_entries WHERE id = ?").bind(knowledgeId).run();

		return c.json({ success: true, message: "Knowledge entry deleted successfully" });
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { knowledge as knowledgeRouter };
