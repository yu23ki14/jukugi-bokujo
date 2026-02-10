/**
 * Agent API Zod schemas
 */

import { z } from "@hono/zod-openapi";

/**
 * Agent persona schema
 */
export const AgentPersonaSchema = z
	.object({
		core_values: z.array(z.string()).openapi({
			description: "Agent's core values",
			example: ["fairness", "sustainability", "innovation"],
		}),
		thinking_style: z.string().openapi({
			description: "Agent's thinking and communication style",
			example: "Analytical and data-driven, prefers concrete examples",
		}),
		personality_traits: z.array(z.string()).openapi({
			description: "Agent's personality traits",
			example: ["curious", "empathetic", "systematic"],
		}),
		background: z.string().openapi({
			description: "Agent's background and context",
			example: "A researcher with 10 years of experience in climate science",
		}),
		version: z.number().int().openapi({
			description: "Persona version number",
			example: 1,
		}),
	})
	.openapi("AgentPersona");

/**
 * Create agent request schema
 */
export const CreateAgentRequestSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({
			description: "Agent name",
			example: "My First Agent",
		}),
	})
	.openapi("CreateAgentRequest");

/**
 * Create agent response schema
 */
export const CreateAgentResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		user_id: z.string().openapi({
			description: "Owner user ID",
			example: "user_123abc",
		}),
		name: z.string().openapi({
			description: "Agent name",
			example: "My First Agent",
		}),
		persona: AgentPersonaSchema,
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("CreateAgentResponse");

/**
 * Agent summary schema (for list responses)
 */
export const AgentSummarySchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		name: z.string().openapi({
			description: "Agent name",
			example: "My First Agent",
		}),
		persona: AgentPersonaSchema,
		active_session_count: z.number().int().openapi({
			description: "Number of active sessions this agent is currently participating in",
			example: 1,
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("AgentSummary");

/**
 * List agents response schema
 */
export const ListAgentsResponseSchema = z
	.object({
		agents: z.array(AgentSummarySchema).openapi({
			description: "List of user's agents",
		}),
	})
	.openapi("ListAgentsResponse");

/**
 * Get agent response schema
 */
export const GetAgentResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		user_id: z.string().openapi({
			description: "Owner user ID",
			example: "user_123abc",
		}),
		name: z.string().openapi({
			description: "Agent name",
			example: "My First Agent",
		}),
		persona: AgentPersonaSchema,
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
		updated_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when last updated",
			example: 1704067200,
		}),
	})
	.openapi("GetAgentResponse");

/**
 * Update agent request schema
 */
export const UpdateAgentRequestSchema = z
	.object({
		name: z.string().min(1).max(100).optional().openapi({
			description: "New agent name",
			example: "Updated Agent Name",
		}),
	})
	.openapi("UpdateAgentRequest");

/**
 * Update agent response schema
 */
export const UpdateAgentResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		user_id: z.string().openapi({
			description: "Owner user ID",
			example: "user_123abc",
		}),
		name: z.string().openapi({
			description: "Agent name",
			example: "Updated Agent Name",
		}),
		persona: AgentPersonaSchema,
		updated_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when last updated",
			example: 1704067200,
		}),
	})
	.openapi("UpdateAgentResponse");
