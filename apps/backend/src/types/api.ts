/**
 * API request and response types
 */

import type { AgentPersona, JudgeVerdict } from "./database";

// ============================================================================
// Common Error Response
// ============================================================================

export interface ErrorResponse {
	error: string;
	code?: string;
	details?: unknown;
}

// ============================================================================
// Agent API Types
// ============================================================================

export interface CreateAgentRequest {
	name: string;
}

export interface CreateAgentResponse {
	id: string;
	user_id: string;
	name: string;
	persona: AgentPersona;
	created_at: number;
}

export interface ListAgentsResponse {
	agents: Array<{
		id: string;
		name: string;
		persona: AgentPersona;
		created_at: number;
	}>;
}

export interface GetAgentResponse {
	id: string;
	user_id: string;
	name: string;
	persona: AgentPersona;
	created_at: number;
	updated_at: number;
}

export interface UpdateAgentRequest {
	name?: string;
}

export interface UpdateAgentResponse {
	id: string;
	user_id: string;
	name: string;
	persona: AgentPersona;
	updated_at: number;
}

// ============================================================================
// Knowledge API Types
// ============================================================================

export interface CreateKnowledgeRequest {
	title: string; // 1-30 chars
	content: string; // 1-500 chars
}

export interface CreateKnowledgeResponse {
	id: string;
	agent_id: string;
	title: string;
	content: string;
	created_at: number;
}

export interface ListKnowledgeResponse {
	knowledge: Array<{
		id: string;
		title: string;
		content: string;
		created_at: number;
	}>;
}

// ============================================================================
// Direction API Types
// ============================================================================

export interface CreateDirectionRequest {
	session_id: string;
	turn_number: number;
	content: string;
}

export interface CreateDirectionResponse {
	id: string;
	agent_id: string;
	session_id: string;
	turn_number: number;
	content: string;
	created_at: number;
}

export interface ListDirectionsResponse {
	directions: Array<{
		id: string;
		session_id: string;
		turn_number: number;
		content: string;
		created_at: number;
	}>;
}

// ============================================================================
// Feedback API Types
// ============================================================================

export interface CreateFeedbackRequest {
	session_id: string;
	content: string;
}

export interface CreateFeedbackResponse {
	id: string;
	agent_id: string;
	session_id: string;
	content: string;
	created_at: number;
}

export interface GetFeedbackResponse {
	id: string;
	agent_id: string;
	session_id: string;
	content: string;
	applied_at: number | null;
	created_at: number;
}

export interface ListFeedbacksResponse {
	feedbacks: Array<{
		id: string;
		session_id: string;
		content: string;
		applied_at: number | null;
		created_at: number;
	}>;
}

// ============================================================================
// Session Strategy API Types
// ============================================================================

export interface GetSessionStrategyResponse {
	id: string;
	agent_id: string;
	session_id: string;
	strategy: string;
	created_at: number;
}

// ============================================================================
// Session API Types
// ============================================================================

export interface ListSessionsQuery {
	status?: "active" | "completed";
	limit?: number;
	offset?: number;
}

export interface ListSessionsResponse {
	sessions: Array<{
		id: string;
		topic: {
			id: string;
			title: string;
		};
		status: string;
		current_turn: number;
		max_turns: number;
		participant_count: number;
		started_at: number | null;
		completed_at: number | null;
	}>;
	total: number;
}

export interface GetSessionResponse {
	id: string;
	topic: {
		id: string;
		title: string;
		description: string;
	};
	status: string;
	current_turn: number;
	max_turns: number;
	participants: Array<{
		agent_id: string;
		agent_name: string;
		user_id: string;
	}>;
	summary: string | null;
	judge_verdict: JudgeVerdict | null;
	started_at: number | null;
	completed_at: number | null;
}

export interface GetSessionTurnsResponse {
	turns: Array<{
		id: string;
		turn_number: number;
		status: string;
		statements: Array<{
			id: string;
			agent_id: string;
			agent_name: string;
			content: string;
			created_at: number;
		}>;
		completed_at: number | null;
	}>;
}

// ============================================================================
// Topic API Types
// ============================================================================

export interface ListTopicsResponse {
	topics: Array<{
		id: string;
		title: string;
		description: string;
		status: string;
		created_at: number;
	}>;
}

export interface GetTopicResponse {
	id: string;
	title: string;
	description: string;
	status: string;
	created_at: number;
	updated_at: number;
}
