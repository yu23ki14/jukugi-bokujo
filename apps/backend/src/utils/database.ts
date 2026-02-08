/**
 * Database utility functions
 */

import type { Agent, AgentPersona, AgentWithPersona, User } from "../types/database";

/**
 * Parse agent persona from JSON string
 */
export function parseAgentPersona(agent: Agent): AgentWithPersona {
	return {
		...agent,
		persona: JSON.parse(agent.persona) as AgentPersona,
	};
}

/**
 * Stringify agent persona to JSON string
 */
export function stringifyAgentPersona(persona: AgentPersona): string {
	return JSON.stringify(persona);
}

/**
 * Get or create user
 */
export async function getOrCreateUser(db: D1Database, userId: string): Promise<User> {
	// Check if user exists
	const existing = await db
		.prepare("SELECT id, created_at, updated_at FROM users WHERE id = ?")
		.bind(userId)
		.first<User>();

	if (existing) {
		return existing;
	}

	// Create new user
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
		.bind(userId, now, now)
		.run();

	return {
		id: userId,
		created_at: now,
		updated_at: now,
	};
}
