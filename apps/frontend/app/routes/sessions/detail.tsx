import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { SessionTimeline } from "../../components/SessionTimeline";
import { createApiClient } from "../../lib/api";
import type { JudgeVerdict, SessionDetail, Turn } from "../../lib/types";

export function meta() {
	return [{ title: "Session Detail - Jukugi Bokujo" }];
}

export default function SessionDetailPage() {
	const { id } = useParams();
	const { getToken } = useAuth();
	const [session, setSession] = useState<SessionDetail | null>(null);
	const [turns, setTurns] = useState<Turn[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchSession() {
			if (!id) return;

			try {
				setLoading(true);
				setError(null);
				const api = createApiClient(getToken);

				const [sessionData, turnsData] = await Promise.all([
					api.get<SessionDetail>(`/api/sessions/${id}`),
					api.get<{ turns: Turn[] }>(`/api/sessions/${id}/turns`),
				]);

				setSession(sessionData);
				setTurns(turnsData.turns);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load session");
			} finally {
				setLoading(false);
			}
		}

		fetchSession();

		// Auto-refresh for active sessions every 15 seconds
		const interval = setInterval(() => {
			if (session?.status === "active") {
				fetchSession();
			}
		}, 15000);

		return () => clearInterval(interval);
	}, [id, getToken, session?.status]);

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
						<p className="text-red-700">{error}</p>
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
										<span className="text-gray-600">{session.participant_count} participants</span>
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

						{/* Judge Verdict (completed sessions) */}
						{session.status === "completed" && session.judge_verdict && (
							<div className="bg-white rounded-lg shadow p-6 mb-6">
								<h2 className="text-xl font-bold mb-4">AI Judge Verdict</h2>
								<JudgeVerdictDisplay verdict={session.judge_verdict} />
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
								{session.started_at && (
									<span>Started: {new Date(session.started_at).toLocaleString("ja-JP")}</span>
								)}
								{session.completed_at && (
									<span>Completed: {new Date(session.completed_at).toLocaleString("ja-JP")}</span>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}

function JudgeVerdictDisplay({ verdict }: { verdict: JudgeVerdict }) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<ScoreCard label="Quality" score={verdict.quality_score} />
				<ScoreCard label="Cooperation" score={verdict.cooperation_score} />
				<ScoreCard label="Convergence" score={verdict.convergence_score} />
				<ScoreCard label="Novelty" score={verdict.novelty_score} />
			</div>

			<div>
				<h3 className="font-semibold text-gray-700 mb-2">Summary</h3>
				<p className="text-gray-600">{verdict.summary}</p>
			</div>

			{verdict.highlights && verdict.highlights.length > 0 && (
				<div>
					<h3 className="font-semibold text-gray-700 mb-2">Highlights</h3>
					<ul className="list-disc list-inside space-y-1">
						{verdict.highlights.map((highlight, idx) => (
							<li key={idx} className="text-gray-600">
								{highlight}
							</li>
						))}
					</ul>
				</div>
			)}

			{verdict.consensus && (
				<div>
					<h3 className="font-semibold text-gray-700 mb-2">Consensus</h3>
					<p className="text-gray-600">{verdict.consensus}</p>
				</div>
			)}
		</div>
	);
}

function ScoreCard({ label, score }: { label: string; score: number }) {
	const percentage = (score / 10) * 100;
	const color =
		percentage >= 70 ? "bg-green-500" : percentage >= 40 ? "bg-yellow-500" : "bg-red-500";

	return (
		<div className="bg-gray-50 rounded-lg p-4">
			<p className="text-sm text-gray-600 mb-1">{label}</p>
			<p className="text-2xl font-bold mb-2">
				{score}
				<span className="text-sm text-gray-500">/10</span>
			</p>
			<div className="w-full bg-gray-200 rounded-full h-2">
				<div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
			</div>
		</div>
	);
}
