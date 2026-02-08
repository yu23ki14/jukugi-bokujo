/**
 * Error handling utilities
 */

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorResponse } from "../types/api";

/**
 * Send error response
 */
export function sendError(c: Context, status: number, message: string, code?: string): any {
	const response: ErrorResponse = {
		error: message,
		...(code && { code }),
	};
	return c.json(response, status as ContentfulStatusCode);
}

/**
 * Handle database errors
 */
export function handleDatabaseError(c: Context, error: unknown): any {
	console.error("Database error:", error);
	return sendError(c, 500, "Internal server error", "DATABASE_ERROR");
}

/**
 * Handle not found errors
 */
export function notFound(c: Context, resource: string): any {
	return sendError(c, 404, `${resource} not found`, "NOT_FOUND");
}

/**
 * Handle validation errors
 */
export function validationError(c: Context, message: string): any {
	return sendError(c, 400, message, "VALIDATION_ERROR");
}

/**
 * Handle unauthorized errors
 */
export function unauthorized(c: Context, message = "Unauthorized"): any {
	return sendError(c, 401, message, "UNAUTHORIZED");
}

/**
 * Handle forbidden errors
 */
export function forbidden(c: Context, message = "Forbidden"): any {
	return sendError(c, 403, message, "FORBIDDEN");
}
