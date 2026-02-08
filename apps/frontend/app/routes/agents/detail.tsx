import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { createApiClient } from "../../lib/api";
import type { Agent } from "../../lib/types";

export function meta() {
	return [{ title: "Agent Detail - Jukugi Bokujo" }];
}

export default function AgentDetail() {
	const { id } = useParams();
	const { getToken } = useAuth();
	const navigate = useNavigate();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		async function fetchAgent() {
			if (!id) return;

			try {
				setLoading(true);
				setError(null);
				const api = createApiClient(getToken);
				const data = await api.get<Agent>(`/api/agents/${id}`);
				setAgent(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load agent");
			} finally {
				setLoading(false);
			}
		}

		fetchAgent();
	}, [id, getToken]);

	async function handleDelete() {
		if (!id || !agent) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`,
		);

		if (!confirmed) return;

		try {
			setDeleting(true);
			const api = createApiClient(getToken);
			await api.delete(`/api/agents/${id}`);
			navigate("/agents");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete agent");
			setDeleting(false);
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-4xl mx-auto">
				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading agent...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4">
						<p className="text-red-700">{error}</p>
					</div>
				)}

				{!loading && !error && agent && (
					<div>
						<div className="flex justify-between items-start mb-6">
							<div>
								<h1 className="text-3xl font-bold mb-2">{agent.name}</h1>
								<p className="text-gray-600">Persona Version: {agent.persona.version}</p>
							</div>
							<button
								onClick={handleDelete}
								disabled={deleting}
								className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 transition"
							>
								{deleting ? "Deleting..." : "Delete Agent"}
							</button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<Link
								to={`/agents/${id}/knowledge`}
								className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition text-center"
							>
								<h3 className="font-semibold text-lg mb-1">Knowledge</h3>
								<p className="text-sm text-gray-600">Manage agent's knowledge base</p>
							</Link>

							<Link
								to={`/agents/${id}/direction`}
								className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition text-center"
							>
								<h3 className="font-semibold text-lg mb-1">Direction</h3>
								<p className="text-sm text-gray-600">Set agent's direction and goals</p>
							</Link>

							<Link
								to={`/sessions?agent=${id}`}
								className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition text-center"
							>
								<h3 className="font-semibold text-lg mb-1">Sessions</h3>
								<p className="text-sm text-gray-600">View participation history</p>
							</Link>
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-bold mb-4">Persona</h2>

							<div className="space-y-6">
								<div>
									<h3 className="font-semibold text-gray-700 mb-2">Core Values</h3>
									<div className="flex flex-wrap gap-2">
										{agent.persona.core_values.map((value) => (
											<span
												key={value}
												className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
											>
												{value}
											</span>
										))}
									</div>
								</div>

								<div>
									<h3 className="font-semibold text-gray-700 mb-2">Thinking Style</h3>
									<p className="text-gray-600">{agent.persona.thinking_style}</p>
								</div>

								<div>
									<h3 className="font-semibold text-gray-700 mb-2">Personality Traits</h3>
									<div className="flex flex-wrap gap-2">
										{agent.persona.personality_traits.map((trait) => (
											<span
												key={trait}
												className="px-3 py-1 bg-green-100 text-green-700 rounded-full"
											>
												{trait}
											</span>
										))}
									</div>
								</div>

								<div>
									<h3 className="font-semibold text-gray-700 mb-2">Background</h3>
									<p className="text-gray-600">{agent.persona.background}</p>
								</div>
							</div>
						</div>

						<div className="mt-6 text-sm text-gray-500 flex justify-between">
							<span>Created: {new Date(agent.created_at).toLocaleString("ja-JP")}</span>
							<span>Updated: {new Date(agent.updated_at).toLocaleString("ja-JP")}</span>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
