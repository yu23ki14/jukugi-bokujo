/**
 * Authentication mock helpers for testing
 *
 * These helpers create mock authentication headers that work with
 * the TEST_MODE environment variable in the authentication middleware.
 */

/**
 * Mock user IDs for testing
 */
export const MOCK_USERS = {
	USER_1: "user_test1234567890",
	USER_2: "user_test0987654321",
	USER_3: "user_test1122334455",
} as const;

/**
 * Creates mock Clerk authentication headers for testing
 *
 * When TEST_MODE=true in wrangler.toml, the authentication middleware
 * will accept tokens in the format "mock-token-{userId}" and extract
 * the userId without calling the Clerk API.
 *
 * @param userId - The user ID to authenticate as
 * @returns Headers object with Authorization header
 */
export function createMockAuthHeaders(userId: string): HeadersInit {
	return {
		Authorization: `Bearer mock-token-${userId}`,
	};
}

/**
 * Creates headers without authentication
 * Useful for testing 401 unauthorized responses
 */
export function createUnauthHeaders(): HeadersInit {
	return {};
}

/**
 * Creates headers with invalid authentication
 * Useful for testing authentication validation
 */
export function createInvalidAuthHeaders(): HeadersInit {
	return {
		Authorization: "Bearer invalid-token-format",
	};
}
