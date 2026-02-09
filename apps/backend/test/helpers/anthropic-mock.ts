/**
 * Anthropic API mock helpers for testing
 *
 * These helpers mock the Anthropic API responses to avoid
 * making real API calls during tests.
 */

import type { AgentPersona } from "../../src/types/database";

/**
 * Create a mock persona response for agent creation
 */
export function createMockPersona(agentName: string): AgentPersona {
	return {
		core_values: ["Test Value 1", "Test Value 2", "Test Value 3"],
		thinking_style: `Mock thinking style for ${agentName}`,
		personality_traits: ["Trait 1", "Trait 2", "Trait 3"],
		background: `Test background for ${agentName}`,
		version: 1,
	};
}

/**
 * Create a mock Anthropic API response
 */
export function createMockAnthropicResponse(content: string) {
	return {
		id: "msg_mock123",
		type: "message",
		role: "assistant",
		content: [
			{
				type: "text",
				text: content,
			},
		],
		model: "claude-3-5-sonnet-20241022",
		stop_reason: "end_turn",
		usage: {
			input_tokens: 100,
			output_tokens: 200,
		},
	};
}

/**
 * Setup global fetch mock for Anthropic API
 *
 * This function stubs the global fetch to intercept calls to
 * the Anthropic API and return mock responses.
 *
 * Usage:
 * ```typescript
 * import { vi } from 'vitest';
 * import { setupAnthropicMock } from './helpers/anthropic-mock';
 *
 * beforeEach(() => {
 *   setupAnthropicMock();
 * });
 *
 * afterEach(() => {
 *   vi.restoreAllMocks();
 * });
 * ```
 */
export function setupAnthropicMock() {
	const originalFetch = globalThis.fetch;

	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input.toString();

		// Intercept Anthropic API calls
		if (url === "https://api.anthropic.com/v1/messages") {
			const body = JSON.parse(init?.body as string);
			const userMessage = body.messages[0].content;

			// Extract agent name from prompt for persona generation
			const nameMatch = userMessage.match(/「(.+?)」/);
			const agentName = nameMatch ? nameMatch[1] : "Test Agent";

			// Return mock persona
			const persona = createMockPersona(agentName);
			const response = createMockAnthropicResponse(JSON.stringify(persona));

			return new Response(JSON.stringify(response), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		// Pass through other requests
		return originalFetch(input, init);
	}) as typeof fetch;
}

/**
 * Setup Anthropic mock that simulates API failure
 *
 * Useful for testing error handling and fallback behavior
 */
export function setupAnthropicMockWithFailure() {
	const originalFetch = globalThis.fetch;

	globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
		const url = typeof input === "string" ? input : input.toString();

		// Intercept Anthropic API calls and return error
		if (url === "https://api.anthropic.com/v1/messages") {
			return new Response(JSON.stringify({ error: "API Error" }), {
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		// Pass through other requests
		return originalFetch(input, _init);
	}) as typeof fetch;
}
