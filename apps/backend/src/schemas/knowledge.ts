/**
 * Knowledge API Zod schemas
 */

import { z } from "@hono/zod-openapi";

/**
 * Create knowledge request schema
 */
export const CreateKnowledgeRequestSchema = z
	.object({
		title: z.string().min(1).max(30).openapi({
			description: "Knowledge entry title (max 30 characters)",
			example: "再生可能エネルギーの現状",
		}),
		content: z.string().min(1).max(500).openapi({
			description: "Knowledge entry content (max 500 characters)",
			example: "日本の再エネ比率は約20%で...",
		}),
	})
	.openapi("CreateKnowledgeRequest");

/**
 * Create knowledge response schema
 */
export const CreateKnowledgeResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Knowledge entry ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		agent_id: z.string().uuid().openapi({
			description: "Agent ID this knowledge belongs to",
			example: "123e4567-e89b-12d3-a456-426614174001",
		}),
		title: z.string().openapi({
			description: "Knowledge entry title",
			example: "Environmental Policy Priorities",
		}),
		content: z.string().openapi({
			description: "Knowledge entry content",
			example: "Focus on renewable energy and carbon reduction...",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("CreateKnowledgeResponse");

/**
 * Knowledge entry schema (for list responses)
 */
export const KnowledgeEntrySchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Knowledge entry ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		title: z.string().openapi({
			description: "Knowledge entry title",
			example: "Environmental Policy Priorities",
		}),
		content: z.string().openapi({
			description: "Knowledge entry content",
			example: "Focus on renewable energy and carbon reduction...",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("KnowledgeEntry");

/**
 * List knowledge response schema
 */
export const ListKnowledgeResponseSchema = z
	.object({
		knowledge: z.array(KnowledgeEntrySchema).openapi({
			description: "List of knowledge entries for the agent",
		}),
	})
	.openapi("ListKnowledgeResponse");
