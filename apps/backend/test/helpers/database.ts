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
		db.prepare("DELETE FROM session_strategies"),
		db.prepare("DELETE FROM feedbacks"),
		db.prepare("DELETE FROM directions"),
		db.prepare("DELETE FROM statements"),
		db.prepare("DELETE FROM turns"),
		db.prepare("DELETE FROM session_participants"),
		db.prepare("DELETE FROM sessions"),
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
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
		.bind(userId, now, now)
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

	const now = Math.floor(Date.now() / 1000);
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
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO knowledge_entries (id, agent_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(knowledgeId, agentId, title, content, now, now)
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
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO topics (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(topicId, title, description, isPublic ? "active" : "archived", now, now)
		.run();
}

/**
 * Create a test session
 */
export async function createTestSession(
	db: D1Database,
	sessionId: string,
	topicId: string,
	status = "active",
	currentTurn = 1,
	maxTurns = 10,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO sessions (id, topic_id, status, current_turn, max_turns, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(sessionId, topicId, status, currentTurn, maxTurns, now, now)
		.run();
}

/**
 * Create a test session participant
 */
export async function createTestSessionParticipant(
	db: D1Database,
	participantId: string,
	sessionId: string,
	agentId: string,
	speakingOrder = 1,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO session_participants (id, session_id, agent_id, joined_at, speaking_order) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(participantId, sessionId, agentId, now, speakingOrder)
		.run();
}

/**
 * Create a test direction
 */
export async function createTestDirection(
	db: D1Database,
	directionId: string,
	agentId: string,
	sessionId: string,
	turnNumber: number,
	content: string,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO directions (id, agent_id, session_id, turn_number, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(directionId, agentId, sessionId, turnNumber, content, now)
		.run();
}

/**
 * Create a test feedback
 */
export async function createTestFeedback(
	db: D1Database,
	feedbackId: string,
	agentId: string,
	sessionId: string,
	content: string,
	appliedAt?: number,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO feedbacks (id, agent_id, session_id, content, applied_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(feedbackId, agentId, sessionId, content, appliedAt ?? null, now)
		.run();
}

/**
 * Create a test session strategy
 */
export async function createTestStrategy(
	db: D1Database,
	strategyId: string,
	agentId: string,
	sessionId: string,
	strategy: string,
	feedbackId?: string,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO session_strategies (id, agent_id, session_id, feedback_id, strategy, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(strategyId, agentId, sessionId, feedbackId ?? null, strategy, now)
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
 * Get direction from database
 */
export async function getDirection(db: D1Database, directionId: string) {
	return await db.prepare("SELECT * FROM directions WHERE id = ?").bind(directionId).first();
}

/**
 * Get feedback from database
 */
export async function getFeedback(db: D1Database, feedbackId: string) {
	return await db.prepare("SELECT * FROM feedbacks WHERE id = ?").bind(feedbackId).first();
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
 * Count directions for an agent
 */
export async function countAgentDirections(db: D1Database, agentId: string): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM directions WHERE agent_id = ?")
		.bind(agentId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}

/**
 * Count feedbacks for an agent
 */
export async function countAgentFeedbacks(db: D1Database, agentId: string): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM feedbacks WHERE agent_id = ?")
		.bind(agentId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}
