/**
 * Common Zod schemas used across API routes
 */

import { z } from "@hono/zod-openapi";

/**
 * Common error response schema
 */
export const ErrorResponseSchema = z
	.object({
		error: z.string().openapi({
			description: "Error message",
			example: "Validation error",
		}),
		code: z.string().optional().openapi({
			description: "Error code",
			example: "VALIDATION_ERROR",
		}),
		details: z.unknown().optional().openapi({
			description: "Additional error details",
		}),
	})
	.openapi("ErrorResponse");

/**
 * Success response schema
 */
export const SuccessResponseSchema = z
	.object({
		success: z.boolean().openapi({ example: true }),
		message: z.string().openapi({ example: "Operation completed successfully" }),
	})
	.openapi("SuccessResponse");
