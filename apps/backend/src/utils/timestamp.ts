/**
 * Timestamp utility functions
 */

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Get timestamp N days ago
 */
export function getTimestampDaysAgo(days: number): number {
	return getCurrentTimestamp() - days * 24 * 60 * 60;
}
