import { env, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NPC_AGENT_IDS, TUTORIAL_TOPIC_ID } from "../src/config/constants";

describe("Tutorial API", () => {
	const TEST_USER_ID = "test-user-tutorial-1";
	const OTHER_USER_ID = "test-user-tutorial-2";
	const authHeader = `Bearer mock-token-${TEST_USER_ID}`;
	const otherAuthHeader = `Bearer mock-token-${OTHER_USER_ID}`;

	const AGENT_ID = "agent-tutorial-001";
	const AGENT_ID_2 = "agent-tutorial-002";
	const OTHER_AGENT_ID = "agent-tutorial-003";

	beforeAll(async () => {
		// Create tables
		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)`,
		).run();

		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS agents (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				name TEXT NOT NULL,
				persona TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'active',
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			)`,
		).run();

		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS topics (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'active',
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)`,
		).run();

		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				topic_id TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'pending',
				mode TEXT DEFAULT 'double_diamond',
				participant_count INTEGER NOT NULL DEFAULT 0,
				current_turn INTEGER NOT NULL DEFAULT 0,
				max_turns INTEGER NOT NULL DEFAULT 10,
				is_tutorial INTEGER DEFAULT 0,
				summary TEXT,
				judge_verdict TEXT,
				started_at INTEGER,
				completed_at INTEGER,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)`,
		).run();

		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS session_participants (
				id TEXT PRIMARY KEY,
				session_id TEXT NOT NULL,
				agent_id TEXT NOT NULL,
				joined_at INTEGER NOT NULL,
				speaking_order INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
				FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
				UNIQUE(session_id, agent_id)
			)`,
		).run();

		await env.DB.prepare(
			`CREATE TABLE IF NOT EXISTS turns (
				id TEXT PRIMARY KEY,
				session_id TEXT NOT NULL,
				turn_number INTEGER NOT NULL,
				status TEXT NOT NULL DEFAULT 'pending',
				summary TEXT,
				started_at INTEGER,
				completed_at INTEGER,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
			)`,
		).run();
	});

	beforeEach(async () => {
		// Clean data
		await env.DB.batch([
			env.DB.prepare("DELETE FROM turns"),
			env.DB.prepare("DELETE FROM session_participants"),
			env.DB.prepare("DELETE FROM sessions"),
			env.DB.prepare("DELETE FROM agents"),
			env.DB.prepare("DELETE FROM topics"),
			env.DB.prepare("DELETE FROM users"),
		]);

		const now = Math.floor(Date.now() / 1000);
		const persona = JSON.stringify({
			core_values: ["テスト"],
			thinking_style: "テスト",
			personality_traits: ["テスト"],
			background: "テスト",
			version: 1,
		});

		// Create test users
		await env.DB.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
			.bind(TEST_USER_ID, now, now)
			.run();
		await env.DB.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
			.bind(OTHER_USER_ID, now, now)
			.run();
		await env.DB.prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
			.bind("system", now, now)
			.run();

		// Create test agents
		await env.DB.prepare(
			"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(AGENT_ID, TEST_USER_ID, "テストなかま1", persona, now, now)
			.run();
		await env.DB.prepare(
			"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(AGENT_ID_2, TEST_USER_ID, "テストなかま2", persona, now, now)
			.run();
		await env.DB.prepare(
			"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(OTHER_AGENT_ID, OTHER_USER_ID, "他ユーザーなかま", persona, now, now)
			.run();

		// Create NPC agents
		for (const npcId of NPC_AGENT_IDS) {
			await env.DB.prepare(
				"INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			)
				.bind(npcId, "system", `NPC-${npcId.slice(-1)}`, persona, now, now)
				.run();
		}

		// Create tutorial topic (as migration does)
		await env.DB.prepare(
			"INSERT INTO topics (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)",
		)
			.bind(TUTORIAL_TOPIC_ID, "AIと人間の未来の関係", "テスト用説明", now, now)
			.run();
	});

	async function postTutorial(authorization: string, agentId: string) {
		return SELF.fetch("http://example.com/api/tutorial-session", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authorization,
			},
			body: JSON.stringify({ agentId }),
		});
	}

	describe("POST /api/tutorial-session", () => {
		it("should create a tutorial session", async () => {
			const response = await postTutorial(authHeader, AGENT_ID);
			expect(response.status).toBe(200);

			const data = await response.json<{ sessionId: string }>();
			expect(data).toHaveProperty("sessionId");

			// Verify session was created with correct topic
			const session = await env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
				.bind(data.sessionId)
				.first();
			expect(session).not.toBeNull();
			expect(session!.topic_id).toBe(TUTORIAL_TOPIC_ID);
			expect(session!.is_tutorial).toBe(1);
			expect(session!.mode).toBe("tutorial");
		});

		it("should return 400 when agentId is missing", async () => {
			const response = await SELF.fetch("http://example.com/api/tutorial-session", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(400);
			const data = await response.json<{ error: string }>();
			expect(data.error).toBe("agentId is required");
		});

		it("should return 404 when agent does not exist", async () => {
			const response = await postTutorial(authHeader, "non-existent-agent");
			expect(response.status).toBe(404);
		});

		it("should return 400 when agent belongs to another user", async () => {
			const response = await postTutorial(authHeader, OTHER_AGENT_ID);
			expect(response.status).toBe(400);
			const data = await response.json<{ error: string }>();
			expect(data.error).toBe("Not your agent");
		});

		it("should return existing session if user already has a tutorial (same agent)", async () => {
			// First call creates session
			const res1 = await postTutorial(authHeader, AGENT_ID);
			const data1 = await res1.json<{ sessionId: string }>();

			// Second call with same agent returns existing
			const res2 = await postTutorial(authHeader, AGENT_ID);
			const data2 = await res2.json<{ sessionId: string }>();

			expect(data2.sessionId).toBe(data1.sessionId);
		});

		it("should return existing session if user already has a tutorial (different agent)", async () => {
			// Create tutorial with first agent
			const res1 = await postTutorial(authHeader, AGENT_ID);
			const data1 = await res1.json<{ sessionId: string }>();

			// Try to create tutorial with second agent of same user
			const res2 = await postTutorial(authHeader, AGENT_ID_2);
			const data2 = await res2.json<{ sessionId: string }>();

			// Should return the existing session, not create a new one
			expect(data2.sessionId).toBe(data1.sessionId);

			// Verify only one tutorial session exists
			const sessions = await env.DB.prepare(
				"SELECT COUNT(*) as count FROM sessions WHERE is_tutorial = 1",
			).first<{ count: number }>();
			expect(sessions!.count).toBe(1);
		});

		it("should allow different users to each have their own tutorial", async () => {
			const res1 = await postTutorial(authHeader, AGENT_ID);
			const data1 = await res1.json<{ sessionId: string }>();

			const res2 = await postTutorial(otherAuthHeader, OTHER_AGENT_ID);
			const data2 = await res2.json<{ sessionId: string }>();

			expect(data1.sessionId).not.toBe(data2.sessionId);
		});

		it("should use the pre-seeded tutorial topic, not create a new one", async () => {
			const beforeCount = await env.DB.prepare(
				"SELECT COUNT(*) as count FROM topics",
			).first<{ count: number }>();

			await postTutorial(authHeader, AGENT_ID);

			const afterCount = await env.DB.prepare(
				"SELECT COUNT(*) as count FROM topics",
			).first<{ count: number }>();

			// No new topics should be created
			expect(afterCount!.count).toBe(beforeCount!.count);
		});

		it("should add user agent and 3 NPCs as participants", async () => {
			const res = await postTutorial(authHeader, AGENT_ID);
			const data = await res.json<{ sessionId: string }>();

			const participants = await env.DB.prepare(
				"SELECT agent_id, speaking_order FROM session_participants WHERE session_id = ? ORDER BY speaking_order ASC",
			)
				.bind(data.sessionId)
				.all<{ agent_id: string; speaking_order: number }>();

			expect(participants.results.length).toBe(4);
			expect(participants.results[0].agent_id).toBe(AGENT_ID);
			expect(participants.results[1].agent_id).toBe(NPC_AGENT_IDS[0]);
			expect(participants.results[2].agent_id).toBe(NPC_AGENT_IDS[1]);
			expect(participants.results[3].agent_id).toBe(NPC_AGENT_IDS[2]);
		});

		it("should create turn 1 with processing status", async () => {
			const res = await postTutorial(authHeader, AGENT_ID);
			const data = await res.json<{ sessionId: string }>();

			const turn = await env.DB.prepare(
				"SELECT * FROM turns WHERE session_id = ? AND turn_number = 1",
			)
				.bind(data.sessionId)
				.first();

			expect(turn).not.toBeNull();
			expect(turn!.status).toBe("processing");
		});
	});
});
