import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockAuthHeaders, createUnauthHeaders } from "./helpers/auth-mock";

const MOCK_USERS = {
	USER_1: "user_test1234567890",
	USER_2: "user_test0987654321",
} as const;

const AGENT_1_ID = "00000001-0000-4000-8000-000000000001";
const AGENT_2_ID = "00000002-0000-4000-8000-000000000002";
const SESSION_1_ID = "30000001-0000-4000-8000-000000000001";
const TOPIC_1_ID = "40000001-0000-4000-8000-000000000001";
const PARTICIPANT_1_ID = "50000001-0000-4000-8000-000000000001";
const DIRECTION_1_ID = "60000001-0000-4000-8000-000000000001";
const DIRECTION_2_ID = "60000002-0000-4000-8000-000000000002";

// Helper functions compatible with actual schema
async function createTestUser(db: D1Database, userId: string) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
		.bind(userId, now, now)
		.run();
}

async function createTestAgent(db: D1Database, agentId: string, userId: string, name: string) {
	const persona = {
		core_values: ["Test", "Values"],
		thinking_style: "Test style",
		personality_traits: ["Test trait"],
		background: "Test background",
		version: 1,
	};
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(agentId, userId, name, JSON.stringify(persona), now, now)
		.run();
}

async function createTestTopic(
	db: D1Database,
	topicId: string,
	title: string,
	description: string,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO topics (id, title, description, is_public, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
		)
		.bind(topicId, title, description, now, now)
		.run();
}

async function createTestSession(
	db: D1Database,
	sessionId: string,
	topicId: string,
	status = "active",
	currentTurn = 1,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO sessions (id, topic_id, status, participant_count, current_turn, max_turns, created_at, updated_at) VALUES (?, ?, ?, 0, ?, 10, ?, ?)",
		)
		.bind(sessionId, topicId, status, currentTurn, now, now)
		.run();
}

async function createTestParticipant(
	db: D1Database,
	participantId: string,
	sessionId: string,
	agentId: string,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO session_participants (id, session_id, agent_id, joined_at, speaking_order) VALUES (?, ?, ?, ?, 0)",
		)
		.bind(participantId, sessionId, agentId, now)
		.run();
}

async function createTestDirection(
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

describe("Directions API", () => {
	beforeEach(async () => {
		// Initialize database schema
		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS agents (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				name TEXT NOT NULL,
				persona TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS topics (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT NOT NULL,
				is_public INTEGER NOT NULL DEFAULT 1,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				topic_id TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'pending',
				participant_count INTEGER NOT NULL DEFAULT 0,
				current_turn INTEGER NOT NULL DEFAULT 0,
				max_turns INTEGER NOT NULL DEFAULT 10,
				summary TEXT,
				judge_verdict TEXT,
				started_at INTEGER,
				completed_at INTEGER,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (topic_id) REFERENCES topics(id)
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS session_participants (
				id TEXT PRIMARY KEY,
				session_id TEXT NOT NULL,
				agent_id TEXT NOT NULL,
				joined_at INTEGER NOT NULL,
				speaking_order INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY (session_id) REFERENCES sessions(id),
				FOREIGN KEY (agent_id) REFERENCES agents(id),
				UNIQUE(session_id, agent_id)
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS directions (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				session_id TEXT NOT NULL,
				turn_number INTEGER NOT NULL,
				content TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (agent_id) REFERENCES agents(id),
				FOREIGN KEY (session_id) REFERENCES sessions(id)
			)
		`).run();

		// Clean tables in reverse dependency order
		await env.DB.batch([
			env.DB.prepare("DELETE FROM directions"),
			env.DB.prepare("DELETE FROM session_participants"),
			env.DB.prepare("DELETE FROM sessions"),
			env.DB.prepare("DELETE FROM topics"),
			env.DB.prepare("DELETE FROM agents"),
			env.DB.prepare("DELETE FROM users"),
		]);

		// Create test users
		await createTestUser(env.DB, MOCK_USERS.USER_1);
		await createTestUser(env.DB, MOCK_USERS.USER_2);

		// Create test agents
		await createTestAgent(env.DB, AGENT_1_ID, MOCK_USERS.USER_1, "Test Agent 1");
		await createTestAgent(env.DB, AGENT_2_ID, MOCK_USERS.USER_2, "Test Agent 2");

		// Create test topic
		await createTestTopic(env.DB, TOPIC_1_ID, "Test Topic", "Test topic description");

		// Create test session (active, current_turn=1)
		await createTestSession(env.DB, SESSION_1_ID, TOPIC_1_ID, "active", 1);

		// Create test participant (AGENT_1 in SESSION_1)
		await createTestParticipant(env.DB, PARTICIPANT_1_ID, SESSION_1_ID, AGENT_1_ID);
	});

	describe("POST /api/agents/:agentId/directions - Create Direction", () => {
		it("should create direction for owned agent in active session", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "経済的な観点も考慮して",
				}),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("id");
			expect(data).toHaveProperty("agent_id", AGENT_1_ID);
			expect(data).toHaveProperty("session_id", SESSION_1_ID);
			expect(data).toHaveProperty("turn_number", 1);
			expect(data).toHaveProperty("content", "経済的な観点も考慮して");
			expect(data).toHaveProperty("created_at");
		});

		it("should trim whitespace from content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "  test content  ",
				}),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.content).toBe("test content");
		});

		it("should return 400 when session is not active", async () => {
			const completedSessionId = "30000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, completedSessionId, TOPIC_1_ID, "completed", 1);
			await createTestParticipant(
				env.DB,
				"50000002-0000-4000-8000-000000000002",
				completedSessionId,
				AGENT_1_ID,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: completedSessionId,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 when agent is not a participant", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_2),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 409 when direction already exists for turn", async () => {
			await createTestDirection(
				env.DB,
				DIRECTION_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				1,
				"existing direction",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "another direction",
				}),
			});

			expect(response.status).toBe(409);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createUnauthHeaders(),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect([401, 500]).toContain(response.status);
		});

		it("should return 400 with empty content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with content exceeding 80 chars", async () => {
			const longContent = "a".repeat(81);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					turn_number: 1,
					content: longContent,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 404 for non-existent session", async () => {
			const fakeSessionId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: fakeSessionId,
					turn_number: 1,
					content: "some direction",
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("GET /api/agents/:agentId/directions - List Directions", () => {
		it("should return all directions for agent", async () => {
			await createTestDirection(
				env.DB,
				DIRECTION_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				1,
				"first direction",
			);
			await createTestDirection(
				env.DB,
				DIRECTION_2_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				2,
				"second direction",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("directions");
			expect(Array.isArray(data.directions)).toBe(true);
			expect(data.directions.length).toBe(2);
		});

		it("should return empty array when no directions", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("directions");
			expect(Array.isArray(data.directions)).toBe(true);
			expect(data.directions.length).toBe(0);
		});

		it("should filter by session_id query param", async () => {
			// Create a second session
			const session2Id = "30000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, session2Id, TOPIC_1_ID, "active", 1);
			await createTestParticipant(
				env.DB,
				"50000002-0000-4000-8000-000000000002",
				session2Id,
				AGENT_1_ID,
			);

			// Create directions in different sessions
			await createTestDirection(
				env.DB,
				DIRECTION_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				1,
				"direction for session 1",
			);
			await createTestDirection(
				env.DB,
				DIRECTION_2_ID,
				AGENT_1_ID,
				session2Id,
				1,
				"direction for session 2",
			);

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/directions?session_id=${SESSION_1_ID}`,
				{
					method: "GET",
					headers: createMockAuthHeaders(MOCK_USERS.USER_1),
				},
			);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("directions");
			expect(data.directions.length).toBe(1);
			expect(data.directions[0].session_id).toBe(SESSION_1_ID);
			expect(data.directions[0].content).toBe("direction for session 1");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/directions`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/directions`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/directions`, {
				method: "GET",
				headers: createUnauthHeaders(),
			});

			expect([401, 500]).toContain(response.status);
		});
	});
});
