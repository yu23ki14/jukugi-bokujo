/**
 * Authentication middleware for OpenAPI routes using Clerk
 */

import { createMiddleware } from "hono/factory";
import type { Bindings } from "../types/bindings";

export interface AuthContext {
	userId: string;
}

interface ClerkSessionResponse {
	user_id: string;
	[key: string]: unknown;
}

/**
 * Clerk authentication middleware for OpenAPI routes
 * Validates JWT token and extracts user ID
 */
export const openapiAuth = createMiddleware<{ Bindings: Bindings; Variables: AuthContext }>(
	async (c, next) => {
		const authHeader = c.req.header("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return c.json({ error: "Unauthorized: Missing or invalid Authorization header" }, 401);
		}

		const token = authHeader.substring(7);

		// TEST MODE: Accept mock tokens for testing
		if (c.env.TEST_MODE === "true" && token.startsWith("mock-token-")) {
			const userId = token.replace("mock-token-", "");
			c.set("userId", userId);
			await next();
			return;
		}

		try {
			// Verify JWT token with Clerk
			const clerkSecretKey = c.env.CLERK_SECRET_KEY;

			// For MVP: Simple JWT verification
			// In production, use proper JWT verification with Clerk's JWKS
			const response = await fetch("https://api.clerk.com/v1/sessions/verify", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${clerkSecretKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token }),
			});

			if (!response.ok) {
				return c.json({ error: "Unauthorized: Invalid token" }, 401);
			}

			const session = (await response.json()) as ClerkSessionResponse;
			const userId = session.user_id;

			if (!userId) {
				return c.json({ error: "Unauthorized: No user ID in token" }, 401);
			}

			// Set userId in context
			c.set("userId", userId);

			await next();
		} catch (error) {
			console.error("Auth error:", error);
			return c.json({ error: "Unauthorized: Token verification failed" }, 401);
		}
	},
);

/**
 * Get authenticated user ID from context
 */
export function getAuthUserId(c: { get: (key: string) => string }): string {
	return c.get("userId");
}
