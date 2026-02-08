/**
 * Database types for Jukugi Bokujo
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
	id: string; // Clerk user ID
	created_at: number;
	updated_at: number;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentPersona {
	core_values: string[];
	thinking_style: string;
	personality_traits: string[];
	background: string;
	version: number;
}

export interface Agent {
	id: string;
	user_id: string;
	name: string;
	persona: string; // JSON string of AgentPersona
	created_at: number;
	updated_at: number;
}

export interface AgentWithPersona extends Omit<Agent, "persona"> {
	persona: AgentPersona;
}

// ============================================================================
// Topic Types
// ============================================================================

export type TopicStatus = "active" | "archived";

export interface Topic {
	id: string;
	title: string;
	description: string;
	status: TopicStatus;
	created_at: number;
	updated_at: number;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = "pending" | "active" | "completed" | "cancelled";

export interface Session {
	id: string;
	topic_id: string;
	status: SessionStatus;
	participant_count: number;
	current_turn: number;
	max_turns: number;
	summary: string | null;
	judge_verdict: string | null; // JSON string of JudgeVerdict
	started_at: number | null;
	completed_at: number | null;
	created_at: number;
	updated_at: number;
}

export interface JudgeVerdict {
	quality_score: number;
	cooperation_score: number;
	convergence_score: number;
	novelty_score: number;
	summary: string;
	highlights: string[];
	consensus: string;
}

export interface SessionWithTopic extends Session {
	topic: Topic;
}

// ============================================================================
// Session Participant Types
// ============================================================================

export interface SessionParticipant {
	id: string;
	session_id: string;
	agent_id: string;
	joined_at: number;
}

export interface SessionParticipantWithAgent extends SessionParticipant {
	agent_name: string;
	user_id: string;
}

// ============================================================================
// Turn Types
// ============================================================================

export type TurnStatus = "pending" | "processing" | "completed" | "failed";

export interface Turn {
	id: string;
	session_id: string;
	turn_number: number;
	status: TurnStatus;
	started_at: number | null;
	completed_at: number | null;
	created_at: number;
}

// ============================================================================
// Statement Types
// ============================================================================

export interface Statement {
	id: string;
	turn_id: string;
	agent_id: string;
	content: string;
	thinking_process: string | null;
	created_at: number;
}

export interface StatementWithAgent extends Statement {
	agent_name: string;
}

// ============================================================================
// Knowledge Entry Types
// ============================================================================

export interface KnowledgeEntry {
	id: string;
	agent_id: string;
	title: string;
	content: string;
	embedding_text: string | null;
	created_at: number;
	updated_at: number;
}

// ============================================================================
// User Input Types
// ============================================================================

export type UserInputType = "direction" | "knowledge" | "feedback";

export interface UserInput {
	id: string;
	agent_id: string;
	input_type: UserInputType;
	content: string;
	applied_at: number | null;
	created_at: number;
}
