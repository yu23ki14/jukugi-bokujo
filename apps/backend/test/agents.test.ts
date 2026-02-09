import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as anthropicService from "../src/services/anthropic";

// Mock the Anthropic service to avoid real API calls
vi.mock("../src/services/anthropic", async () => {
	const actual = await vi.importActual("../src/services/anthropic");
	return {
		...actual,
		generateInitialPersona: vi.fn(async (_env: unknown, agentName: string) => ({
			core_values: ["公平性", "持続可能性", "対話重視"],
			thinking_style: "論理的で慎重、多様な視点を尊重する",
			personality_traits: ["思慮深い", "協調的", "柔軟"],
			background: `${agentName}という名前の市民として様々な社会課題に関心を持つ`,
			version: 1,
		})),
	};
});

describe("Agents API", () => {
	const TEST_USER_ID = "test-user-123";
	const OTHER_USER_ID = "other-user-456";
	const authHeader = `Bearer mock-token-${TEST_USER_ID}`;
	const otherAuthHeader = `Bearer mock-token-${OTHER_USER_ID}`;

	// Helper function to create a test agent
	async function createTestAgent(authorizationHeader: string, name: string): Promise<string> {
		const response = await SELF.fetch("http://example.com/api/agents", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authorizationHeader,
			},
			body: JSON.stringify({ name }),
		});
		const data = await response.json();
		return data.id;
	}

	beforeAll(async () => {
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

		await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id)").run();

		// Create test users
		const now = Math.floor(Date.now() / 1000);
		await env.DB.prepare(
			"INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
		)
			.bind(TEST_USER_ID, now, now)
			.run();
		await env.DB.prepare(
			"INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
		)
			.bind(OTHER_USER_ID, now, now)
			.run();
	});

	describe("POST /api/agents - Create agent", () => {
		it("should create a new agent with valid request", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "Test Agent",
				}),
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("id");
			expect(data).toHaveProperty("user_id", TEST_USER_ID);
			expect(data).toHaveProperty("name", "Test Agent");
			expect(data).toHaveProperty("persona");
			expect(data).toHaveProperty("created_at");

			// Verify persona structure
			expect(data.persona).toHaveProperty("core_values");
			expect(Array.isArray(data.persona.core_values)).toBe(true);
			expect(data.persona).toHaveProperty("thinking_style");
			expect(data.persona).toHaveProperty("personality_traits");
			expect(Array.isArray(data.persona.personality_traits)).toBe(true);
			expect(data.persona).toHaveProperty("background");
			expect(data.persona).toHaveProperty("version", 1);

			// Verify generateInitialPersona was called
			expect(anthropicService.generateInitialPersona).toHaveBeenCalledWith(
				expect.anything(),
				"Test Agent",
			);
		});

		it("should trim whitespace from agent name", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "  Whitespace Agent  ",
				}),
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.name).toBe("Whitespace Agent");
		});

		it("should return 400 for missing name", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for empty name", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for name exceeding max length", async () => {
			const longName = "a".repeat(101); // Max is 100
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: longName,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "Unauthorized Agent",
				}),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 with invalid token", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer invalid-token",
				},
				body: JSON.stringify({
					name: "Invalid Token Agent",
				}),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("GET /api/agents - List agents", () => {
		it("should return list of user's agents", async () => {
			// Create a test agent first
			await createTestAgent(authHeader, "List Test Agent");

			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("agents");
			expect(Array.isArray(data.agents)).toBe(true);
			expect(data.agents.length).toBeGreaterThan(0);

			// Verify agent structure
			const agent = data.agents[0];
			expect(agent).toHaveProperty("id");
			expect(agent).toHaveProperty("name");
			expect(agent).toHaveProperty("persona");
			expect(agent).toHaveProperty("created_at");
			expect(agent).not.toHaveProperty("user_id"); // Not included in list response
		});

		it("should return agents sorted by creation date (newest first)", async () => {
			// Create two agents
			await createTestAgent(authHeader, "First Agent");
			await createTestAgent(authHeader, "Second Agent");

			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			const data = await response.json();
			expect(data.agents.length).toBeGreaterThanOrEqual(2);

			// Check that agents are sorted by created_at DESC
			for (let i = 0; i < data.agents.length - 1; i++) {
				expect(data.agents[i].created_at).toBeGreaterThanOrEqual(data.agents[i + 1].created_at);
			}
		});

		it("should only return authenticated user's agents", async () => {
			// Create agent for other user
			const otherUserAgentId = await createTestAgent(otherAuthHeader, "Other User's Agent");

			// Get current user's agents
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			const data = await response.json();
			// Should not include other user's agent
			const hasOtherAgent = data.agents.some((a: { id: string }) => a.id === otherUserAgentId);
			expect(hasOtherAgent).toBe(false);
		});

		it("should return 401 without authentication", async () => {
			const response = await SELF.fetch("http://example.com/api/agents", {
				method: "GET",
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("GET /api/agents/:id - Get agent details", () => {
		it("should return agent details for owned agent", async () => {
			const testAgentId = await createTestAgent(authHeader, "Details Test Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("id", testAgentId);
			expect(data).toHaveProperty("user_id", TEST_USER_ID);
			expect(data).toHaveProperty("name");
			expect(data).toHaveProperty("persona");
			expect(data).toHaveProperty("created_at");
			expect(data).toHaveProperty("updated_at");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeId = "00000000-0000-0000-0000-000000000000";
			const response = await SELF.fetch(`http://example.com/api/agents/${fakeId}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 when accessing another user's agent", async () => {
			const otherUserAgentId = await createTestAgent(otherAuthHeader, "Other User Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${otherUserAgentId}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for invalid UUID format", async () => {
			const response = await SELF.fetch("http://example.com/api/agents/invalid-uuid", {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const testAgentId = await createTestAgent(authHeader, "Auth Test Agent GET");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "GET",
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("PATCH /api/agents/:id - Update agent", () => {
		it("should update agent name", async () => {
			const testAgentId = await createTestAgent(authHeader, "Update Test Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "Updated Agent Name",
				}),
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("id", testAgentId);
			expect(data).toHaveProperty("user_id", TEST_USER_ID);
			expect(data).toHaveProperty("name", "Updated Agent Name");
			expect(data).toHaveProperty("persona");
			expect(data).toHaveProperty("updated_at");

			// Verify updated_at is more recent than created_at
			const detailsResponse = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});
			const details = await detailsResponse.json();
			expect(details.updated_at).toBeGreaterThanOrEqual(details.created_at);
		});

		it("should trim whitespace from updated name", async () => {
			const testAgentId = await createTestAgent(authHeader, "Whitespace Update Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "  Trimmed Name  ",
				}),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.name).toBe("Trimmed Name");
		});

		it("should keep existing name when name is not provided", async () => {
			const testAgentId = await createTestAgent(authHeader, "Known Name Agent");

			// Update without providing name
			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.name).toBe("Known Name Agent");
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeId = "00000000-0000-0000-0000-000000000000";
			const response = await SELF.fetch(`http://example.com/api/agents/${fakeId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "New Name",
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 when updating another user's agent", async () => {
			const otherUserAgentId = await createTestAgent(otherAuthHeader, "Other User Update Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${otherUserAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "Hacked Name",
				}),
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for invalid UUID format", async () => {
			const response = await SELF.fetch("http://example.com/api/agents/invalid-uuid", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "New Name",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for empty name", async () => {
			const testAgentId = await createTestAgent(authHeader, "Empty Name Test Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: "",
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for name exceeding max length", async () => {
			const testAgentId = await createTestAgent(authHeader, "Long Name Test Agent");

			const longName = "a".repeat(101);
			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: authHeader,
				},
				body: JSON.stringify({
					name: longName,
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const testAgentId = await createTestAgent(authHeader, "Auth Test Agent PATCH");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "New Name",
				}),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});

	describe("DELETE /api/agents/:id - Delete agent", () => {
		it("should delete owned agent", async () => {
			// Create an agent to delete
			const agentToDelete = await createTestAgent(authHeader, "Agent To Delete");

			// Delete the agent
			const response = await SELF.fetch(`http://example.com/api/agents/${agentToDelete}`, {
				method: "DELETE",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("success", true);
			expect(data).toHaveProperty("message");

			// Verify agent is deleted
			const getResponse = await SELF.fetch(`http://example.com/api/agents/${agentToDelete}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});
			expect(getResponse.status).toBe(404);
		});

		it("should return 404 for non-existent agent", async () => {
			const fakeId = "00000000-0000-0000-0000-000000000000";
			const response = await SELF.fetch(`http://example.com/api/agents/${fakeId}`, {
				method: "DELETE",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 403 when deleting another user's agent", async () => {
			const otherUserAgentId = await createTestAgent(otherAuthHeader, "Other User Delete Agent");

			const response = await SELF.fetch(`http://example.com/api/agents/${otherUserAgentId}`, {
				method: "DELETE",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(403);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 400 for invalid UUID format", async () => {
			const response = await SELF.fetch("http://example.com/api/agents/invalid-uuid", {
				method: "DELETE",
				headers: {
					Authorization: authHeader,
				},
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should return 401 without authentication", async () => {
			const testAgentId = await createTestAgent(authHeader, "Auth Test Agent DELETE");

			const response = await SELF.fetch(`http://example.com/api/agents/${testAgentId}`, {
				method: "DELETE",
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});
	});
});
