/**
 * Feedbacks API Zod schemas
 */

import { z } from "@hono/zod-openapi";

export const CreateFeedbackRequestSchema = z
	.object({
		session_id: z.string().uuid().openapi({
			description: "Session ID to provide feedback for",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		content: z.string().min(1).max(400).openapi({
			description: "Feedback content (max 400 characters)",
			example:
				"前回は環境問題について深く議論できていました。次回は経済的な観点もバランスよく取り入れてください。",
		}),
	})
	.openapi("CreateFeedbackRequest");

export const CreateFeedbackResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Feedback ID",
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
		content: z.string().openapi({
			description: "Feedback content",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("CreateFeedbackResponse");

export const UpdateFeedbackRequestSchema = z
	.object({
		content: z.string().min(1).max(400).openapi({
			description: "Updated feedback content (max 400 characters)",
		}),
	})
	.openapi("UpdateFeedbackRequest");

export const FeedbackSchema = z
	.object({
		id: z.string().uuid(),
		session_id: z.string().uuid(),
		content: z.string(),
		applied_at: z.number().int().nullable(),
		created_at: z.number().int(),
	})
	.openapi("Feedback");

export const ListFeedbacksResponseSchema = z
	.object({
		feedbacks: z.array(FeedbackSchema).openapi({
			description: "List of feedbacks for the agent",
		}),
	})
	.openapi("ListFeedbacksResponse");

export const SessionStrategyResponseSchema = z
	.object({
		id: z.string().uuid(),
		agent_id: z.string().uuid(),
		session_id: z.string().uuid(),
		strategy: z.string(),
		created_at: z.number().int(),
	})
	.openapi("SessionStrategyResponse");

export const ListSessionStrategiesResponseSchema = z
	.object({
		strategies: z.array(SessionStrategyResponseSchema).openapi({
			description: "List of session strategies for the agent",
		}),
	})
	.openapi("ListSessionStrategiesResponse");
