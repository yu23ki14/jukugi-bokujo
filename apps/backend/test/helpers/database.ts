/**
 * Database test utilities
 *
 * Helper functions for setting up and cleaning test data
 */

import type { AgentPersona } from "../../src/types/database";

/**
 * Clean all test data from database
 *
 * This should be called in beforeEach to ensure test isolation
 */
export async function cleanDatabase(db: D1Database) {
	// Delete in order to respect foreign key constraints
	await db.batch([
		db.prepare("DELETE FROM statements"),
		db.prepare("DELETE FROM turns"),
		db.prepare("DELETE FROM session_participations"),
		db.prepare("DELETE FROM sessions"),
		db.prepare("DELETE FROM user_inputs"),
		db.prepare("DELETE FROM knowledge_entries"),
		db.prepare("DELETE FROM agents"),
		db.prepare("DELETE FROM topics"),
		db.prepare("DELETE FROM users"),
	]);
}

/**
 * Create a test user directly in database
 */
export async function createTestUser(db: D1Database, userId: string) {
	const now = new Date().toISOString();
	await db
		.prepare("INSERT INTO users (id, clerk_user_id, created_at) VALUES (?, ?, ?)")
		.bind(userId, userId, now)
		.run();
}

/**
 * Create a test agent with predictable persona
 */
export async function createTestAgent(
	db: D1Database,
	agentId: string,
	userId: string,
	name: string,
	persona?: AgentPersona,
) {
	const defaultPersona: AgentPersona = {
		core_values: ["Test Value 1", "Test Value 2"],
		thinking_style: "Test thinking style",
		personality_traits: ["Test Trait 1", "Test Trait 2"],
		background: "Test background",
		version: 1,
	};

	const now = new Date().toISOString();
	await db
		.prepare(
			"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(agentId, userId, name, JSON.stringify(persona ?? defaultPersona), now, now)
		.run();
}

/**
 * Create a test knowledge entry
 */
export async function createTestKnowledge(
	db: D1Database,
	knowledgeId: string,
	agentId: string,
	title: string,
	content: string,
) {
	const now = new Date().toISOString();
	await db
		.prepare(
			"INSERT INTO knowledge_entries (id, agent_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(knowledgeId, agentId, title, content, now, now)
		.run();
}

/**
 * Create a test user input
 */
export async function createTestUserInput(
	db: D1Database,
	inputId: string,
	agentId: string,
	inputType: "direction" | "feedback",
	content: string,
	appliedAt?: string,
) {
	const now = new Date().toISOString();
	await db
		.prepare(
			"INSERT INTO user_inputs (id, agent_id, input_type, content, applied_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(inputId, agentId, inputType, content, appliedAt ?? null, now)
		.run();
}

/**
 * Create a test topic
 */
export async function createTestTopic(
	db: D1Database,
	topicId: string,
	title: string,
	description: string,
	isPublic = true,
) {
	const now = new Date().toISOString();
	await db
		.prepare(
			"INSERT INTO topics (id, title, description, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(topicId, title, description, isPublic ? 1 : 0, now, now)
		.run();
}

/**
 * Get agent from database
 */
export async function getAgent(db: D1Database, agentId: string) {
	return await db.prepare("SELECT * FROM agents WHERE id = ?").bind(agentId).first();
}

/**
 * Get knowledge entry from database
 */
export async function getKnowledge(db: D1Database, knowledgeId: string) {
	return await db.prepare("SELECT * FROM knowledge_entries WHERE id = ?").bind(knowledgeId).first();
}

/**
 * Get user input from database
 */
export async function getUserInput(db: D1Database, inputId: string) {
	return await db.prepare("SELECT * FROM user_inputs WHERE id = ?").bind(inputId).first();
}

/**
 * Count agents for a user
 */
export async function countUserAgents(db: D1Database, userId: string): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM agents WHERE user_id = ?")
		.bind(userId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}

/**
 * Count knowledge entries for an agent
 */
export async function countAgentKnowledge(db: D1Database, agentId: string): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM knowledge_entries WHERE agent_id = ?")
		.bind(agentId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}

/**
 * Count user inputs for an agent
 */
export async function countAgentInputs(db: D1Database, agentId: string): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM user_inputs WHERE agent_id = ?")
		.bind(agentId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}
