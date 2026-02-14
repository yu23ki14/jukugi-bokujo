/**
 * Session Mode Registry
 *
 * Central registry for all available session modes.
 * To add a new mode, create a strategy file and register it here.
 */

import { doubleDiamondStrategy } from "./double-diamond";
import { freeDiscussionStrategy } from "./free-discussion";
import { tutorialStrategy } from "./tutorial";
import type { SessionModeStrategy } from "./types";

// ============================================================================
// Registry
// ============================================================================

const MODE_REGISTRY: Record<string, SessionModeStrategy> = {
	double_diamond: doubleDiamondStrategy,
	free_discussion: freeDiscussionStrategy,
	tutorial: tutorialStrategy,
};

/**
 * Get strategy for a given mode.
 * Falls back to double_diamond if mode is unknown.
 */
export function getModeStrategy(mode: string): SessionModeStrategy {
	return MODE_REGISTRY[mode] ?? MODE_REGISTRY.double_diamond;
}

/**
 * Get all available modes (for API / UI selection).
 */
export function getAllModes(): Array<{
	id: string;
	name: string;
	description: string;
	defaultMaxTurns: number;
}> {
	return Object.values(MODE_REGISTRY).map((s) => ({
		id: s.modeId,
		name: s.modeName,
		description: s.description,
		defaultMaxTurns: s.defaultMaxTurns,
	}));
}
