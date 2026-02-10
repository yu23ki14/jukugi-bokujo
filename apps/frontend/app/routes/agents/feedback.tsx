import { useState } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
	useGetApiAgentsAgentIdFeedbacks,
	useGetApiAgentsAgentIdStrategies,
	useGetApiAgentsId,
	usePostApiAgentsAgentIdFeedbacks,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Feedback - Jukugi Bokujo" }];
}

export default function AgentFeedback() {
	const { id } = useParams();

	const {
		data: agentData,
		isLoading: agentLoading,
		error: agentError,
	} = useGetApiAgentsId(id ?? "");

	const agent = !agentError && agentData?.data && "name" in agentData.data ? agentData.data : null;

	// Feedbacks
	const { data: feedbacksData, refetch: refetchFeedbacks } = useGetApiAgentsAgentIdFeedbacks(
		id ?? "",
	);

	const feedbacksResponse = feedbacksData?.data;
	const feedbacks =
		feedbacksResponse && "feedbacks" in feedbacksResponse ? feedbacksResponse.feedbacks : [];

	// Strategies
	const { data: strategiesData } = useGetApiAgentsAgentIdStrategies(id ?? "");

	const strategiesResponse = strategiesData?.data;
	const strategies =
		strategiesResponse && "strategies" in strategiesResponse ? strategiesResponse.strategies : [];

	const createMutation = usePostApiAgentsAgentIdFeedbacks();

	// Form state
	const [sessionId, setSessionId] = useState("");
	const [content, setContent] = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !content.trim() || !sessionId) return;

		try {
			await createMutation.mutateAsync({
				agentId: id,
				data: {
					session_id: sessionId,
					content: content.trim(),
				},
			});
			setContent("");
			setSessionId("");
			refetchFeedbacks();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to add feedback");
		}
	}

	// Find strategy for a given session
	function getStrategyForSession(sid: string) {
		return strategies.find((s) => s.session_id === sid);
	}

	return (
		<ProtectedRoute>
			<div className="max-w-4xl mx-auto">
				{agentLoading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading...</p>
					</div>
				)}

				{agentError && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4">
						<p className="text-red-700">
							{agentError instanceof Error ? agentError.message : "Failed to load data"}
						</p>
					</div>
				)}

				{!agentLoading && !agentError && agent && (
					<div>
						<div className="mb-6">
							<Link to={`/agents/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">
								&larr; Back to {agent.name}
							</Link>
						</div>

						<h1 className="text-3xl font-bold mb-6">Feedback</h1>

						<div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
							<h3 className="font-semibold text-orange-900 mb-2">Post-Session Feedback</h3>
							<ul className="text-orange-800 text-sm space-y-1">
								<li>400 characters max reflection after a completed session</li>
								<li>One feedback per session</li>
								<li>Used to evolve the agent's persona</li>
								<li>Agent creates a strategy from your feedback for the next session</li>
							</ul>
						</div>

						<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
							<div className="mb-4">
								<label
									htmlFor="sessionId"
									className="block text-sm font-semibold text-gray-700 mb-2"
								>
									Completed Session ID
								</label>
								<input
									type="text"
									id="sessionId"
									value={sessionId}
									onChange={(e) => setSessionId(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
									placeholder="Enter completed session ID..."
									disabled={createMutation.isPending}
									required
								/>
							</div>

							<div className="mb-4">
								<label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
									Feedback
								</label>
								<textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 h-32"
									placeholder="e.g., The discussion on environmental policy was good, but next time consider economic trade-offs more carefully..."
									maxLength={400}
									disabled={createMutation.isPending}
									required
								/>
								<p className="mt-1 text-xs text-gray-500">{content.length}/400 characters</p>
							</div>

							<button
								type="submit"
								disabled={createMutation.isPending || !content.trim() || !sessionId}
								className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400 transition"
							>
								{createMutation.isPending ? "Adding..." : "Submit Feedback"}
							</button>
						</form>

						<h2 className="text-2xl font-bold mb-4">History</h2>

						{feedbacks.length === 0 ? (
							<div className="text-center py-12 bg-gray-50 rounded-lg">
								<p className="text-gray-600">No feedback yet.</p>
							</div>
						) : (
							<div className="space-y-4">
								{feedbacks.map((f) => {
									const strategy = getStrategyForSession(f.session_id);
									return (
										<div key={f.id} className="bg-white rounded-lg shadow p-6">
											<div className="flex justify-between items-start mb-3">
												<div className="flex items-center gap-2">
													<span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
														Feedback
													</span>
													{f.applied_at ? (
														<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
															Applied
														</span>
													) : (
														<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
															Pending
														</span>
													)}
												</div>
											</div>
											<p className="text-gray-700 whitespace-pre-wrap">{f.content}</p>
											<div className="mt-3 text-xs text-gray-500">
												<p>Added: {formatDateTime(f.created_at)}</p>
												{f.applied_at && <p>Applied: {formatDateTime(f.applied_at)}</p>}
											</div>

											{strategy && (
												<div className="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded">
													<h4 className="font-semibold text-indigo-900 text-sm mb-1">
														Agent's Strategy (generated from this feedback)
													</h4>
													<p className="text-indigo-800 text-sm">{strategy.strategy}</p>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
