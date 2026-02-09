/**
 * Topic management API routes (OpenAPI)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import {
	CreateTopicRequestSchema,
	GetTopicResponseSchema,
	ListTopicsResponseSchema,
} from "../schemas/topics";
import type { Bindings } from "../types/bindings";
import type { Topic } from "../types/database";
import { handleDatabaseError, notFound, unauthorized } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

// Public topics router (no authentication)
const publicTopics = new OpenAPIHono<{ Bindings: Bindings }>();

// Admin topics router (with authentication)
const adminTopics = new OpenAPIHono<{ Bindings: Bindings }>();
adminTopics.use("/*", clerkAuth);

// ============================================================================
// GET /api/topics - List active topics (public, no auth required)
// ============================================================================

const listTopicsRoute = createRoute({
	method: "get",
	path: "/topics",
	tags: ["Topics"],
	summary: "List active topics",
	description: "Get a list of all active deliberation topics (public endpoint)",
	responses: {
		200: {
			description: "List of active topics",
			content: {
				"application/json": {
					schema: ListTopicsResponseSchema,
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

publicTopics.openapi(listTopicsRoute, async (c) => {
	try {
		const result = await c.env.DB.prepare(
			`SELECT id, title, description, status, created_at
       FROM topics
       WHERE status = 'active'
       ORDER BY created_at DESC`,
		).all<Topic>();

		return c.json({
			topics: result.results.map((topic) => ({
				id: topic.id,
				title: topic.title,
				description: topic.description,
				status: topic.status,
				created_at: topic.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// GET /api/topics/:id - Get topic details (public, no auth required)
// ============================================================================

const getTopicRoute = createRoute({
	method: "get",
	path: "/topics/{id}",
	tags: ["Topics"],
	summary: "Get topic details",
	description: "Get detailed information about a specific topic (public endpoint)",
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
					description: "Topic ID",
					example: "123e4567-e89b-12d3-a456-426614174000",
				}),
		}),
	},
	responses: {
		200: {
			description: "Topic details",
			content: {
				"application/json": {
					schema: GetTopicResponseSchema,
				},
			},
		},
		404: {
			description: "Topic not found",
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

publicTopics.openapi(getTopicRoute, async (c) => {
	const topicId = c.req.param("id");

	try {
		const topic = await c.env.DB.prepare(
			`SELECT id, title, description, status, created_at, updated_at
       FROM topics
       WHERE id = ?`,
		)
			.bind(topicId)
			.first<Topic>();

		if (!topic) {
			return notFound(c, "Topic");
		}

		return c.json({
			id: topic.id,
			title: topic.title,
			description: topic.description,
			status: topic.status,
			created_at: topic.created_at,
			updated_at: topic.updated_at,
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

// ============================================================================
// POST /api/admin/topics - Create topic (admin only)
// ============================================================================

const createTopicRoute = createRoute({
	method: "post",
	path: "/admin/topics",
	tags: ["Topics"],
	summary: "Create topic (admin)",
	description: "Create a new deliberation topic (admin only)",
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": {
					schema: CreateTopicRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Topic created successfully",
			content: {
				"application/json": {
					schema: GetTopicResponseSchema,
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

adminTopics.openapi(createTopicRoute, async (c) => {
	const _userId = getAuthUserId(c);
	const body = c.req.valid("json");

	// Simple admin check - in production, check against admin user IDs
	// For MVP, we'll allow any authenticated user to create topics for testing
	// TODO: Implement proper admin role check
	const isAdmin = true; // Placeholder

	if (!isAdmin) {
		return unauthorized(c, "Admin access required");
	}

	try {
		const topicId = generateUUID();
		const now = getCurrentTimestamp();

		await c.env.DB.prepare(
			`INSERT INTO topics (id, title, description, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)`,
		)
			.bind(topicId, body.title.trim(), body.description.trim(), now, now)
			.run();

		return c.json(
			{
				id: topicId,
				title: body.title.trim(),
				description: body.description.trim(),
				status: "active",
				created_at: now,
				updated_at: now,
			},
			201,
		);
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { publicTopics as publicTopicsRouter, adminTopics as adminTopicsRouter };
