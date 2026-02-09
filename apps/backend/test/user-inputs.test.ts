import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockAuthHeaders, createUnauthHeaders } from "./helpers/auth-mock";
import { getUserInput } from "./helpers/database";
import { createUserInputRequestBody, TEST_USER_INPUTS } from "./helpers/test-data";

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

async function createTestUserInput(
	db: D1Database,
	inputId: string,
	agentId: string,
	inputType: "direction" | "feedback",
	content: string,
	appliedAt?: number | null,
) {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO user_inputs (id, agent_id, input_type, content, applied_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(inputId, agentId, inputType, content, appliedAt ?? null, now)
		.run();
}

describe("User Inputs API", () => {
	const AGENT_1_ID = "00000001-0000-4000-8000-000000000001";
	const AGENT_2_ID = "00000002-0000-4000-8000-000000000002";
	const INPUT_1_ID = "20000001-0000-4000-8000-000000000001";
	const INPUT_2_ID = "20000002-0000-4000-8000-000000000002";

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
			CREATE TABLE IF NOT EXISTS user_inputs (
				id TEXT PRIMARY KEY,
				agent_id TEXT NOT NULL,
				input_type TEXT NOT NULL,
				content TEXT NOT NULL,
				applied_at INTEGER,
				created_at INTEGER NOT NULL,
				FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
			)
		`).run();

		await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id)").run();
		await env.DB.prepare(
			"CREATE INDEX IF NOT EXISTS idx_user_inputs_agent_id ON user_inputs(agent_id)",
		).run();

		// Clean only the tables we created
		await env.DB.batch([
			env.DB.prepare("DELETE FROM user_inputs"),
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

	describe("POST /api/agents/:agentId/inputs - Create User Input", () => {
		it("should create direction input for owned agent", async () => {
			const requestBody = createUserInputRequestBody("direction", TEST_USER_INPUTS.direction[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
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
			expect(data).toHaveProperty("input_type", "direction");
			expect(data).toHaveProperty("content", TEST_USER_INPUTS.direction[0]);
			expect(data).toHaveProperty("created_at");
			// applied_at is not included in CREATE response, only in LIST response
			expect(data.applied_at).toBeUndefined();

			// Verify in database
			const dbEntry = await getUserInput(env.DB, data.id);
			expect(dbEntry).not.toBeNull();
			expect(dbEntry?.input_type).toBe("direction");
		});

		it("should create feedback input for owned agent", async () => {
			const requestBody = createUserInputRequestBody("feedback", TEST_USER_INPUTS.feedback[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("input_type", "feedback");
			expect(data).toHaveProperty("content", TEST_USER_INPUTS.feedback[0]);
		});

		it("should trim whitespace from content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					input_type: "direction",
					content: "  Whitespace Content  ",
				}),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.content).toBe("Whitespace Content");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";
			const requestBody = createUserInputRequestBody("direction", TEST_USER_INPUTS.direction[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/inputs`, {
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
			const requestBody = createUserInputRequestBody("direction", TEST_USER_INPUTS.direction[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/inputs`, {
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
			const requestBody = createUserInputRequestBody("direction", TEST_USER_INPUTS.direction[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createUnauthHeaders(),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with invalid input_type", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					input_type: "invalid_type",
					content: "Some content",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with empty content", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					input_type: "direction",
					content: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 with content exceeding max length", async () => {
			const longContent = "a".repeat(5001); // Max is 5000
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify({
					input_type: "direction",
					content: longContent,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should set applied_at to null initially", async () => {
			const requestBody = createUserInputRequestBody("direction", TEST_USER_INPUTS.direction[0]);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...createMockAuthHeaders(MOCK_USERS.USER_1),
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			// applied_at is not included in CREATE response
			expect(data.applied_at).toBeUndefined();

			// Verify in database that it's null
			const dbEntry = await getUserInput(env.DB, data.id);
			expect(dbEntry?.applied_at).toBeNull();
		});
	});

	describe("GET /api/agents/:agentId/inputs - List User Inputs", () => {
		it("should return all inputs for owned agent", async () => {
			// Create test inputs
			await createTestUserInput(
				env.DB,
				INPUT_1_ID,
				AGENT_1_ID,
				"direction",
				TEST_USER_INPUTS.direction[0],
			);
			await createTestUserInput(
				env.DB,
				INPUT_2_ID,
				AGENT_1_ID,
				"feedback",
				TEST_USER_INPUTS.feedback[0],
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("inputs");
			expect(Array.isArray(data.inputs)).toBe(true);
			expect(data.inputs.length).toBe(2);

			// Verify input structure
			const input = data.inputs[0];
			expect(input).toHaveProperty("id");
			expect(input).toHaveProperty("input_type");
			expect(input).toHaveProperty("content");
			expect(input).toHaveProperty("applied_at");
			expect(input).toHaveProperty("created_at");
		});

		it("should return empty array for agent with no inputs", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("inputs");
			expect(Array.isArray(data.inputs)).toBe(true);
			expect(data.inputs.length).toBe(0);
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeAgentId = "99999999-0000-4000-8000-000000000999";
			const response = await SELF.fetch(`http://example.com/api/agents/${fakeAgentId}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 for agent owned by different user", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_2_ID}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "GET",
				headers: createUnauthHeaders(),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should order by created_at DESC", async () => {
			// Create inputs with slight time difference
			await createTestUserInput(env.DB, INPUT_1_ID, AGENT_1_ID, "direction", "First input");
			// Add small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));
			await createTestUserInput(env.DB, INPUT_2_ID, AGENT_1_ID, "feedback", "Second input");

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			const data = await response.json();
			expect(data.inputs.length).toBeGreaterThanOrEqual(2);

			// Check that inputs are sorted by created_at DESC
			for (let i = 0; i < data.inputs.length - 1; i++) {
				expect(data.inputs[i].created_at).toBeGreaterThanOrEqual(data.inputs[i + 1].created_at);
			}
		});

		it("should include applied_at timestamp when applied", async () => {
			const appliedTimestamp = Math.floor(Date.now() / 1000);
			await createTestUserInput(
				env.DB,
				INPUT_1_ID,
				AGENT_1_ID,
				"direction",
				TEST_USER_INPUTS.direction[0],
				appliedTimestamp,
			);

			const response = await SELF.fetch(`http://example.com/api/agents/${AGENT_1_ID}/inputs`, {
				method: "GET",
				headers: createMockAuthHeaders(MOCK_USERS.USER_1),
			});

			const data = await response.json();
			expect(data.inputs.length).toBe(1);
			expect(data.inputs[0].applied_at).toBe(appliedTimestamp);
		});
	});
});
