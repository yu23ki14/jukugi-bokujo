import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("/health endpoint", () => {
	it("should return status ok", async () => {
		const response = await SELF.fetch("http://example.com/health");
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("status", "ok");
		expect(data).toHaveProperty("timestamp");
		expect(typeof data.timestamp).toBe("string");
	});

	it("should return valid ISO timestamp", async () => {
		const response = await SELF.fetch("http://example.com/health");
		const data = await response.json();

		// Check if timestamp is a valid ISO string
		const timestamp = new Date(data.timestamp);
		expect(timestamp.toString()).not.toBe("Invalid Date");
	});
});

describe("Root endpoint", () => {
	it("should return API info", async () => {
		const response = await SELF.fetch("http://example.com/");
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("message", "Jukugi Bokujo API");
		expect(data).toHaveProperty("version", "1.0.0");
		expect(data).toHaveProperty("openapi", "/api/openapi.json");
		expect(data).toHaveProperty("docs", "/api/docs");
	});

	it("should return environment from bindings", async () => {
		const response = await SELF.fetch("http://example.com/");
		const data = await response.json();

		expect(data).toHaveProperty("environment");
		// In test environment, it should return "development" from wrangler.toml
		expect(data.environment).toBe("development");
	});
});

describe("Database connection", () => {
	it("should connect to D1 database", async () => {
		// Verify DB binding is available
		expect(env.DB).toBeDefined();

		// Test simple query
		const result = await env.DB.prepare("SELECT 1 as test").first();
		expect(result).toEqual({ test: 1 });
	});

	it("should return success from test-db endpoint", async () => {
		const response = await SELF.fetch("http://example.com/api/test-db");
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty("success", true);
		expect(data.result).toEqual({ test: 1 });
	});
});
