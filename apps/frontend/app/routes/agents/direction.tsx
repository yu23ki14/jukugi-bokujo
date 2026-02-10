import { useState } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
	useGetApiAgentsAgentIdDirections,
	useGetApiAgentsId,
	useGetApiSessionsId,
	usePostApiAgentsAgentIdDirections,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Direction - Jukugi Bokujo" }];
}

export default function AgentDirection() {
	const { id } = useParams();

	const {
		data: agentData,
		isLoading: agentLoading,
		error: agentError,
	} = useGetApiAgentsId(id ?? "");

	const agent = !agentError && agentData?.data && "name" in agentData.data ? agentData.data : null;

	// Form state
	const [sessionId, setSessionId] = useState("");
	const [turnNumber, setTurnNumber] = useState(1);
	const [content, setContent] = useState("");

	// Fetch directions filtered by session
	const { data: directionsData, refetch: refetchDirections } = useGetApiAgentsAgentIdDirections(
		id ?? "",
		sessionId ? { session_id: sessionId } : {},
	);

	const directionsResponse = directionsData?.data;
	const directions =
		directionsResponse && "directions" in directionsResponse ? directionsResponse.directions : [];

	// Fetch session info when sessionId is entered
	const { data: sessionData } = useGetApiSessionsId(sessionId, {
		query: { enabled: !!sessionId },
	});
	const session = sessionData?.data && "status" in sessionData.data ? sessionData.data : null;

	const createMutation = usePostApiAgentsAgentIdDirections();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !content.trim() || !sessionId) return;

		try {
			await createMutation.mutateAsync({
				agentId: id,
				data: {
					session_id: sessionId,
					turn_number: turnNumber,
					content: content.trim(),
				},
			});
			setContent("");
			refetchDirections();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to add direction");
		}
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

						<h1 className="text-3xl font-bold mb-6">Direction</h1>

						<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
							<h3 className="font-semibold text-blue-900 mb-2">Direction</h3>
							<ul className="text-blue-800 text-sm space-y-1">
								<li>80 characters max short instruction for each turn</li>
								<li>Influences only the specified turn (volatile)</li>
								<li>Does not affect persona</li>
							</ul>
						</div>

						<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
							<div className="mb-4">
								<label
									htmlFor="sessionId"
									className="block text-sm font-semibold text-gray-700 mb-2"
								>
									Session ID
								</label>
								<input
									type="text"
									id="sessionId"
									value={sessionId}
									onChange={(e) => setSessionId(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Enter active session ID..."
									disabled={createMutation.isPending}
									required
								/>
								{session && (
									<p className="mt-1 text-xs text-gray-500">
										Status: {session.status} | Turn: {session.current_turn}/{session.max_turns}
									</p>
								)}
							</div>

							<div className="mb-4">
								<label
									htmlFor="turnNumber"
									className="block text-sm font-semibold text-gray-700 mb-2"
								>
									Turn Number
								</label>
								<input
									type="number"
									id="turnNumber"
									value={turnNumber}
									onChange={(e) => setTurnNumber(Number(e.target.value))}
									min={1}
									max={session?.max_turns ?? 10}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									disabled={createMutation.isPending}
									required
								/>
							</div>

							<div className="mb-4">
								<label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
									Direction Content
								</label>
								<input
									type="text"
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="e.g., Focus on economic impact..."
									maxLength={80}
									disabled={createMutation.isPending}
									required
								/>
								<p className="mt-1 text-xs text-gray-500">{content.length}/80 characters</p>
							</div>

							<button
								type="submit"
								disabled={createMutation.isPending || !content.trim() || !sessionId}
								className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
							>
								{createMutation.isPending ? "Adding..." : "Add Direction"}
							</button>
						</form>

						<h2 className="text-2xl font-bold mb-4">History</h2>

						{directions.length === 0 ? (
							<div className="text-center py-12 bg-gray-50 rounded-lg">
								<p className="text-gray-600">No directions yet.</p>
							</div>
						) : (
							<div className="space-y-4">
								{directions.map((d) => (
									<div key={d.id} className="bg-white rounded-lg shadow p-6">
										<div className="flex justify-between items-start mb-3">
											<div className="flex items-center gap-2">
												<span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
													Turn {d.turn_number}
												</span>
											</div>
										</div>
										<p className="text-gray-700">{d.content}</p>
										<p className="mt-3 text-xs text-gray-500">
											Added: {formatDateTime(d.created_at)}
										</p>
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
