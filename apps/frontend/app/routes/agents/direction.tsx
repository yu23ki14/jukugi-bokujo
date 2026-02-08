import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { createApiClient } from "../../lib/api";
import type { Agent, UserInput } from "../../lib/types";

export function meta() {
	return [{ title: "Agent Direction - Jukugi Bokujo" }];
}

export default function AgentDirection() {
	const { id } = useParams();
	const { getToken } = useAuth();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [inputs, setInputs] = useState<UserInput[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [inputType, setInputType] = useState<"direction" | "feedback">("direction");
	const [content, setContent] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		async function fetchData() {
			if (!id) return;

			try {
				setLoading(true);
				setError(null);
				const api = createApiClient(getToken);

				const [agentData, inputsData] = await Promise.all([
					api.get<Agent>(`/api/agents/${id}`),
					api.get<{ inputs: UserInput[] }>(`/api/agents/${id}/inputs`),
				]);

				setAgent(agentData);
				setInputs(inputsData.inputs);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load data");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [id, getToken]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!id || !content.trim()) {
			return;
		}

		try {
			setSubmitting(true);
			const api = createApiClient(getToken);
			const newInput = await api.post<UserInput>(`/api/agents/${id}/inputs`, {
				input_type: inputType,
				content: content.trim(),
			});

			setInputs([newInput, ...inputs]);
			setContent("");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to add input");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-4xl mx-auto">
				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4">
						<p className="text-red-700">{error}</p>
					</div>
				)}

				{!loading && !error && agent && (
					<div>
						<div className="mb-6">
							<Link to={`/agents/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">
								← Back to {agent.name}
							</Link>
						</div>

						<h1 className="text-3xl font-bold mb-6">Direction & Feedback</h1>

						<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
							<h3 className="font-semibold text-blue-900 mb-2">How to guide your agent</h3>
							<ul className="text-blue-800 text-sm space-y-1">
								<li>
									<strong>Direction:</strong> Set long-term goals and values for your agent
								</li>
								<li>
									<strong>Feedback:</strong> Provide specific feedback on agent's recent behavior
								</li>
								<li>Your inputs will gradually shape the agent's persona over time</li>
								<li>Changes will be reflected after the agent completes deliberation sessions</li>
							</ul>
						</div>

						<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
							<div className="mb-4">
								<label className="block text-sm font-semibold text-gray-700 mb-2">Input Type</label>
								<div className="flex gap-4">
									<label className="flex items-center">
										<input
											type="radio"
											name="inputType"
											value="direction"
											checked={inputType === "direction"}
											onChange={(e) => setInputType(e.target.value as "direction" | "feedback")}
											disabled={submitting}
											className="mr-2"
										/>
										<span>Direction</span>
									</label>
									<label className="flex items-center">
										<input
											type="radio"
											name="inputType"
											value="feedback"
											checked={inputType === "feedback"}
											onChange={(e) => setInputType(e.target.value as "direction" | "feedback")}
											disabled={submitting}
											className="mr-2"
										/>
										<span>Feedback</span>
									</label>
								</div>
							</div>

							<div className="mb-4">
								<label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
									{inputType === "direction" ? "Direction" : "Feedback"}
								</label>
								<textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
									placeholder={
										inputType === "direction"
											? "e.g., Focus more on sustainability and environmental concerns..."
											: "e.g., Your recent arguments were too aggressive. Try to be more collaborative..."
									}
									maxLength={1000}
									disabled={submitting}
									required
								/>
								<p className="mt-1 text-xs text-gray-500">{content.length}/1000 characters</p>
							</div>

							<button
								type="submit"
								disabled={submitting || !content.trim()}
								className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
							>
								{submitting
									? "Adding..."
									: `Add ${inputType === "direction" ? "Direction" : "Feedback"}`}
							</button>
						</form>

						<h2 className="text-2xl font-bold mb-4">History</h2>

						{inputs.length === 0 ? (
							<div className="text-center py-12 bg-gray-50 rounded-lg">
								<p className="text-gray-600">No direction or feedback yet.</p>
							</div>
						) : (
							<div className="space-y-4">
								{inputs.map((input) => (
									<div key={input.id} className="bg-white rounded-lg shadow p-6">
										<div className="flex justify-between items-start mb-3">
											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-1 rounded text-xs font-semibold ${
														input.input_type === "direction"
															? "bg-purple-100 text-purple-700"
															: "bg-orange-100 text-orange-700"
													}`}
												>
													{input.input_type === "direction" ? "Direction" : "Feedback"}
												</span>
												{input.applied_at && (
													<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
														Applied
													</span>
												)}
												{!input.applied_at && (
													<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
														Pending
													</span>
												)}
											</div>
										</div>
										<p className="text-gray-700 whitespace-pre-wrap">{input.content}</p>
										<div className="mt-3 text-xs text-gray-500">
											<p>Added: {new Date(input.created_at).toLocaleString("ja-JP")}</p>
											{input.applied_at && (
												<p>Applied: {new Date(input.applied_at).toLocaleString("ja-JP")}</p>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
