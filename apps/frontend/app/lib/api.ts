/**
 * API Client for Jukugi Bokujo
 * Handles authenticated requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export class ApiClient {
	constructor(
		private baseUrl: string,
		private getToken: () => Promise<string | null>,
	) {}

	async get<T>(path: string): Promise<T> {
		const token = await this.getToken();
		const response = await fetch(`${this.baseUrl}${path}`, {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			const error = await this.parseError(response);
			throw new Error(error);
		}

		return response.json();
	}

	async post<T>(path: string, data: unknown): Promise<T> {
		const token = await this.getToken();
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error = await this.parseError(response);
			throw new Error(error);
		}

		return response.json();
	}

	async patch<T>(path: string, data: unknown): Promise<T> {
		const token = await this.getToken();
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error = await this.parseError(response);
			throw new Error(error);
		}

		return response.json();
	}

	async delete<T>(path: string): Promise<T> {
		const token = await this.getToken();
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "DELETE",
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			const error = await this.parseError(response);
			throw new Error(error);
		}

		return response.json();
	}

	private async parseError(response: Response): Promise<string> {
		try {
			const body = await response.json();
			return body.error || body.message || `API error: ${response.statusText}`;
		} catch {
			return `API error: ${response.statusText}`;
		}
	}
}

/**
 * Create an API client instance
 * Usage: const api = createApiClient(getToken)
 */
export function createApiClient(getToken: () => Promise<string | null>): ApiClient {
	return new ApiClient(API_BASE_URL, getToken);
}
