/**
 * Cloudflare Workers bindings
 */

export type Bindings = {
	DB: D1Database;
	CLERK_SECRET_KEY: string;
	ANTHROPIC_API_KEY: string;
	ENVIRONMENT: string;
	TEST_MODE?: string;
};
