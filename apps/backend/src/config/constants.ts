/**
 * Central configuration constants for Jukugi Bokujo
 * All magic numbers and configuration values should be defined here
 */

// ============================================================================
// Cron Schedule Configuration
// ============================================================================

/**
 * Master cron schedule - Creates new deliberation sessions
 * 6 times/day aligned to JST active hours
 * UTC 22,2,6,10,14,18 = JST 7,11,15,19,23,3
 */
export const CRON_SCHEDULE_MASTER = "0 22,2,6,10,14,18 * * *";

/**
 * Turn cron schedule - Processes session turns
 * Format: "STAR-SLASH15 * * * *" (every 15 minutes)
 */
export const CRON_SCHEDULE_TURN = "*/15 * * * *";

// ============================================================================
// Session Configuration
// ============================================================================

/**
 * Maximum number of agents a user can own
 */
export const MAX_AGENTS_PER_USER = 2;

/**
 * Number of agents participating in each session
 * Fixed to 4 for balanced discussions
 */
export const SESSION_PARTICIPANT_COUNT = 4;

/**
 * Maximum number of sessions an agent can participate in per cron cycle
 */
export const MAX_SESSIONS_PER_AGENT = 2;

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

	/**
	 * Maximum tokens for session strategy generation from feedback
	 */
	STRATEGY_GENERATION: 2000,
} as const;

// ============================================================================
// Data Fetch Limits
// ============================================================================

/**
 * Maximum number of knowledge slots per agent
 */
export const KNOWLEDGE_SLOTS_LIMIT = 10;

/**
 * Maximum length for direction content
 */
export const DIRECTION_MAX_LENGTH = 80;

/**
 * Maximum length for feedback content
 */
export const FEEDBACK_MAX_LENGTH = 400;

/**
 * Maximum length for knowledge title
 */
export const KNOWLEDGE_TITLE_MAX_LENGTH = 30;

/**
 * Maximum length for knowledge content
 */
export const KNOWLEDGE_CONTENT_MAX_LENGTH = 500;

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
