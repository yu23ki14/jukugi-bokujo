/**
 * Feedback Requests API Zod schemas
 */

import { z } from "@hono/zod-openapi";

export const FeedbackRequestSchema = z
	.object({
		agent_id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174001",
		}),
		agent_name: z.string().openapi({
			description: "Agent name",
			example: "My Agent",
		}),
		session_id: z.string().uuid().openapi({
			description: "Session ID",
			example: "123e4567-e89b-12d3-a456-426614174002",
		}),
		topic_title: z.string().openapi({
			description: "Topic title",
			example: "環境問題について",
		}),
		completed_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when session completed",
			example: 1704067200,
		}),
		reflection_id: z.string().uuid().nullable().openapi({
			description: "Agent reflection ID (if agent generated a question)",
		}),
		reflection_question: z.string().nullable().openapi({
			description: "Agent's question to user",
		}),
		reflection_context: z.string().nullable().openapi({
			description: "Context summary for the agent's question",
		}),
	})
	.openapi("FeedbackRequest");

export const ListFeedbackRequestsResponseSchema = z
	.object({
		feedback_requests: z.array(FeedbackRequestSchema).openapi({
			description: "List of pending feedback requests",
		}),
	})
	.openapi("ListFeedbackRequestsResponse");
