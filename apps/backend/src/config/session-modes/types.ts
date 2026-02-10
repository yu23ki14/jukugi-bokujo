/**
 * Session Mode Strategy Interface
 *
 * Each deliberation mode implements this interface to define
 * its phase logic, prompt generation, and mode-specific behavior.
 */

// ============================================================================
// Phase Types
// ============================================================================

export interface PhaseConstraint {
	rule: string;
	reason: string;
}

export interface PhaseConfig {
	phase: string;
	label: string;
	roleFraming: string;
	instruction: string;
	constraints: PhaseConstraint[];
	charMin: number;
	charMax: number;
}

// ============================================================================
// Mode Configuration (stored in sessions.mode_config as JSON)
// ============================================================================

export type SessionModeConfig = Record<string, unknown>;

// ============================================================================
// Strategy Interface
// ============================================================================

export interface SessionModeStrategy {
	/** Mode identifier (matches sessions.mode column) */
	readonly modeId: string;

	/** Human-readable mode name */
	readonly modeName: string;

	/** Mode description */
	readonly description: string;

	/** Default max_turns for this mode */
	readonly defaultMaxTurns: number;

	/** Get the phase configuration for a given turn */
	getPhaseConfig(turnNumber: number, maxTurns: number): PhaseConfig;

	/** Build the phase-specific section to inject into the system prompt */
	buildPhasePromptSection(config: PhaseConfig, turnNumber: number, maxTurns: number): string;

	/** Get mode-specific instructions appended to user prompts */
	getUserPromptSuffix(turnNumber: number, maxTurns: number): string;
}
