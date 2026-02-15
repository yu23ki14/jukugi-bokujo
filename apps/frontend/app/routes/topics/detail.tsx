import { Link, useParams } from "react-router";
import {
	BackLink,
	EmptyState,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "../../components/design-system";
import { Card, CardContent } from "../../components/ui/card";
import { type SessionSummary, useGetApiSessions, useGetApiTopicsId } from "../../hooks/backend";
import { formatDate } from "../../utils/date";
import { sessionStatusLabel, topicStatusLabel } from "../../utils/labels";

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
	const error = topicError;

	return (
		<div className="max-w-4xl mx-auto">
			{loading && <LoadingState message="トピックを読み込み中..." />}

			{error && (
				<InfoAlert variant="error">
					{error instanceof Error ? error.message : "トピックの読み込みに失敗しました"}
				</InfoAlert>
			)}

			{!loading && !error && topic && (
				<div>
					<div className="mb-6">
						<BackLink to="/topics" label="トピック一覧に戻る" />
					</div>

					<Card className="mb-6">
						<CardContent>
							<div className="flex justify-between items-start mb-4">
								<h1 className="text-3xl font-bold">{topic.title}</h1>
								<StatusBadge variant={topic.status === "active" ? "completed" : "pending"}>
									{topicStatusLabel(topic.status)}
								</StatusBadge>
							</div>
							<p className="text-foreground leading-relaxed whitespace-pre-wrap mb-4">
								{topic.description}
							</p>
							<p className="text-xs text-muted-foreground">
								作成日: {formatDate(topic.created_at)}
							</p>
						</CardContent>
					</Card>

					<h2 className="text-2xl font-bold mb-4">このトピックでの議論 ({sessions.length})</h2>

					{sessions.length === 0 ? (
						<EmptyState message="このトピックにはまだ議論がありません" />
					) : (
						<div className="space-y-4">
							{sessions.map((session: SessionSummary) => (
								<Link
									key={session.id}
									to={`/sessions/${session.id}`}
									className="block hover:shadow-lg transition"
								>
									<Card>
										<CardContent>
											<div className="flex justify-between items-start mb-3">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<StatusBadge
															variant={
																session.status === "active"
																	? "active"
																	: session.status === "completed"
																		? "completed"
																		: session.status === "cancelled"
																			? "cancelled"
																			: "pending"
															}
														>
															{sessionStatusLabel(session.status)}
														</StatusBadge>
														<span className="text-sm text-muted-foreground">
															{session.participant_count}体が参加
														</span>
														<span className="text-sm text-muted-foreground">
															ターン {session.current_turn} / {session.max_turns}
														</span>
													</div>
												</div>
											</div>

											<div className="text-xs text-muted-foreground flex gap-4">
												{session.started_at && <span>開始: {formatDate(session.started_at)}</span>}
												{session.completed_at && (
													<span>完了: {formatDate(session.completed_at)}</span>
												)}
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
