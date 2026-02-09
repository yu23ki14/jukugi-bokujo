import { Link, useParams } from "react-router";
import { type SessionSummary, useGetApiSessions, useGetApiTopicsId } from "../../hooks/backend";

export function meta() {
	return [{ title: "Topic Detail - Jukugi Bokujo" }];
}

export default function TopicDetail() {
	const { id } = useParams();

	const {
		data: topicData,
		isLoading: topicLoading,
		error: topicError,
	} = useGetApiTopicsId(id ?? "");

	const {
		data: sessionsData,
		isLoading: sessionsLoading,
		error: sessionsError,
	} = useGetApiSessions({ limit: 50 });

	// Extract data with type narrowing
	const topic = !topicError && topicData?.data && "title" in topicData.data ? topicData.data : null;
	const sessionsResponse = !sessionsError && sessionsData?.data ? sessionsData.data : null;
	const allSessions =
		sessionsResponse && "sessions" in sessionsResponse ? sessionsResponse.sessions : [];

	// Filter sessions by topic ID on client side
	const sessions = allSessions.filter((session) => session.topic.id === id);

	const loading = topicLoading || sessionsLoading;
	const error = topicError || sessionsError;

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
		<div className="max-w-4xl mx-auto">
			{loading && (
				<div className="text-center py-12">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">Loading topic...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 p-4">
					<p className="text-red-700">
						{error instanceof Error ? error.message : "Failed to load topic"}
					</p>
				</div>
			)}

			{!loading && !error && topic && (
				<div>
					<div className="mb-6">
						<Link
							to="/topics"
							className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
						>
							← Back to Topics
						</Link>
					</div>

					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<div className="flex justify-between items-start mb-4">
							<h1 className="text-3xl font-bold">{topic.title}</h1>
							<span
								className={`px-3 py-1 rounded text-sm font-semibold ${
									topic.status === "active"
										? "bg-green-100 text-green-700"
										: "bg-gray-100 text-gray-600"
								}`}
							>
								{topic.status}
							</span>
						</div>
						<p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
							{topic.description}
						</p>
						<p className="text-xs text-gray-500">
							Created: {new Date(topic.created_at).toLocaleDateString("ja-JP")}
						</p>
					</div>

					<h2 className="text-2xl font-bold mb-4">Related Sessions ({sessions.length})</h2>

					{sessions.length === 0 ? (
						<div className="text-center py-12 bg-gray-50 rounded-lg">
							<p className="text-gray-600">No sessions yet for this topic.</p>
						</div>
					) : (
						<div className="space-y-4">
							{sessions.map((session: SessionSummary) => (
								<Link
									key={session.id}
									to={`/sessions/${session.id}`}
									className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
								>
									<div className="flex justify-between items-start mb-3">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<span
													className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(session.status)}`}
												>
													{session.status}
												</span>
												<span className="text-sm text-gray-600">
													{session.participant_count} participants
												</span>
												<span className="text-sm text-gray-600">
													Turn {session.current_turn} / {session.max_turns}
												</span>
											</div>
										</div>
									</div>

									<div className="text-xs text-gray-500 flex gap-4">
										{session.started_at && (
											<span>
												Started: {new Date(session.started_at).toLocaleDateString("ja-JP")}
											</span>
										)}
										{session.completed_at && (
											<span>
												Completed: {new Date(session.completed_at).toLocaleDateString("ja-JP")}
											</span>
										)}
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
