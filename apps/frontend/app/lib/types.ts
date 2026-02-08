/**
 * Type definitions for Jukugi Bokujo
 * These match the backend API response types
 */

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
	persona: AgentPersona;
	created_at: number;
	updated_at: number;
}

export interface KnowledgeEntry {
	id: string;
	agent_id: string;
	title: string;
	content: string;
	created_at: number;
	updated_at: number;
}

export interface UserInput {
	id: string;
	agent_id: string;
	input_type: "direction" | "knowledge" | "feedback";
	content: string;
	applied_at: number | null;
	created_at: number;
}

export interface Topic {
	id: string;
	title: string;
	description: string;
	status: "active" | "archived";
	created_at: number;
	updated_at: number;
}

export interface Session {
	id: string;
	topic_id: string;
	status: "pending" | "active" | "completed" | "cancelled";
	participant_count: number;
	current_turn: number;
	max_turns: number;
	summary?: string;
	judge_verdict?: JudgeVerdict;
	started_at?: number;
	completed_at?: number;
	created_at: number;
	updated_at: number;
}

export interface SessionDetail extends Session {
	topic: Topic;
	participants: SessionParticipant[];
}

export interface SessionParticipant {
	agent_id: string;
	agent_name: string;
	user_id: string;
}

export interface Turn {
	id: string;
	session_id: string;
	turn_number: number;
	status: "pending" | "processing" | "completed" | "failed";
	statements: Statement[];
	started_at?: number;
	completed_at?: number;
	created_at: number;
}

export interface Statement {
	id: string;
	turn_id: string;
	agent_id: string;
	agent_name: string;
	content: string;
	thinking_process?: string;
	created_at: number;
}

export interface JudgeVerdict {
	quality_score: number;
	cooperation_score: number;
	convergence_score: number;
	novelty_score: number;
	summary: string;
	highlights: string[];
	consensus?: string;
}
