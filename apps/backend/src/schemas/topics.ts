/**
 * Topic API Zod schemas
 */

import { z } from "@hono/zod-openapi";

/**
 * Topic summary schema (for list responses)
 */
export const TopicSummarySchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Topic ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		title: z.string().openapi({
			description: "Topic title",
			example: "Renewable Energy Policy",
		}),
		description: z.string().openapi({
			description: "Topic description",
			example: "Discuss implementation of renewable energy policies...",
		}),
		status: z.string().openapi({
			description: "Topic status",
			example: "active",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("TopicSummary");

/**
 * List topics response schema
 */
export const ListTopicsResponseSchema = z
	.object({
		topics: z.array(TopicSummarySchema).openapi({
			description: "List of active topics",
		}),
	})
	.openapi("ListTopicsResponse");

/**
 * Get topic response schema
 */
export const GetTopicResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Topic ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		title: z.string().openapi({
			description: "Topic title",
			example: "Renewable Energy Policy",
		}),
		description: z.string().openapi({
			description: "Topic description",
			example: "Discuss implementation of renewable energy policies...",
		}),
		status: z.string().openapi({
			description: "Topic status",
			example: "active",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
		updated_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when last updated",
			example: 1704067200,
		}),
	})
	.openapi("GetTopicResponse");

/**
 * Create topic request schema (admin only)
 */
export const CreateTopicRequestSchema = z
	.object({
		title: z.string().min(1).max(200).openapi({
			description: "Topic title",
			example: "Renewable Energy Policy",
		}),
		description: z.string().min(1).max(2000).openapi({
			description: "Topic description",
			example: "Discuss implementation of renewable energy policies...",
		}),
	})
	.openapi("CreateTopicRequest");
