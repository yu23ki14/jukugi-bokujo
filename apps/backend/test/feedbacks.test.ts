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
const FEEDBACK_1_ID = "70000001-0000-4000-8000-000000000001";
const FEEDBACK_2_ID = "70000002-0000-4000-8000-000000000002";
const STRATEGY_1_ID = "80000001-0000-4000-8000-000000000001";

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
			"INSERT INTO topics (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)",
		)
		.bind(topicId, title, description, now, now)
		.run();
}

async function createTestSession(
	db: D1Database,
	sessionId: string,
	topicId: string,
	status = "completed",
	currentTurn = 10,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			`INSERT INTO sessions (id, topic_id, status, participant_count, current_turn, max_turns, started_at, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, 2, ?, 10, ?, ?, ?, ?)`,
		)
		.bind(sessionId, topicId, status, currentTurn, now, now, now, now)
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

async function createTestFeedback(
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

async function createTestStrategy(
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

describe("Feedbacks API", () => {
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
				status TEXT NOT NULL DEFAULT 'active',
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
			CREATE TABLE IF NOT EXISTS feedbacks (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				session_id TEXT NOT NULL,
				content TEXT NOT NULL,
				reflection_id TEXT,
				applied_at INTEGER,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (agent_id) REFERENCES agents(id),
				FOREIGN KEY (session_id) REFERENCES sessions(id),
				UNIQUE(agent_id, session_id)
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS session_strategies (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				session_id TEXT NOT NULL,
				feedback_id TEXT,
				strategy TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (agent_id) REFERENCES agents(id),
				FOREIGN KEY (session_id) REFERENCES sessions(id),
				FOREIGN KEY (feedback_id) REFERENCES feedbacks(id),
				UNIQUE(agent_id, session_id)
			)
		`).run();

		// Clean tables in reverse dependency order
		await env.DB.batch([
			env.DB.prepare("DELETE FROM session_strategies"),
			env.DB.prepare("DELETE FROM feedbacks"),
			env.DB.prepare("DELETE FROM session_participants"),
			env.DB.prepare("DELETE FROM sessions"),
			env.DB.prepare("DELETE FROM topics"),
			env.DB.prepare("DELETE FROM agents"),
			env.DB.prepare("DELETE FROM users"),
		]);

		// Create test users
		await createTestUser(env.DB, MOCK_USERS.USER_1);
		await createTestUser(env.DB, MOCK_USERS.USER_2);

		// Create test agents (AGENT_1 by USER_1, AGENT_2 by USER_2)
		await createTestAgent(env.DB, AGENT_1_ID, MOCK_USERS.USER_1, "Test Agent 1");
		await createTestAgent(env.DB, AGENT_2_ID, MOCK_USERS.USER_2, "Test Agent 2");

		// Create topic
		await createTestTopic(env.DB, TOPIC_1_ID, "Test Topic", "A topic for testing feedbacks");

		// Create completed session
		await createTestSession(env.DB, SESSION_1_ID, TOPIC_1_ID, "completed", 10);

		// Add AGENT_1 as participant in SESSION_1
		await createTestParticipant(env.DB, PARTICIPANT_1_ID, SESSION_1_ID, AGENT_1_ID);
	});

	// ========================================================================
	// POST /api/agents/:agentId/feedbacks - Create Feedback
	// ========================================================================

	describe("POST /api/agents/:agentId/feedbacks - Create Feedback", () => {
		it("should create feedback for completed session", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "前回の議論ではよい論点を出していました。次回も頑張ってください。",
				}),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("id");
			expect(data).toHaveProperty("agent_id", AGENT_1_ID);
			expect(data).toHaveProperty("session_id", SESSION_1_ID);
			expect(data).toHaveProperty(
				"content",
				"前回の議論ではよい論点を出していました。次回も頑張ってください。",
			);
			expect(data).toHaveProperty("created_at");
		});

		it("should trim whitespace from content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "  よい議論でした  ",
				}),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.content).toBe("よい議論でした");
		});

		it("should return 400 when session is not completed", async () => {
			const activeSessionId = "30000002-0000-4000-8000-000000000002";
			const participantId = "50000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, activeSessionId, TOPIC_1_ID, "active", 5);
			await createTestParticipant(env.DB, participantId, activeSessionId, AGENT_1_ID);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: activeSessionId,
					content: "フィードバックです",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 when agent is not a participant", async () => {
			// AGENT_2 is not a participant in SESSION_1
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_2),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "フィードバックです",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 409 when feedback already exists for session", async () => {
			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"既存のフィードバック",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "二回目のフィードバック",
				}),
			});

			expect(response.status).toBe(409);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "フィードバックです",
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "フィードバックです",
				}),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createUnauthHeaders(),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "フィードバックです",
				}),
			});

			expect([401, 500]).toContain(response.status);
		});

		it("should return 400 with empty content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with content exceeding 400 chars", async () => {
			const longContent = "a".repeat(401);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: SESSION_1_ID,
					content: longContent,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 404 for non-existent session", async () => {
			const fakeSessionId = "39999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					session_id: fakeSessionId,
					content: "フィードバックです",
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	// ========================================================================
	// PUT /api/agents/:agentId/feedbacks/:id - Update Feedback
	// ========================================================================

	describe("PUT /api/agents/:agentId/feedbacks/:id - Update Feedback", () => {
		it("should update feedback content", async () => {
			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"元のフィードバック",
			);

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/feedbacks/${FEEDBACK_1_ID}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...createMockAuthHeaders(MOCK_USERS.USER_1),
					},
					body: JSON.stringify({
						content: "更新されたフィードバック",
					}),
				},
			);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("id", FEEDBACK_1_ID);
			expect(data).toHaveProperty("content", "更新されたフィードバック");
			expect(data).toHaveProperty("session_id", SESSION_1_ID);
			expect(data).toHaveProperty("created_at");
		});

		it("should return 400 when feedback already applied", async () => {
			const appliedAt = Math.floor(Date.now() / 1000);
			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"適用済みのフィードバック",
				appliedAt,
			);

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/feedbacks/${FEEDBACK_1_ID}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...createMockAuthHeaders(MOCK_USERS.USER_1),
					},
					body: JSON.stringify({
						content: "更新しようとしたフィードバック",
					}),
				},
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
			expect(data).toHaveProperty("code", "ALREADY_APPLIED");
		});

		it("should return 404 for non-existent feedback", async () => {
			const fakeFeedbackId = "79999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/feedbacks/${fakeFeedbackId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...createMockAuthHeaders(MOCK_USERS.USER_1),
					},
					body: JSON.stringify({
						content: "更新内容",
					}),
				},
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			// Create feedback for AGENT_2 (owned by USER_2)
			const participantId = "50000003-0000-4000-8000-000000000003";
			await createTestParticipant(env.DB, participantId, SESSION_1_ID, AGENT_2_ID);
			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_2_ID,
				SESSION_1_ID,
				"USER_2のフィードバック",
			);

			// Try to update with USER_1's credentials
			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_2_ID}/feedbacks/${FEEDBACK_1_ID}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...createMockAuthHeaders(MOCK_USERS.USER_1),
					},
					body: JSON.stringify({
						content: "不正な更新",
					}),
				},
			);

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			await createTestFeedback(env.DB, FEEDBACK_1_ID, AGENT_1_ID, SESSION_1_ID, "フィードバック");

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/feedbacks/${FEEDBACK_1_ID}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...createUnauthHeaders(),
					},
					body: JSON.stringify({
						content: "更新内容",
					}),
				},
			);

			expect([401, 500]).toContain(response.status);
		});
	});

	// ========================================================================
	// GET /api/agents/:agentId/feedbacks - List Feedbacks
	// ========================================================================

	describe("GET /api/agents/:agentId/feedbacks - List Feedbacks", () => {
		it("should return all feedbacks for agent", async () => {
			// Create a second completed session for the second feedback
			const session2Id = "30000002-0000-4000-8000-000000000002";
			const participant2Id = "50000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, session2Id, TOPIC_1_ID, "completed", 10);
			await createTestParticipant(env.DB, participant2Id, session2Id, AGENT_1_ID);

			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"最初のフィードバック",
			);
			await createTestFeedback(
				env.DB,
				FEEDBACK_2_ID,
				AGENT_1_ID,
				session2Id,
				"二番目のフィードバック",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("feedbacks");
			expect(Array.isArray(data.feedbacks)).toBe(true);
			expect(data.feedbacks.length).toBe(2);

			// Verify feedback structure
			const feedback = data.feedbacks[0];
			expect(feedback).toHaveProperty("id");
			expect(feedback).toHaveProperty("session_id");
			expect(feedback).toHaveProperty("content");
			expect(feedback).toHaveProperty("created_at");
		});

		it("should return empty array when no feedbacks", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("feedbacks");
			expect(Array.isArray(data.feedbacks)).toBe(true);
			expect(data.feedbacks.length).toBe(0);
		});

		it("should filter by session_id", async () => {
			// Create a second completed session
			const session2Id = "30000002-0000-4000-8000-000000000002";
			const participant2Id = "50000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, session2Id, TOPIC_1_ID, "completed", 10);
			await createTestParticipant(env.DB, participant2Id, session2Id, AGENT_1_ID);

			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"セッション1のフィードバック",
			);
			await createTestFeedback(
				env.DB,
				FEEDBACK_2_ID,
				AGENT_1_ID,
				session2Id,
				"セッション2のフィードバック",
			);

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/feedbacks?session_id=${SESSION_1_ID}`,
				{
					method: "GET",
					headers: createMockAuthHeaders(MOCK_USERS.USER_1),
				},
			);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.feedbacks.length).toBe(1);
			expect(data.feedbacks[0].session_id).toBe(SESSION_1_ID);
		});

		it("should include applied_at when set", async () => {
			const appliedAt = Math.floor(Date.now() / 1000);
			await createTestFeedback(
				env.DB,
				FEEDBACK_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"適用済みフィードバック",
				appliedAt,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.feedbacks.length).toBe(1);
			expect(data.feedbacks[0].applied_at).toBe(appliedAt);
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/feedbacks`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/feedbacks`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without auth", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/feedbacks`, {
				method: "GET",
				headers: createUnauthHeaders(),
			});

			expect([401, 500]).toContain(response.status);
		});
	});

	// ========================================================================
	// GET /api/agents/:agentId/strategies - List Strategies
	// ========================================================================

	describe("GET /api/agents/:agentId/strategies - List Strategies", () => {
		it("should return strategies for agent", async () => {
			await createTestStrategy(
				env.DB,
				STRATEGY_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"環境問題について経済的観点を重視する",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/strategies`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("strategies");
			expect(Array.isArray(data.strategies)).toBe(true);
			expect(data.strategies.length).toBe(1);

			// Verify strategy structure
			const strategy = data.strategies[0];
			expect(strategy).toHaveProperty("id", STRATEGY_1_ID);
			expect(strategy).toHaveProperty("agent_id", AGENT_1_ID);
			expect(strategy).toHaveProperty("session_id", SESSION_1_ID);
			expect(strategy).toHaveProperty("strategy", "環境問題について経済的観点を重視する");
			expect(strategy).toHaveProperty("created_at");
		});

		it("should return empty array when no strategies", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/strategies`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("strategies");
			expect(Array.isArray(data.strategies)).toBe(true);
			expect(data.strategies.length).toBe(0);
		});

		it("should filter by session_id", async () => {
			// Create a second completed session and strategy
			const session2Id = "30000002-0000-4000-8000-000000000002";
			const participant2Id = "50000002-0000-4000-8000-000000000002";
			const strategy2Id = "80000002-0000-4000-8000-000000000002";
			await createTestSession(env.DB, session2Id, TOPIC_1_ID, "completed", 10);
			await createTestParticipant(env.DB, participant2Id, session2Id, AGENT_1_ID);

			await createTestStrategy(
				env.DB,
				STRATEGY_1_ID,
				AGENT_1_ID,
				SESSION_1_ID,
				"セッション1の戦略",
			);
			await createTestStrategy(env.DB, strategy2Id, AGENT_1_ID, session2Id, "セッション2の戦略");

			const response = await SELF.fetch(
				`http://example.com/api/agents/${AGENT_1_ID}/strategies?session_id=${SESSION_1_ID}`,
				{
					method: "GET",
					headers: createMockAuthHeaders(MOCK_USERS.USER_1),
				},
			);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.strategies.length).toBe(1);
			expect(data.strategies[0].session_id).toBe(SESSION_1_ID);
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/strategies`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/strategies`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without auth", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/strategies`, {
				method: "GET",
				headers: createUnauthHeaders(),
			});

			expect([401, 500]).toContain(response.status);
		});
	});
});
