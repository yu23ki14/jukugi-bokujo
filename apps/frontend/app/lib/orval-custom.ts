/**
 * Orval custom mutator for API requests with Clerk authentication
 */

import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

// Create axios instance
const axiosInstance = axios.create({
	baseURL: API_BASE_URL,
});

// Store for getToken function (will be set by ClerkAuthProvider)
let getTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Set the Clerk getToken function
 * This should be called once from a component inside ClerkProvider
 */
export const setClerkGetToken = (getToken: () => Promise<string | null>) => {
	getTokenFn = getToken;

	// Clear existing interceptors to avoid duplicates
	axiosInstance.interceptors.request.clear();
	axiosInstance.interceptors.response.clear();

	// Request interceptor to add auth token
	axiosInstance.interceptors.request.use(
		async (config) => {
			if (getTokenFn) {
				const token = await getTokenFn();
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
				}
			}
			return config;
		},
		(error: AxiosError) => {
			return Promise.reject(error);
		},
	);

	// Response interceptor for error handling
	axiosInstance.interceptors.response.use(
		(response) => response,
		(error: AxiosError) => {
			if (error.response?.status === 401) {
				// Handle unauthorized errors (e.g., redirect to login)
				console.error("Unauthorized - token may be expired");
			}
			return Promise.reject(error);
		},
	);
};

/**
 * Custom axios client for Orval
 * Orval calls this as: customBackendClient(url, config)
 */
export const customBackendClient = <T>(
	url: string,
	options?: AxiosRequestConfig & { body?: string },
): Promise<T> => {
	const source = axios.CancelToken.source();

	// Convert 'body' to 'data' for axios
	const axiosOptions: AxiosRequestConfig = { ...options };
	if (options?.body) {
		axiosOptions.data = options.body;
		delete axiosOptions.body;
	}

	const promise = axiosInstance
		.request<unknown, { data: T }>({
			url,
			...axiosOptions,
			cancelToken: source.token,
		})
		.then(({ data }) => data);

	// @ts-expect-error - Adding cancel method to promise
	promise.cancel = () => {
		source.cancel("Query was cancelled");
	};

	return promise;
};

export default customBackendClient;

export type ErrorType<Error> = AxiosError<Error>;
