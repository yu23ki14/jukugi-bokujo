/**
 * Backward-compatible wrapper for Double Diamond deliberation phases.
 *
 * New code should use session-modes/registry.ts directly.
 * This file re-exports the Double Diamond strategy through the old API
 * so existing callers continue to work without changes.
 */

import { doubleDiamondStrategy } from "./session-modes/double-diamond";
import type { PhaseConfig, PhaseConstraint } from "./session-modes/types";

export type { PhaseConfig, PhaseConstraint };

export type DeliberationPhase =
	| "introduction"
	| "discover"
	| "define"
	| "develop"
	| "deliver"
	| "conclusion";

export function getPhaseConfig(turnNumber: number, maxTurns: number): PhaseConfig {
	return doubleDiamondStrategy.getPhaseConfig(turnNumber, maxTurns);
}

export function buildPhasePromptSection(
	config: PhaseConfig,
	turnNumber: number,
	maxTurns: number,
): string {
	return doubleDiamondStrategy.buildPhasePromptSection(config, turnNumber, maxTurns);
}

export function getConfidenceInstruction(): string {
	return doubleDiamondStrategy.getUserPromptSuffix(0, 0);
}
