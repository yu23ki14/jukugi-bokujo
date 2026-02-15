/**
 * LLM service abstraction layer
 * Supports multiple providers: Anthropic, OpenAI, Google Gemini
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
	API_MAX_RETRIES,
	API_RETRY_BASE_DELAY,
	API_RETRY_MAX_DELAY,
	LLM_MODELS,
} from "../config/constants";
import type { Bindings } from "../types/bindings";

export type LLMProvider = "anthropic" | "openai" | "google";

interface LLMRequest {
	model: string;
	maxTokens: number;
	system?: string;
	messages: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * API Error with rate limit information
 */
export class LLMAPIError extends Error {
	constructor(
		message: string,
		public status?: number,
		public retryAfter?: number,
	) {
		super(message);
		this.name = "LLMAPIError";
	}
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): error is LLMAPIError {
	return error instanceof LLMAPIError && error.status === 429;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
	const exponentialDelay = API_RETRY_BASE_DELAY ** attempt;
	const jitter = Math.random() * 1000; // 0-1000ms jitter
	const delayMs = Math.min(exponentialDelay * 1000, API_RETRY_MAX_DELAY * 1000) + jitter;
	return delayMs;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get LLM model instance based on provider and model name
 */
function getModelInstance(provider: LLMProvider, modelName: string) {
	switch (provider) {
		case "anthropic":
			return anthropic(modelName);
		case "openai":
			return openai(modelName);
		case "google":
			return google(modelName);
		default:
			throw new Error(`Unsupported LLM provider: ${provider}`);
	}
}

/**
 * Call LLM API with retry logic
 * Supports multiple providers through Vercel AI SDK
 */
export async function callLLM(
	env: Bindings,
	request: LLMRequest,
	provider?: LLMProvider,
): Promise<{ content: string }> {
	const selectedProvider: LLMProvider =
		provider || (env.LLM_PROVIDER as LLMProvider) || "anthropic";
	const model = getModelInstance(selectedProvider, request.model);

	let attempt = 0;

	while (attempt < API_MAX_RETRIES) {
		try {
			// Note: Vercel AI SDK doesn't have a direct maxTokens parameter in generateText
			// Token limits are controlled by the model provider's default settings
			// For fine-grained control, consider using streamText or the provider's native SDK
			const { text } = await generateText({
				model,
				messages: request.messages,
				system: request.system,
			});

			return { content: text };
		} catch (error) {
			attempt++;

			// Check for rate limit errors (429)
			// Vercel AI SDK wraps provider errors, so we check the underlying error
			const isRateLimit =
				error instanceof Error &&
				(error.message.includes("429") ||
					error.message.toLowerCase().includes("rate limit") ||
					error.message.toLowerCase().includes("quota"));

			if (isRateLimit) {
				console.warn(`Rate limit hit (attempt ${attempt}/${API_MAX_RETRIES}):`, error.message);

				if (attempt < API_MAX_RETRIES) {
					const delayMs = calculateBackoffDelay(attempt);
					console.log(`Retrying after ${Math.round(delayMs / 1000)}s...`);
					await sleep(delayMs);
					continue;
				}

				// Max retries reached
				throw new LLMAPIError(`Rate limit exceeded after ${API_MAX_RETRIES} retries`, 429);
			}

			// Other errors should not be retried
			if (error instanceof Error) {
				throw new LLMAPIError(error.message || "LLM API error");
			}

			// Unknown error
			throw error;
		}
	}

	// Should never reach here
	throw new Error("Unexpected error in callLLM");
}

/**
 * Get model name based on provider and complexity level
 */
export function getModelName(provider: LLMProvider, complexity: "main" | "light" = "main"): string {
	return LLM_MODELS[provider][complexity];
}
