/**
 * Directions API Zod schemas
 */

import { z } from "@hono/zod-openapi";

export const CreateDirectionRequestSchema = z
	.object({
		session_id: z.string().uuid().openapi({
			description: "Session ID to provide direction for",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		turn_number: z.number().int().min(1).openapi({
			description: "Turn number to apply this direction to",
			example: 1,
		}),
		content: z.string().min(1).max(80).openapi({
			description: "Direction content (max 80 characters)",
			example: "環境問題の経済的側面にも触れてください",
		}),
	})
	.openapi("CreateDirectionRequest");

export const CreateDirectionResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Direction ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		agent_id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174001",
		}),
		session_id: z.string().uuid().openapi({
			description: "Session ID",
			example: "123e4567-e89b-12d3-a456-426614174002",
		}),
		turn_number: z.number().int().openapi({
			description: "Turn number",
			example: 1,
		}),
		content: z.string().openapi({
			description: "Direction content",
			example: "環境問題の経済的側面にも触れてください",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("CreateDirectionResponse");

export const DirectionSchema = z
	.object({
		id: z.string().uuid(),
		session_id: z.string().uuid(),
		turn_number: z.number().int(),
		content: z.string(),
		created_at: z.number().int(),
	})
	.openapi("Direction");

export const ListDirectionsResponseSchema = z
	.object({
		directions: z.array(DirectionSchema).openapi({
			description: "List of directions for the agent",
		}),
	})
	.openapi("ListDirectionsResponse");
