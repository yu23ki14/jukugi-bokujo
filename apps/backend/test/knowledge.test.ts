import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockAuthHeaders, createUnauthHeaders } from "./helpers/auth-mock";
import { countAgentKnowledge, getKnowledge } from "./helpers/database";
import { createKnowledgeRequestBody, TEST_KNOWLEDGE } from "./helpers/test-data";

const MOCK_USERS = {
	USER_1: "user_test1234567890",
	USER_2: "user_test0987654321",
} as const;

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

async function createTestKnowledge(
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

describe("Knowledge API", () => {
	const AGENT_1_ID = "00000001-0000-4000-8000-000000000001";
	const AGENT_2_ID = "00000002-0000-4000-8000-000000000002";
	const KNOWLEDGE_1_ID = "10000001-0000-4000-8000-000000000001";
	const KNOWLEDGE_2_ID = "10000002-0000-4000-8000-000000000002";

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
			CREATE TABLE IF NOT EXISTS knowledge_entries (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				embedding_text TEXT,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
			)
		`).run();

		await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id)").run();
		await env.DB.prepare(
			"CREATE INDEX IF NOT EXISTS idx_knowledge_agent_id ON knowledge_entries(agent_id)",
		).run();

		// Clean only the tables we created
		await env.DB.batch([
			env.DB.prepare("DELETE FROM knowledge_entries"),
			env.DB.prepare("DELETE FROM agents"),
			env.DB.prepare("DELETE FROM users"),
		]);

		// Create test users
		await createTestUser(env.DB, MOCK_USERS.USER_1);
		await createTestUser(env.DB, MOCK_USERS.USER_2);

		// Create test agents
		await createTestAgent(env.DB, AGENT_1_ID, MOCK_USERS.USER_1, "Test Agent 1");
		await createTestAgent(env.DB, AGENT_2_ID, MOCK_USERS.USER_2, "Test Agent 2");
	});

	describe("POST /api/agents/:agentId/knowledge - Create Knowledge", () => {
		it("should create knowledge entry for owned agent", async () => {
			const requestBody = createKnowledgeRequestBody(
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("id");
			expect(data).toHaveProperty("agent_id", AGENT_1_ID);
			expect(data).toHaveProperty("title", TEST_KNOWLEDGE[0].title);
			expect(data).toHaveProperty("content", TEST_KNOWLEDGE[0].content);
			expect(data).toHaveProperty("created_at");

			// Verify in database
			const dbEntry = await getKnowledge(env.DB, data.id);
			expect(dbEntry).not.toBeNull();
			expect(dbEntry?.title).toBe(TEST_KNOWLEDGE[0].title);
		});

		it("should trim whitespace from title and content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: "  Whitespace Title  ",
					content: "  Whitespace Content  ",
				}),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.title).toBe("Whitespace Title");
			expect(data.content).toBe("Whitespace Content");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";
			const requestBody = createKnowledgeRequestBody(
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const requestBody = createKnowledgeRequestBody(
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const requestBody = createKnowledgeRequestBody(
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createUnauthHeaders(),
				},
				body: JSON.stringify(requestBody),
			});

			expect([401, 500]).toContain(response.status);
		});

		it("should return 400 with empty title", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: "",
					content: TEST_KNOWLEDGE[0].content,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with empty content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: TEST_KNOWLEDGE[0].title,
					content: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with title exceeding max length", async () => {
			const longTitle = "a".repeat(31);
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: longTitle,
					content: TEST_KNOWLEDGE[0].content,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with content exceeding max length", async () => {
			const longContent = "a".repeat(501);
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: TEST_KNOWLEDGE[0].title,
					content: longContent,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 409 when knowledge slots are full", async () => {
			// Create 10 knowledge entries to fill all slots
			for (let i = 0; i < 10; i++) {
				const kid = `10000${String(i).padStart(3, "0")}-0000-4000-8000-000000000000`;
				await createTestKnowledge(env.DB, kid, AGENT_1_ID, `Title ${i}`, `Content ${i}`);
			}

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					title: "Overflow",
					content: "This should fail",
				}),
			});

			expect(response.status).toBe(409);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("GET /api/agents/:agentId/knowledge - List Knowledge", () => {
		it("should return all knowledge for owned agent", async () => {
			// Create test knowledge
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_1_ID,
				AGENT_1_ID,
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_2_ID,
				AGENT_1_ID,
				TEST_KNOWLEDGE[1].title,
				TEST_KNOWLEDGE[1].content,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("knowledge");
			expect(Array.isArray(data.knowledge)).toBe(true);
			expect(data.knowledge.length).toBe(2);

			// Verify knowledge structure
			const knowledge = data.knowledge[0];
			expect(knowledge).toHaveProperty("id");
			expect(knowledge).toHaveProperty("title");
			expect(knowledge).toHaveProperty("content");
			expect(knowledge).toHaveProperty("created_at");
		});

		it("should return empty array for agent with no knowledge", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("knowledge");
			expect(Array.isArray(data.knowledge)).toBe(true);
			expect(data.knowledge.length).toBe(0);
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";
			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/knowledge`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/knowledge`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "GET",
				headers: createUnauthHeaders(),
			});

			expect([401, 500]).toContain(response.status);
		});

		it("should order by created_at DESC", async () => {
			// Create knowledge entries with slight time difference
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_1_ID,
				AGENT_1_ID,
				"First Knowledge",
				"First content",
			);
			// Add small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_2_ID,
				AGENT_1_ID,
				"Second Knowledge",
				"Second content",
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/knowledge`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			const data = await response.json();
			expect(data.knowledge.length).toBeGreaterThanOrEqual(2);

			// Check that knowledge is sorted by created_at DESC
			for (let i = 0; i < data.knowledge.length - 1; i++) {
				expect(data.knowledge[i].created_at).toBeGreaterThanOrEqual(
					data.knowledge[i + 1].created_at,
				);
			}
		});
	});

	describe("DELETE /api/knowledge/:id - Delete Knowledge", () => {
		it("should delete knowledge entry", async () => {
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_1_ID,
				AGENT_1_ID,
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/knowledge/${KNOWLEDGE_1_ID}`, {
				method: "DELETE",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("success", true);
			expect(data).toHaveProperty("message");

			// Verify knowledge is actually deleted from database
			const dbEntry = await getKnowledge(env.DB, KNOWLEDGE_1_ID);
			expect(dbEntry).toBeNull();
		});

		it("should return 404 for non-existent knowledge", async () => {
			const fakeId = "19999999-0000-4000-8000-000000000999";
			const response = await SELF.fetch(`http://example.com/api/knowledge/${fakeId}`, {
				method: "DELETE",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for knowledge owned by different user's agent", async () => {
			// Create knowledge for USER_2's agent
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_2_ID,
				AGENT_2_ID,
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			// Try to delete with USER_1's credentials
			const response = await SELF.fetch(`http://example.com/api/knowledge/${KNOWLEDGE_2_ID}`, {
				method: "DELETE",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");

			// Verify knowledge was NOT deleted
			const dbEntry = await getKnowledge(env.DB, KNOWLEDGE_2_ID);
			expect(dbEntry).not.toBeNull();
		});

		it("should return 401 without authentication", async () => {
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_1_ID,
				AGENT_1_ID,
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			const response = await SELF.fetch(`http://example.com/api/knowledge/${KNOWLEDGE_1_ID}`, {
				method: "DELETE",
				headers: createUnauthHeaders(),
			});

			expect([401, 500]).toContain(response.status);
		});

		it("should verify knowledge is actually deleted from database", async () => {
			await createTestKnowledge(
				env.DB,
				KNOWLEDGE_1_ID,
				AGENT_1_ID,
				TEST_KNOWLEDGE[0].title,
				TEST_KNOWLEDGE[0].content,
			);

			// Verify it exists before deletion
			const beforeDelete = await getKnowledge(env.DB, KNOWLEDGE_1_ID);
			expect(beforeDelete).not.toBeNull();

			// Delete via API
			await SELF.fetch(`http://example.com/api/knowledge/${KNOWLEDGE_1_ID}`, {
				method: "DELETE",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			// Verify it's gone
			const afterDelete = await getKnowledge(env.DB, KNOWLEDGE_1_ID);
			expect(afterDelete).toBeNull();

			// Verify count
			const count = await countAgentKnowledge(env.DB, AGENT_1_ID);
			expect(count).toBe(0);
		});
	});
});
