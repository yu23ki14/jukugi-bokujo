/**
 * User Inputs API Zod schemas
 */

import { z } from "@hono/zod-openapi";

/**
 * Create user input request schema
 */
export const CreateUserInputRequestSchema = z
	.object({
		input_type: z.enum(["direction", "knowledge", "feedback"]).openapi({
			description: "Type of user input",
			example: "direction",
		}),
		content: z.string().min(1).max(5000).openapi({
			description: "Input content",
			example: "Focus more on economic considerations in your arguments",
		}),
	})
	.openapi("CreateUserInputRequest");

/**
 * Create user input response schema
 */
export const CreateUserInputResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "User input ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		agent_id: z.string().uuid().openapi({
			description: "Agent ID this input is for",
			example: "123e4567-e89b-12d3-a456-426614174001",
		}),
		input_type: z.string().openapi({
			description: "Type of user input",
			example: "direction",
		}),
		content: z.string().openapi({
			description: "Input content",
			example: "Focus more on economic considerations in your arguments",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("CreateUserInputResponse");

/**
 * User input schema (for list responses)
 */
export const UserInputSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "User input ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		input_type: z.string().openapi({
			description: "Type of user input",
			example: "direction",
		}),
		content: z.string().openapi({
			description: "Input content",
			example: "Focus more on economic considerations in your arguments",
		}),
		applied_at: z.number().int().nullable().openapi({
			description:
				"Unix timestamp (seconds) when applied to agent persona, null if not yet applied",
			example: 1704067200,
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("UserInput");

/**
 * List user inputs response schema
 */
export const ListUserInputsResponseSchema = z
	.object({
		inputs: z.array(UserInputSchema).openapi({
			description: "List of user inputs for the agent",
		}),
	})
	.openapi("ListUserInputsResponse");
