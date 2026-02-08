# Test Strategy for Jukugi Bokujo Backend API

## Overview

This document outlines the comprehensive testing strategy for the backend API built on Cloudflare Workers with Hono framework.

## Test Framework Setup

- **Framework**: Vitest with `@cloudflare/vitest-pool-workers`
- **Pattern**: Uses Cloudflare's testing environment with real D1 bindings
- **Configuration**: `vitest.config.ts` loads `wrangler.toml` for Worker configuration

### Key Features
- `SELF.fetch()` - Tests the Worker's HTTP interface directly
- `env.DB` - Direct access to D1 database for setup/verification
- Real Worker runtime (not mocked)

## Mock Strategy

### 1. Clerk Authentication Mock

**Challenge**: All protected routes require Clerk JWT validation via external API call.

**Solution**: Create a mock authentication helper that bypasses Clerk API calls.

**Implementation Approach**:
```typescript
// test/helpers/auth-mock.ts

/**
 * Creates mock Clerk authentication headers for testing
 * Returns Authorization header that should be accepted by mock middleware
 */
export function createMockAuthHeaders(userId: string): HeadersInit {
  return {
    'Authorization': `Bearer mock-token-${userId}`,
  };
}

/**
 * Mock user IDs for testing
 */
export const MOCK_USERS = {
  USER_1: 'user_test1234567890',
  USER_2: 'user_test0987654321',
} as const;
```

**Mocking Strategy Options**:

**Option A: Environment-based bypass** (Recommended)
- Add `TEST_MODE` environment variable to `wrangler.toml`
- In `openapi-auth.ts` middleware, check `TEST_MODE` flag
- If enabled, extract userId from token format `mock-token-{userId}` without API call
- Pros: Minimal code changes, clean separation
- Cons: Need to modify production code

**Option B: MSW (Mock Service Worker)**
- Intercept `fetch` calls to `https://api.clerk.com/v1/sessions/verify`
- Return mock responses based on token format
- Pros: No production code changes
- Cons: More complex setup, may not work well with Workers runtime

**Recommendation**: Use Option A with environment-based bypass for simplicity and reliability.

### 2. Anthropic API Mock

**Challenge**: Agent creation calls Anthropic API for persona generation.

**Solution**: Mock fetch calls to Anthropic API endpoint.

**Implementation Approach**:
```typescript
// test/helpers/anthropic-mock.ts

/**
 * Mock Anthropic API response for persona generation
 */
export function createMockPersonaResponse(agentName: string) {
  return {
    content: [{
      text: JSON.stringify({
        core_values: ["Test Value 1", "Test Value 2"],
        thinking_style: `Mock thinking style for ${agentName}`,
        personality_traits: ["Trait 1", "Trait 2"],
        background: "Test background",
        version: 1
      })
    }]
  };
}

/**
 * Setup mock for Anthropic API
 * Returns a fetch override function
 */
export function mockAnthropicAPI(originalFetch: typeof fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url === 'https://api.anthropic.com/v1/messages') {
      const body = JSON.parse(init?.body as string);
      const agentName = extractAgentName(body.messages[0].content);

      return new Response(
        JSON.stringify(createMockPersonaResponse(agentName)),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Pass through other requests
    return originalFetch(input, init);
  };
}
```

**Mocking Strategy**:
- Use Vitest's `vi.stubGlobal()` to override global `fetch`
- Match requests to `https://api.anthropic.com/v1/messages`
- Return predictable mock responses
- Restore original fetch after tests

## Test Structure

### Test Organization

```
apps/backend/test/
├── helpers/
│   ├── auth-mock.ts         # Authentication helpers
│   ├── anthropic-mock.ts    # Anthropic API mocking
│   ├── database.ts          # Database setup/teardown utilities
│   └── test-data.ts         # Reusable test data factories
├── health.test.ts           # Existing health check tests
├── agents.test.ts           # Agent API tests
├── knowledge.test.ts        # Knowledge API tests
├── user-inputs.test.ts      # User Inputs API tests
└── TEST_STRATEGY.md         # This document
```

### Test Utilities

```typescript
// test/helpers/database.ts

/**
 * Clean all test data from database
 */
export async function cleanDatabase(db: D1Database) {
  await db.batch([
    db.prepare('DELETE FROM statements'),
    db.prepare('DELETE FROM turns'),
    db.prepare('DELETE FROM session_participations'),
    db.prepare('DELETE FROM sessions'),
    db.prepare('DELETE FROM user_inputs'),
    db.prepare('DELETE FROM knowledge_entries'),
    db.prepare('DELETE FROM agents'),
    db.prepare('DELETE FROM users'),
  ]);
}

/**
 * Create a test user directly in database
 */
export async function createTestUser(db: D1Database, userId: string) {
  await db.prepare(
    'INSERT INTO users (id, clerk_user_id, created_at) VALUES (?, ?, ?)'
  ).bind(userId, userId, new Date().toISOString()).run();
}

/**
 * Create a test agent with predictable persona
 */
export async function createTestAgent(
  db: D1Database,
  agentId: string,
  userId: string,
  name: string
) {
  const persona = {
    core_values: ["Test", "Values"],
    thinking_style: "Test style",
    personality_traits: ["Test trait"],
    background: "Test background",
    version: 1
  };

  await db.prepare(
    'INSERT INTO agents (id, user_id, name, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    agentId,
    userId,
    name,
    JSON.stringify(persona),
    new Date().toISOString(),
    new Date().toISOString()
  ).run();
}
```

## Test Cases

### Agents API (`/api/agents`)

#### POST /api/agents - Create Agent
- ✓ Should create agent with valid auth and name
- ✓ Should generate persona via Anthropic API (mocked)
- ✓ Should create user in database if not exists
- ✓ Should return 401 without auth token
- ✓ Should return 400 with empty name
- ✓ Should return 400 with name > 50 chars
- ✓ Should trim whitespace from name
- ✓ Should handle Anthropic API failure gracefully (fallback persona)

#### GET /api/agents - List Agents
- ✓ Should return all agents for authenticated user
- ✓ Should return empty array for user with no agents
- ✓ Should not return other users' agents
- ✓ Should return 401 without auth token
- ✓ Should parse persona JSON correctly
- ✓ Should order by created_at DESC

#### GET /api/agents/:id - Get Agent
- ✓ Should return agent details for owned agent
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should return 400 with invalid UUID format
- ✓ Should include all persona fields

#### PATCH /api/agents/:id - Update Agent
- ✓ Should update agent name
- ✓ Should trim whitespace from new name
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should return 400 with empty name
- ✓ Should return 400 with name > 50 chars
- ✓ Should update updated_at timestamp
- ✓ Should not modify persona

#### DELETE /api/agents/:id - Delete Agent
- ✓ Should delete agent and cascade related records
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should verify agent is actually deleted from database
- ✓ Should verify knowledge entries are deleted (cascade)
- ✓ Should verify user inputs are deleted (cascade)

### Knowledge API (`/api/agents/:agentId/knowledge`, `/api/knowledge/:id`)

#### POST /api/agents/:agentId/knowledge - Create Knowledge
- ✓ Should create knowledge entry for owned agent
- ✓ Should trim whitespace from title and content
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should return 400 with empty title
- ✓ Should return 400 with empty content
- ✓ Should return 400 with title > 200 chars
- ✓ Should return 400 with content > 5000 chars

#### GET /api/agents/:agentId/knowledge - List Knowledge
- ✓ Should return all knowledge for owned agent
- ✓ Should return empty array for agent with no knowledge
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should order by created_at DESC
- ✓ Should limit to 100 entries

#### DELETE /api/knowledge/:id - Delete Knowledge
- ✓ Should delete knowledge entry
- ✓ Should return 404 for non-existent knowledge
- ✓ Should return 403 for knowledge owned by different user's agent
- ✓ Should return 401 without auth token
- ✓ Should verify knowledge is actually deleted from database

### User Inputs API (`/api/agents/:agentId/inputs`)

#### POST /api/agents/:agentId/inputs - Create User Input
- ✓ Should create direction input for owned agent
- ✓ Should create feedback input for owned agent
- ✓ Should trim whitespace from content
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should return 400 with invalid input_type
- ✓ Should return 400 with empty content
- ✓ Should return 400 with content > 1000 chars
- ✓ Should set applied_at to null initially

#### GET /api/agents/:agentId/inputs - List User Inputs
- ✓ Should return all inputs for owned agent
- ✓ Should return empty array for agent with no inputs
- ✓ Should return 404 for non-existent agent
- ✓ Should return 403 for agent owned by different user
- ✓ Should return 401 without auth token
- ✓ Should order by created_at DESC
- ✓ Should limit to 100 entries
- ✓ Should include applied_at timestamp when applied

## Test Execution Strategy

### Setup Pattern

Each test suite follows this pattern:

```typescript
describe("API Endpoint Suite", () => {
  beforeEach(async () => {
    // Clean database
    await cleanDatabase(env.DB);

    // Create test users
    await createTestUser(env.DB, MOCK_USERS.USER_1);
    await createTestUser(env.DB, MOCK_USERS.USER_2);
  });

  afterEach(() => {
    // Restore any mocks
    vi.restoreAllMocks();
  });

  describe("Specific endpoint", () => {
    it("should do something", async () => {
      // Arrange: Create test data
      // Act: Call API with SELF.fetch()
      // Assert: Verify response and database state
    });
  });
});
```

### Database State Verification

Tests should verify both:
1. **HTTP Response**: Correct status code and JSON structure
2. **Database State**: Data actually persisted/deleted correctly

Example:
```typescript
it("should delete agent", async () => {
  // Arrange
  await createTestAgent(env.DB, "agent-1", MOCK_USERS.USER_1, "Test Agent");

  // Act
  const response = await SELF.fetch(
    "http://example.com/api/agents/agent-1",
    {
      method: "DELETE",
      headers: createMockAuthHeaders(MOCK_USERS.USER_1),
    }
  );

  // Assert response
  expect(response.status).toBe(200);

  // Assert database state
  const agent = await env.DB
    .prepare("SELECT * FROM agents WHERE id = ?")
    .bind("agent-1")
    .first();
  expect(agent).toBeNull();
});
```

## Mock Authentication Implementation

### Modified Middleware (for TEST_MODE)

```typescript
// src/middleware/openapi-auth.ts

export const openapiAuth = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthContext
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({
      error: "Unauthorized: Missing or invalid Authorization header"
    }, 401);
  }

  const token = authHeader.substring(7);

  // TEST MODE: Accept mock tokens
  if (c.env.TEST_MODE === "true" && token.startsWith("mock-token-")) {
    const userId = token.replace("mock-token-", "");
    c.set("userId", userId);
    await next();
    return;
  }

  // Production: Verify with Clerk
  try {
    const clerkSecretKey = c.env.CLERK_SECRET_KEY;
    const response = await fetch("https://api.clerk.com/v1/sessions/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    const session = (await response.json()) as ClerkSessionResponse;
    const userId = session.user_id;

    if (!userId) {
      return c.json({ error: "Unauthorized: No user ID in token" }, 401);
    }

    c.set("userId", userId);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Unauthorized: Token verification failed" }, 401);
  }
});
```

### wrangler.toml Addition

```toml
[env.test]
TEST_MODE = "true"
```

## Coverage Goals

- **Line Coverage**: > 80%
- **Branch Coverage**: > 75%
- **Function Coverage**: > 85%

### Priority Areas
1. All API endpoints (High)
2. Authentication/Authorization logic (High)
3. Database operations (High)
4. Error handling (Medium)
5. Input validation (Medium)

## Next Steps

1. ✅ Create test strategy document (this file)
2. Implement authentication mock helper
3. Implement Anthropic API mock helper
4. Implement database test utilities
5. Write Agents API tests
6. Write Knowledge API tests
7. Write User Inputs API tests
8. Run tests and verify coverage
9. Document any edge cases discovered

## Notes

- Tests run against real D1 database (local SQLite)
- No need to mock database - use real queries for setup
- Use descriptive test names following "should X when Y" pattern
- Group related tests with nested `describe` blocks
- Keep test data minimal but representative
- Clean database between tests to ensure isolation
