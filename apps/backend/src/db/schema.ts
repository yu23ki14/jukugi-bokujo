/**
 * Drizzle ORM Schema Definitions
 * Corresponds to migrations 0001-0007
 */

import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// ============================================================================
// Users Table
// ============================================================================
export const users = sqliteTable("users", {
	id: text("id").primaryKey(), // Clerk user ID
	created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// ============================================================================
// Agents Table
// ============================================================================
export const agents = sqliteTable(
	"agents",
	{
		id: text("id").primaryKey(), // UUID
		user_id: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		persona: text("persona").notNull(), // JSON stored as TEXT
		status: text("status", { enum: ["active", "reserve"] })
			.notNull()
			.default("active"),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		user_id_idx: index("idx_agents_user_id").on(table.user_id),
		user_status_idx: index("idx_agents_user_status").on(table.user_id, table.status),
	}),
);

// ============================================================================
// Topics Table
// ============================================================================
export const topics = sqliteTable(
	"topics",
	{
		id: text("id").primaryKey(), // UUID
		title: text("title").notNull(),
		description: text("description").notNull(),
		status: text("status", { enum: ["active", "archived"] })
			.notNull()
			.default("active"),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		status_idx: index("idx_topics_status").on(table.status),
	}),
);

// ============================================================================
// Sessions Table
// ============================================================================
export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(), // UUID
		topic_id: text("topic_id")
			.notNull()
			.references(() => topics.id, { onDelete: "cascade" }),
		status: text("status", { enum: ["pending", "active", "completed", "cancelled"] })
			.notNull()
			.default("pending"),
		participant_count: integer("participant_count").notNull().default(0),
		current_turn: integer("current_turn").notNull().default(0),
		max_turns: integer("max_turns").notNull().default(10),
		summary: text("summary"),
		judge_verdict: text("judge_verdict"), // JSON stored as TEXT
		mode: text("mode").notNull().default("double_diamond"),
		mode_config: text("mode_config"), // JSON stored as TEXT
		is_tutorial: integer("is_tutorial", { mode: "boolean" }).default(false),
		started_at: integer("started_at", { mode: "timestamp_ms" }),
		completed_at: integer("completed_at", { mode: "timestamp_ms" }),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		status_idx: index("idx_sessions_status").on(table.status),
		topic_id_idx: index("idx_sessions_topic_id").on(table.topic_id),
		started_at_idx: index("idx_sessions_started_at").on(table.started_at),
		mode_idx: index("idx_sessions_mode").on(table.mode),
	}),
);

// ============================================================================
// Session Participants Table
// ============================================================================
export const sessionParticipants = sqliteTable(
	"session_participants",
	{
		id: text("id").primaryKey(), // UUID
		session_id: text("session_id")
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		joined_at: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
		speaking_order: integer("speaking_order").notNull().default(0),
	},
	(table) => ({
		session_agent_unique: unique("session_participants_session_id_agent_id_unique").on(
			table.session_id,
			table.agent_id,
		),
		session_id_idx: index("idx_session_participants_session_id").on(table.session_id),
		agent_id_idx: index("idx_session_participants_agent_id").on(table.agent_id),
		speaking_order_idx: index("idx_session_participants_speaking_order").on(
			table.session_id,
			table.speaking_order,
		),
	}),
);

// ============================================================================
// Session Strategies Table
// ============================================================================
export const sessionStrategies = sqliteTable(
	"session_strategies",
	{
		id: text("id").primaryKey(), // UUID
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		session_id: text("session_id")
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		feedback_id: text("feedback_id").references(() => feedbacks.id, { onDelete: "set null" }),
		strategy: text("strategy").notNull(),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		agent_session_unique: unique("session_strategies_agent_id_session_id_unique").on(
			table.agent_id,
			table.session_id,
		),
		agent_session_idx: index("idx_session_strategies_agent_session").on(
			table.agent_id,
			table.session_id,
		),
	}),
);

// ============================================================================
// Turns Table
// ============================================================================
export const turns = sqliteTable(
	"turns",
	{
		id: text("id").primaryKey(), // UUID
		session_id: text("session_id")
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		turn_number: integer("turn_number").notNull(),
		status: text("status", { enum: ["pending", "processing", "completed", "failed"] })
			.notNull()
			.default("pending"),
		summary: text("summary"), // Rolling summary for context compression
		started_at: integer("started_at", { mode: "timestamp_ms" }),
		completed_at: integer("completed_at", { mode: "timestamp_ms" }),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		session_turn_unique: unique("turns_session_id_turn_number_unique").on(
			table.session_id,
			table.turn_number,
		),
		session_id_idx: index("idx_turns_session_id").on(table.session_id),
		status_idx: index("idx_turns_status").on(table.status),
		session_turn_idx: index("idx_turns_session_turn").on(table.session_id, table.turn_number),
	}),
);

// ============================================================================
// Statements Table
// ============================================================================
export const statements = sqliteTable(
	"statements",
	{
		id: text("id").primaryKey(), // UUID
		turn_id: text("turn_id")
			.notNull()
			.references(() => turns.id, { onDelete: "cascade" }),
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		thinking_process: text("thinking_process"),
		summary: text("summary"), // One-line summary for Tier 2 masking
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		turn_id_idx: index("idx_statements_turn_id").on(table.turn_id),
		agent_id_idx: index("idx_statements_agent_id").on(table.agent_id),
		created_at_idx: index("idx_statements_created_at").on(table.created_at),
	}),
);

// ============================================================================
// Knowledge Entries Table
// ============================================================================
export const knowledgeEntries = sqliteTable(
	"knowledge_entries",
	{
		id: text("id").primaryKey(), // UUID
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		content: text("content").notNull(),
		embedding_text: text("embedding_text"),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		agent_id_idx: index("idx_knowledge_agent_id").on(table.agent_id),
		created_at_idx: index("idx_knowledge_created_at").on(table.created_at),
	}),
);

// ============================================================================
// Directions Table
// ============================================================================
export const directions = sqliteTable(
	"directions",
	{
		id: text("id").primaryKey(), // UUID
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		session_id: text("session_id")
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		turn_number: integer("turn_number").notNull(),
		content: text("content").notNull(),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		agent_session_idx: index("idx_directions_agent_session").on(table.agent_id, table.session_id),
		session_turn_idx: index("idx_directions_session_turn").on(table.session_id, table.turn_number),
	}),
);

// ============================================================================
// Feedbacks Table
// ============================================================================
export const feedbacks = sqliteTable(
	"feedbacks",
	{
		id: text("id").primaryKey(), // UUID
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		session_id: text("session_id")
			.notNull()
			.references(() => sessions.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		reflection_id: text("reflection_id"), // Links to agent_reflections
		applied_at: integer("applied_at", { mode: "timestamp_ms" }),
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		agent_session_unique: unique("feedbacks_agent_id_session_id_unique").on(
			table.agent_id,
			table.session_id,
		),
		agent_id_idx: index("idx_feedbacks_agent_id").on(table.agent_id),
		session_id_idx: index("idx_feedbacks_session_id").on(table.session_id),
	}),
);

// ============================================================================
// Agent Reflections Table
// ============================================================================
export const agentReflections = sqliteTable("agent_reflections", {
	id: text("id").primaryKey(), // UUID
	agent_id: text("agent_id")
		.notNull()
		.references(() => agents.id),
	session_id: text("session_id")
		.notNull()
		.references(() => sessions.id),
	question: text("question").notNull(),
	context_summary: text("context_summary").notNull(),
	created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ============================================================================
// Persona Changes Table
// ============================================================================
export const personaChanges = sqliteTable(
	"persona_changes",
	{
		id: text("id").primaryKey(), // UUID
		agent_id: text("agent_id")
			.notNull()
			.references(() => agents.id),
		feedback_id: text("feedback_id")
			.notNull()
			.references(() => feedbacks.id),
		persona_before: text("persona_before").notNull(), // JSON stored as TEXT
		persona_after: text("persona_after").notNull(), // JSON stored as TEXT
		created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => ({
		agent_id_idx: index("idx_persona_changes_agent_id").on(table.agent_id),
	}),
);
