/**
 * Cloudflare Workers bindings
 */

import type { TurnQueueMessage } from "./queue";

export type Bindings = {
	DB: D1Database;
	CLERK_SECRET_KEY: string;
	ANTHROPIC_API_KEY: string;
	OPENAI_API_KEY?: string;
	GOOGLE_API_KEY?: string;
	LLM_PROVIDER?: "anthropic" | "openai" | "google";
	ENVIRONMENT: string;
	TEST_MODE?: string;
	TURN_QUEUE: Queue<TurnQueueMessage>;
};
