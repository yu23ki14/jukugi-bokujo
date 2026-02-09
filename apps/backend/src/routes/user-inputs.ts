/**
 * User inputs API routes (OpenAPI)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import {
	CreateUserInputRequestSchema,
	CreateUserInputResponseSchema,
	ListUserInputsResponseSchema,
} from "../schemas/user-inputs";
import type { Bindings } from "../types/bindings";
import type { Agent, UserInput } from "../types/database";
import { forbidden, handleDatabaseError, notFound } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";
import { generateUUID } from "../utils/uuid";

const userInputs = new OpenAPIHono<{ Bindings: Bindings }>();

// Apply authentication to all routes
userInputs.use("/*", clerkAuth);

// ============================================================================
// POST /agents/:agentId/inputs - Add user input (direction/feedback)
// ============================================================================

const createUserInputRoute = createRoute({
	method: "post",
	path: "/agents/{agentId}/inputs",
	tags: ["User Inputs"],
	summary: "Add user input to agent",
	description: "Provide direction or feedback to guide the agent's behavior and persona",
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
					schema: CreateUserInputRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "User input created successfully",
			content: {
				"application/json": {
					schema: CreateUserInputResponseSchema,
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

userInputs.openapi(createUserInputRoute, async (c) => {
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

		// Create user input
		const inputId = generateUUID();
		const now = getCurrentTimestamp();

		await c.env.DB.prepare(
			`INSERT INTO user_inputs (id, agent_id, input_type, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(inputId, agentId, body.input_type, body.content.trim(), now)
			.run();

		return c.json(
			{
				id: inputId,
				agent_id: agentId,
				input_type: body.input_type,
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
// GET /agents/:agentId/inputs - List agent's user inputs
// ============================================================================

const listUserInputsRoute = createRoute({
	method: "get",
	path: "/agents/{agentId}/inputs",
	tags: ["User Inputs"],
	summary: "List agent's user inputs",
	description: "Get all user inputs (directions and feedback) for a specific agent",
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
			description: "List of user inputs",
			content: {
				"application/json": {
					schema: ListUserInputsResponseSchema,
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

userInputs.openapi(listUserInputsRoute, async (c) => {
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

		// Get user inputs
		const result = await c.env.DB.prepare(
			`SELECT id, input_type, content, applied_at, created_at
       FROM user_inputs
       WHERE agent_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
		)
			.bind(agentId)
			.all<UserInput>();

		return c.json({
			inputs: result.results.map((input) => ({
				id: input.id,
				input_type: input.input_type,
				content: input.content,
				applied_at: input.applied_at,
				created_at: input.created_at,
			})),
		});
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { userInputs as userInputsRouter };
