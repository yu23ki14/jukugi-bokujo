import { useState } from "react";
import { useNavigate } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { usePostApiAgents } from "../../hooks/backend";

export function meta() {
	return [{ title: "Create Agent - Jukugi Bokujo" }];
}

export default function NewAgent() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	const createAgentMutation = usePostApiAgents();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!name.trim()) {
			setError("Agent name is required");
			return;
		}

		try {
			setError(null);

			const response = await createAgentMutation.mutateAsync({ data: { name: name.trim() } });

			// Redirect to agent detail page
			if (response.data && "id" in response.data) {
				navigate(`/agents/${response.data.id}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create agent");
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto">
				<h1 className="text-3xl font-bold mb-6">Create New Agent</h1>

				<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
					<h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
					<ul className="text-blue-800 text-sm space-y-1">
						<li>1. Give your agent a name</li>
						<li>2. AI will generate an initial persona for your agent</li>
						<li>3. You can add knowledge and direction to shape your agent's behavior</li>
						<li>4. Your agent will automatically participate in deliberation sessions</li>
					</ul>
				</div>

				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
					<div className="mb-6">
						<label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
							Agent Name
						</label>
						<input
							type="text"
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="e.g., Thoughtful Citizen, Climate Advocate, Tech Enthusiast"
							maxLength={100}
							disabled={createAgentMutation.isPending}
						/>
						<p className="mt-1 text-xs text-gray-500">
							Choose a descriptive name that reflects the agent's role or perspective
						</p>
					</div>

					{error && (
						<div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
							<p className="text-red-700">{error}</p>
						</div>
					)}

					<div className="flex gap-4">
						<button
							type="submit"
							disabled={createAgentMutation.isPending || !name.trim()}
							className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
						>
							{createAgentMutation.isPending ? "Creating..." : "Create Agent"}
						</button>
						<button
							type="button"
							onClick={() => navigate("/agents")}
							disabled={createAgentMutation.isPending}
							className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</ProtectedRoute>
	);
}
