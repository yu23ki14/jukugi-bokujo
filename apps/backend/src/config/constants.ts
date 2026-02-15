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
export const MAX_AGENTS_PER_USER = 4;

/**
 * Maximum number of active (participating in deliberation) agents per user
 */
export const MAX_ACTIVE_AGENTS_PER_USER = 2;

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

	/**
	 * Maximum tokens for rolling turn summary generation
	 */
	TURN_SUMMARY: 1000,

	/**
	 * Maximum tokens for next topics generation
	 */
	NEXT_TOPICS: 3000,

	/**
	 * Maximum tokens for agent reflection generation
	 */
	AGENT_REFLECTION: 500,
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
export const FEEDBACK_MAX_LENGTH = 200;

/**
 * Maximum length for knowledge title
 */
export const KNOWLEDGE_TITLE_MAX_LENGTH = 30;

/**
 * Maximum length for knowledge content
 */
export const KNOWLEDGE_CONTENT_MAX_LENGTH = 500;

/**
 * Maximum number of personality traits per agent
 */
export const PERSONA_TRAITS_MAX = 10;

/**
 * Minimum number of core values per agent
 */
export const CORE_VALUES_MIN = 3;

/**
 * Maximum number of core values per agent
 */
export const CORE_VALUES_MAX = 5;

/**
 * Maximum number of previous statements to fetch for context
 */
export const PREVIOUS_STATEMENTS_LIMIT = 50;

/**
 * Minimum turn number to apply context compression (turns below this use full text)
 */
export const COMPRESSION_MIN_TURN = 4;

/**
 * Minimum turn number to start generating rolling summaries
 */
export const SUMMARY_MIN_TURN = 0;

// ============================================================================
// Queue Configuration
// ============================================================================

// ============================================================================
// Agent Value Options
// ============================================================================

/**
 * Available value options for agent creation
 * Users select REQUIRED_VALUES_COUNT values from this list
 */
export const AGENT_VALUE_OPTIONS = [
	"公平",
	"共感",
	"平和",
	"多様性",
	"思いやり",
	"感謝",
	"誠実",
	"希望",
	"効率",
	"伝統",
	"自由",
	"好奇心",
	"忍耐",
	"自立",
	"挑戦",
	"冷静",
	"本音主義",
	"損得勘定",
	"負けず嫌い",
	"疑い深さ",
	"皮肉屋",
	"野心",
	"頑固",
	"毒舌",
] as const;

/**
 * Number of values a user must select when creating an agent
 */
export const REQUIRED_VALUES_COUNT = 3;

// ============================================================================
// Tutorial (NPC) Configuration
// ============================================================================

/**
 * NPC user ID (system-owned agents)
 */
export const NPC_USER_ID = "system";

/**
 * NPC agent IDs
 */
export const NPC_AGENT_IDS = [
	"a0000001-0000-4000-8000-000000000001",
	"a0000002-0000-4000-8000-000000000002",
	"a0000003-0000-4000-8000-000000000003",
] as const;

/**
 * Maximum turns for tutorial sessions
 */
export const TUTORIAL_MAX_TURNS = 3;

/**
 * Delay in seconds between tutorial turns (gives user time to send directions)
 */
export const TUTORIAL_TURN_DELAY_SECONDS = 90;

/**
 * Tutorial topic
 */
export const TUTORIAL_TOPIC_ID = "t0000000-0000-4000-8000-000000000001";

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
