/**
 * Central configuration constants for Jukugi Bokujo
 * All magic numbers and configuration values should be defined here
 */

// ============================================================================
// Cron Schedule Configuration
// ============================================================================

/**
 * Master cron schedule - Creates new deliberation sessions
 * Format: "0 STAR-SLASH6 * * *" (every 6 hours)
 */
export const CRON_SCHEDULE_MASTER = "0 */6 * * *";

/**
 * Turn cron schedule - Processes session turns
 * Format: "STAR-SLASH15 * * * *" (every 15 minutes)
 */
export const CRON_SCHEDULE_TURN = "*/15 * * * *";

// ============================================================================
// Session Configuration
// ============================================================================

/**
 * Number of agents participating in each session
 * Fixed to 4 for balanced discussions
 */
export const SESSION_PARTICIPANT_COUNT = 4;

/**
 * Maximum number of turns per session
 */
export const SESSION_MAX_TURNS = 10;

/**
 * Agent activity threshold in days
 * Agents with activity within this period are considered "active"
 */
export const AGENT_ACTIVITY_THRESHOLD_DAYS = 3;

// ============================================================================
// LLM Configuration
// ============================================================================

/**
 * Claude model ID to use for all LLM operations
 * Using Claude Sonnet 4.5 (latest stable model)
 */
export const LLM_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Token limits for different LLM operations
 */
export const LLM_TOKEN_LIMITS = {
	/**
	 * Maximum tokens for initial persona generation
	 */
	INITIAL_PERSONA: 500,

	/**
	 * Maximum tokens for session summary generation
	 */
	SESSION_SUMMARY: 8000,

	/**
	 * Maximum tokens for judge verdict generation
	 */
	JUDGE_VERDICT: 3000,

	/**
	 * Maximum tokens for persona update
	 */
	PERSONA_UPDATE: 5000,

	/**
	 * Maximum tokens for statement generation during turns
	 */
	STATEMENT: 3000,
} as const;

// ============================================================================
// Data Fetch Limits
// ============================================================================

/**
 * Maximum number of knowledge entries to fetch per agent
 */
export const KNOWLEDGE_ENTRIES_LIMIT = 50;

/**
 * Maximum number of user inputs to fetch per agent
 */
export const USER_INPUTS_LIMIT = 30;

/**
 * Maximum number of previous statements to fetch for context
 */
export const PREVIOUS_STATEMENTS_LIMIT = 50;

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * Maximum retries for failed API calls (before queue retry)
 */
export const API_MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (seconds)
 */
export const API_RETRY_BASE_DELAY = 2;

/**
 * Maximum delay for exponential backoff (seconds)
 */
export const API_RETRY_MAX_DELAY = 60;
