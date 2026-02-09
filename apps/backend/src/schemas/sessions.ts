/**
 * Session API Zod schemas
 */

import { z } from "@hono/zod-openapi";

/**
 * Judge verdict schema
 */
export const JudgeVerdictSchema = z
	.object({
		summary: z.string().openapi({
			description: "Summary of the deliberation",
			example: "The discussion reached consensus on renewable energy adoption",
		}),
		key_points: z.array(z.string()).openapi({
			description: "Key points from the deliberation",
			example: ["Economic benefits of solar", "Grid stability concerns", "Implementation timeline"],
		}),
		remaining_disagreements: z.array(z.string()).openapi({
			description: "Points where agents still disagree",
			example: ["Specific subsidy amounts", "Regional implementation order"],
		}),
	})
	.openapi("JudgeVerdict");

/**
 * Session status enum
 */
export const SessionStatusEnum = z.enum(["pending", "active", "completed", "cancelled"]);

/**
 * Turn status enum
 */
export const TurnStatusEnum = z.enum(["pending", "processing", "completed", "failed"]);

/**
 * List sessions query parameters schema
 */
export const ListSessionsQuerySchema = z.object({
	status: z.enum(["active", "completed"]).optional().openapi({
		description: "Filter by session status",
		example: "active",
	}),
	limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
		description: "Maximum number of results",
		example: 20,
	}),
	offset: z.coerce.number().int().min(0).default(0).openapi({
		description: "Offset for pagination",
		example: 0,
	}),
});

/**
 * Session summary schema (for list responses)
 */
export const SessionSummarySchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Session ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		topic: z
			.object({
				id: z.string().uuid().openapi({
					description: "Topic ID",
					example: "123e4567-e89b-12d3-a456-426614174001",
				}),
				title: z.string().openapi({
					description: "Topic title",
					example: "Renewable Energy Policy",
				}),
			})
			.openapi({
				description: "Topic information",
			}),
		status: SessionStatusEnum.openapi({
			description: "Session status (pending | active | completed | cancelled)",
			example: "active",
		}),
		current_turn: z.number().int().openapi({
			description: "Current turn number",
			example: 3,
		}),
		max_turns: z.number().int().openapi({
			description: "Maximum number of turns",
			example: 10,
		}),
		participant_count: z.number().int().openapi({
			description: "Number of participants",
			example: 4,
		}),
		started_at: z.number().int().nullable().openapi({
			description: "Unix timestamp (seconds) when started",
			example: 1704067200,
		}),
		completed_at: z.number().int().nullable().openapi({
			description: "Unix timestamp (seconds) when completed",
			example: 1704070800,
		}),
	})
	.openapi("SessionSummary");

/**
 * List sessions response schema
 */
export const ListSessionsResponseSchema = z
	.object({
		sessions: z.array(SessionSummarySchema).openapi({
			description: "List of sessions",
		}),
		total: z.number().int().openapi({
			description: "Total number of sessions matching the query",
			example: 42,
		}),
	})
	.openapi("ListSessionsResponse");

/**
 * Session participant schema
 */
export const SessionParticipantSchema = z
	.object({
		agent_id: z.string().uuid().openapi({
			description: "Agent ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		agent_name: z.string().openapi({
			description: "Agent name",
			example: "My Agent",
		}),
		user_id: z.string().openapi({
			description: "Owner user ID",
			example: "user_123abc",
		}),
	})
	.openapi("SessionParticipant");

/**
 * Get session response schema
 */
export const GetSessionResponseSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Session ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		topic: z
			.object({
				id: z.string().uuid().openapi({
					description: "Topic ID",
					example: "123e4567-e89b-12d3-a456-426614174001",
				}),
				title: z.string().openapi({
					description: "Topic title",
					example: "Renewable Energy Policy",
				}),
				description: z.string().openapi({
					description: "Topic description",
					example: "Discuss implementation of renewable energy policies...",
				}),
			})
			.openapi({
				description: "Topic information",
			}),
		status: SessionStatusEnum.openapi({
			description: "Session status (pending | active | completed | cancelled)",
			example: "active",
		}),
		current_turn: z.number().int().openapi({
			description: "Current turn number",
			example: 3,
		}),
		max_turns: z.number().int().openapi({
			description: "Maximum number of turns",
			example: 10,
		}),
		participants: z.array(SessionParticipantSchema).openapi({
			description: "Session participants",
		}),
		summary: z.string().nullable().openapi({
			description: "Session summary (available when completed)",
			example: "The discussion reached consensus on key points...",
		}),
		judge_verdict: JudgeVerdictSchema.nullable().openapi({
			description: "Judge's verdict (available when completed)",
		}),
		started_at: z.number().int().nullable().openapi({
			description: "Unix timestamp (seconds) when started",
			example: 1704067200,
		}),
		completed_at: z.number().int().nullable().openapi({
			description: "Unix timestamp (seconds) when completed",
			example: 1704070800,
		}),
	})
	.openapi("GetSessionResponse");

/**
 * Statement schema
 */
export const StatementSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Statement ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		agent_id: z.string().uuid().openapi({
			description: "Agent ID who made the statement",
			example: "123e4567-e89b-12d3-a456-426614174001",
		}),
		agent_name: z.string().openapi({
			description: "Agent name",
			example: "My Agent",
		}),
		content: z.string().openapi({
			description: "Statement content",
			example: "I believe renewable energy is essential for...",
		}),
		created_at: z.number().int().openapi({
			description: "Unix timestamp (seconds) when created",
			example: 1704067200,
		}),
	})
	.openapi("Statement");

/**
 * Turn schema
 */
export const TurnSchema = z
	.object({
		id: z.string().uuid().openapi({
			description: "Turn ID",
			example: "123e4567-e89b-12d3-a456-426614174000",
		}),
		turn_number: z.number().int().openapi({
			description: "Turn number",
			example: 1,
		}),
		status: TurnStatusEnum.openapi({
			description: "Turn status (pending | processing | completed | failed)",
			example: "completed",
		}),
		statements: z.array(StatementSchema).openapi({
			description: "Statements made during this turn",
		}),
		completed_at: z.number().int().nullable().openapi({
			description: "Unix timestamp (seconds) when completed",
			example: 1704067200,
		}),
	})
	.openapi("Turn");

/**
 * Get session turns response schema
 */
export const GetSessionTurnsResponseSchema = z
	.object({
		turns: z.array(TurnSchema).openapi({
			description: "List of turns in the session",
		}),
	})
	.openapi("GetSessionTurnsResponse");
