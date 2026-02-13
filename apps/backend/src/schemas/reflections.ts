/**
 * Reflections & Persona Changes API Zod schemas
 */

import { z } from "@hono/zod-openapi";

export const AgentReflectionSchema = z
	.object({
		id: z.string().uuid(),
		agent_id: z.string().uuid(),
		session_id: z.string().uuid(),
		question: z.string(),
		context_summary: z.string(),
		created_at: z.number().int(),
	})
	.openapi("AgentReflection");

export const ListReflectionsResponseSchema = z
	.object({
		reflections: z.array(AgentReflectionSchema).openapi({
			description: "List of agent reflections",
		}),
	})
	.openapi("ListReflectionsResponse");

export const PersonaChangeSchema = z
	.object({
		id: z.string().uuid(),
		agent_id: z.string().uuid(),
		feedback_id: z.string().uuid(),
		persona_before: z.string(),
		persona_after: z.string(),
		created_at: z.number().int(),
	})
	.openapi("PersonaChange");

export const ListPersonaChangesResponseSchema = z
	.object({
		persona_changes: z.array(PersonaChangeSchema).openapi({
			description: "List of persona changes for the agent",
		}),
	})
	.openapi("ListPersonaChangesResponse");
