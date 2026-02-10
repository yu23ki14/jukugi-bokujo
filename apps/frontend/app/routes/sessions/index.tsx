import { Link, useSearchParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { type SessionSummary, useGetApiSessions } from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Sessions - Jukugi Bokujo" }];
}

export default function SessionsIndex() {
	const [searchParams, setSearchParams] = useSearchParams();

	const status = searchParams.get("status") || "all";
	const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
	const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

	// Build query parameters
	const queryParams: {
		status?: "active" | "completed";
		limit?: number;
		offset?: number | null;
	} = {
		limit,
		offset,
	};

	// Only set status if it's a valid API value
	if (status === "active" || status === "completed") {
		queryParams.status = status;
	}

	const { data: sessionsData, isLoading: loading, error } = useGetApiSessions(queryParams);

	// Extract data safely
	const sessionsResponse = !error && sessionsData?.data ? sessionsData.data : null;
	const sessions =
		sessionsResponse && "sessions" in sessionsResponse ? sessionsResponse.sessions : [];
	const total = sessionsResponse && "total" in sessionsResponse ? sessionsResponse.total : 0;

	function handleStatusChange(newStatus: string) {
		setSearchParams({ status: newStatus, limit: limit.toString(), offset: "0" });
	}

	function handlePagination(newOffset: number) {
		setSearchParams({ status, limit: limit.toString(), offset: newOffset.toString() });
	}

	function getStatusBadge(sessionStatus: string) {
		const badges = {
			pending: "bg-gray-100 text-gray-700",
			active: "bg-blue-100 text-blue-700",
			completed: "bg-green-100 text-green-700",
			cancelled: "bg-red-100 text-red-700",
		};
		return badges[sessionStatus as keyof typeof badges] || badges.pending;
	}

	return (
		<ProtectedRoute>
			<div>
				<h1 className="text-3xl font-bold mb-6">Deliberation Sessions</h1>

				{/* Filters */}
				<div className="mb-6 flex gap-2 flex-wrap">
					<button
						onClick={() => handleStatusChange("all")}
						className={`px-4 py-2 rounded transition ${
							status === "all"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						All
					</button>
					<button
						onClick={() => handleStatusChange("active")}
						className={`px-4 py-2 rounded transition ${
							status === "active"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						Active
					</button>
					<button
						onClick={() => handleStatusChange("completed")}
						className={`px-4 py-2 rounded transition ${
							status === "completed"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						Completed
					</button>
					<button
						onClick={() => handleStatusChange("pending")}
						className={`px-4 py-2 rounded transition ${
							status === "pending"
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						Pending
					</button>
				</div>

				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading sessions...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
						<p className="text-red-700">
							{error instanceof Error ? error.message : "Failed to load sessions"}
						</p>
					</div>
				)}

				{!loading && !error && sessions.length === 0 && (
					<div className="text-center py-12 bg-gray-50 rounded-lg">
						<p className="text-gray-600">No sessions found.</p>
						{status !== "all" && (
							<button
								onClick={() => handleStatusChange("all")}
								className="mt-4 text-blue-600 hover:text-blue-800"
							>
								View all sessions
							</button>
						)}
					</div>
				)}

				{!loading && !error && sessions.length > 0 && (
					<div>
						<div className="space-y-4 mb-6">
							{sessions.map((session: SessionSummary) => (
								<Link
									key={session.id}
									to={`/sessions/${session.id}`}
									className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
								>
									<div className="flex justify-between items-start mb-3">
										<div className="flex-1">
											<h3 className="font-semibold text-lg mb-1">{session.topic.title}</h3>
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<span
													className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(session.status)}`}
												>
													{session.status}
												</span>
												<span>•</span>
												<span>{session.participant_count} participants</span>
												<span>•</span>
												<span>
													Turn {session.current_turn} / {session.max_turns}
												</span>
											</div>
										</div>
									</div>

									{session.started_at && (
										<p className="text-xs text-gray-500">
											Started: {formatDateTime(session.started_at)}
										</p>
									)}
									{session.completed_at && (
										<p className="text-xs text-gray-500">
											Completed: {formatDateTime(session.completed_at)}
										</p>
									)}
								</Link>
							))}
						</div>

						{/* Pagination */}
						{total > limit && (
							<div className="flex justify-center gap-4 items-center">
								<button
									onClick={() => handlePagination(Math.max(0, offset - limit))}
									disabled={offset === 0}
									className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
								>
									Previous
								</button>
								<span className="text-sm text-gray-600">
									{offset + 1} - {Math.min(offset + limit, total)} of {total}
								</span>
								<button
									onClick={() => handlePagination(offset + limit)}
									disabled={offset + limit >= total}
									className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
								>
									Next
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
