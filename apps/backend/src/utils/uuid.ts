/**
 * UUID generation utility
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}
