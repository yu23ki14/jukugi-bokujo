/**
 * Queue message types for Turn processing
 */

/**
 * Message sent to Turn Queue for agent statement generation
 */
export interface TurnQueueMessage {
	/** Turn ID */
	turnId: string;

	/** Session ID */
	sessionId: string;

	/** Agent ID who will generate the statement */
	agentId: string;

	/** Turn number */
	turnNumber: number;

	/** Number of attempts (for tracking) */
	attempt: number;
}

/**
 * Result of processing a turn queue message
 */
export interface TurnProcessingResult {
	/** Whether processing succeeded */
	success: boolean;

	/** Agent ID */
	agentId: string;

	/** Statement ID (if successful) */
	statementId?: string;

	/** Error message (if failed) */
	error?: string;

	/** Whether the error is a rate limit error */
	isRateLimitError?: boolean;
}
