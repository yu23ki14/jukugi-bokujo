import { defineConfig } from "orval";

export default defineConfig({
	frontend_backend: {
		input: {
			target: "http://localhost:8787/api/openapi.json",
		},
		output: {
			target: "./app/hooks/backend/index.ts",
			clean: true,
			client: "react-query",
			headers: true,
			override: {
				mutator: {
					path: "./app/lib/orval-custom.ts",
					name: "customBackendClient",
				},
				header: () => {
					return "// @ts-nocheck\n\n";
				},
			},
		},
	},
});
