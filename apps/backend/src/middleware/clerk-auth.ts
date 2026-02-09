/**
 * Authentication middleware using @hono/clerk-auth
 */

import { clerkMiddleware, getAuth as getClerkAuth } from "@hono/clerk-auth";
import type { Context, MiddlewareHandler } from "hono";
import type { Bindings } from "../types/bindings";

export interface AuthContext {
	userId: string;
}

/**
 * Clerk authentication middleware
 * Validates JWT token and extracts user ID
 */
export const clerkAuth: MiddlewareHandler<{ Bindings: Bindings }> = clerkMiddleware();

/**
 * Get authenticated user ID from context
 * @throws Error if user is not authenticated
 */
export function getAuthUserId(c: Context): string {
	// Support test mode with mock tokens
	if (c.env.TEST_MODE === "true") {
		const authHeader = c.req.header("Authorization");
		if (authHeader?.startsWith("Bearer mock-token-")) {
			return authHeader.substring(18); // Remove "Bearer mock-token-"
		}
	}

	const auth = getClerkAuth(c);
	const userId = auth?.userId;

	if (!userId) {
		throw new Error("Unauthorized: No user ID found");
	}

	return userId;
}
