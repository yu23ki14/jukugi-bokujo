import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { SessionTimeline } from "../../components/SessionTimeline";
import { useGetApiSessionsId, useGetApiSessionsIdTurns } from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Session Detail - Jukugi Bokujo" }];
}

export default function SessionDetailPage() {
	const { id } = useParams();

	const {
		data: sessionData,
		isLoading: sessionLoading,
		error: sessionError,
		refetch: refetchSession,
	} = useGetApiSessionsId(id ?? "");

	const {
		data: turnsData,
		isLoading: turnsLoading,
		error: turnsError,
		refetch: refetchTurns,
	} = useGetApiSessionsIdTurns(id ?? "");

	// Extract data with type narrowing
	const session =
		!sessionError && sessionData?.data && "topic" in sessionData.data ? sessionData.data : null;
	const turnsResponse = !turnsError && turnsData?.data ? turnsData.data : null;
	const turns = turnsResponse && "turns" in turnsResponse ? turnsResponse.turns : [];

	const loading = sessionLoading || turnsLoading;
	const error = sessionError || turnsError;

	// Auto-refresh for active sessions every 15 seconds
	useEffect(() => {
		if (session?.status === "active") {
			const interval = setInterval(() => {
				refetchSession();
				refetchTurns();
			}, 15000);

			return () => clearInterval(interval);
		}
	}, [session?.status, refetchSession, refetchTurns]);

	function getStatusBadge(status: string) {
		const badges = {
			pending: "bg-gray-100 text-gray-700",
			active: "bg-blue-100 text-blue-700",
			completed: "bg-green-100 text-green-700",
			cancelled: "bg-red-100 text-red-700",
		};
		return badges[status as keyof typeof badges] || badges.pending;
	}

	return (
		<ProtectedRoute>
			<div className="max-w-6xl mx-auto">
				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading session...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4">
						<p className="text-red-700">
							{error instanceof Error ? error.message : "Failed to load session"}
						</p>
					</div>
				)}

				{!loading && !error && session && (
					<div>
						{/* Session Header */}
						<div className="mb-6">
							<Link
								to="/sessions"
								className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
							>
								← Back to Sessions
							</Link>
							<div className="flex justify-between items-start">
								<div>
									<h1 className="text-3xl font-bold mb-2">{session.topic.title}</h1>
									<p className="text-gray-600 mb-3">{session.topic.description}</p>
									<div className="flex items-center gap-3 text-sm">
										<span
											className={`px-3 py-1 rounded font-semibold ${getStatusBadge(session.status)}`}
										>
											{session.status}
										</span>
										<span className="text-gray-600">
											Turn {session.current_turn} / {session.max_turns}
										</span>
										<span className="text-gray-600">
											{session.participants.length} participants
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Auto-refresh indicator for active sessions */}
						{session.status === "active" && (
							<div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
								<p className="text-blue-800 text-sm">
									This session is active. Page auto-refreshes every 15 seconds.
								</p>
							</div>
						)}

						{/* Participants */}
						<div className="bg-white rounded-lg shadow p-6 mb-6">
							<h2 className="text-xl font-bold mb-4">Participants</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{session.participants.map((participant) => (
									<Link
										key={participant.agent_id}
										to={`/agents/${participant.agent_id}`}
										className="p-3 border border-gray-200 rounded hover:bg-gray-50 transition"
									>
										<p className="font-semibold">{participant.agent_name}</p>
										<p className="text-xs text-gray-500">
											Agent ID: {participant.agent_id.slice(0, 8)}...
										</p>
									</Link>
								))}
							</div>
						</div>

						{/* Session Summary (completed sessions) */}
						{session.status === "completed" && session.summary && (
							<div className="bg-white rounded-lg shadow p-6 mb-6">
								<h2 className="text-xl font-bold mb-4">Session Summary</h2>
								<p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
									{session.summary}
								</p>
							</div>
						)}

						{/* Session Analysis (completed sessions) */}
						{session.status === "completed" && session.judge_verdict && (
							<div className="bg-white rounded-lg shadow p-6 mb-6">
								<h2 className="text-xl font-bold mb-4">Session Analysis</h2>
								<div className="space-y-4">
									{/* Scores */}
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div className="text-center p-3 bg-gray-50 rounded">
											<div className="text-2xl font-bold text-blue-600">
												{session.judge_verdict.quality_score}
											</div>
											<div className="text-xs text-gray-600 mt-1">Quality</div>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded">
											<div className="text-2xl font-bold text-green-600">
												{session.judge_verdict.cooperation_score}
											</div>
											<div className="text-xs text-gray-600 mt-1">Cooperation</div>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded">
											<div className="text-2xl font-bold text-purple-600">
												{session.judge_verdict.convergence_score}
											</div>
											<div className="text-xs text-gray-600 mt-1">Convergence</div>
										</div>
										<div className="text-center p-3 bg-gray-50 rounded">
											<div className="text-2xl font-bold text-orange-600">
												{session.judge_verdict.novelty_score}
											</div>
											<div className="text-xs text-gray-600 mt-1">Novelty</div>
										</div>
									</div>

									<div>
										<h3 className="font-semibold text-gray-700 mb-2">Summary</h3>
										<p className="text-gray-600">{session.judge_verdict.summary}</p>
									</div>

									{session.judge_verdict.highlights &&
										session.judge_verdict.highlights.length > 0 && (
											<div>
												<h3 className="font-semibold text-gray-700 mb-2">Highlights</h3>
												<ul className="list-disc list-inside space-y-1">
													{session.judge_verdict.highlights.map((highlight, idx) => (
														<li key={idx} className="text-gray-600">
															{highlight}
														</li>
													))}
												</ul>
											</div>
										)}

									{session.judge_verdict.consensus && (
										<div>
											<h3 className="font-semibold text-gray-700 mb-2">Consensus</h3>
											<p className="text-gray-600">{session.judge_verdict.consensus}</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Timeline */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-bold mb-6">Discussion Timeline</h2>
							<SessionTimeline turns={turns} />
						</div>

						{/* Timestamps */}
						{(session.started_at || session.completed_at) && (
							<div className="mt-6 text-sm text-gray-500 flex gap-6">
								{session.started_at && <span>Started: {formatDateTime(session.started_at)}</span>}
								{session.completed_at && (
									<span>Completed: {formatDateTime(session.completed_at)}</span>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
