import { SignedIn, useAuth } from "@clerk/clerk-react";
import { Link, useSearchParams } from "react-router";
import {
	EmptyState,
	FilterTabs,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "../../components/design-system";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { type SessionSummary, useGetApiSessions } from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

const STATUS_LABELS: Record<string, string> = {
	active: "議論中",
	completed: "終了",
	cancelled: "中止",
	pending: "準備中",
};

export function meta() {
	return [{ title: "Sessions - Jukugi Bokujo" }];
}

export default function SessionsIndex() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { isSignedIn, userId } = useAuth();

	const status = searchParams.get("status") || "all";
	const scope = searchParams.get("scope") || "all";
	const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
	const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

	// Build query parameters
	const queryParams: {
		status?: "active" | "completed";
		user_id?: string;
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

	// Filter by user's sessions when scope is "mine"
	if (scope === "mine" && isSignedIn && userId) {
		queryParams.user_id = userId;
	}

	const { data: sessionsData, isLoading: loading, error } = useGetApiSessions(queryParams);

	// Extract data safely
	const sessionsResponse = !error && sessionsData?.data ? sessionsData.data : null;
	const sessions =
		sessionsResponse && "sessions" in sessionsResponse ? sessionsResponse.sessions : [];
	const total = sessionsResponse && "total" in sessionsResponse ? sessionsResponse.total : 0;

	function handleStatusChange(newStatus: string) {
		setSearchParams({ status: newStatus, scope, limit: limit.toString(), offset: "0" });
	}

	function handleScopeChange(newScope: string) {
		setSearchParams({ status, scope: newScope, limit: limit.toString(), offset: "0" });
	}

	function handlePagination(newOffset: number) {
		setSearchParams({
			status,
			scope,
			limit: limit.toString(),
			offset: newOffset.toString(),
		});
	}

	return (
		<div className="max-w-2xl mx-auto">
			{/* Header */}
			<div className="text-center mb-6">
				<p className="text-5xl mb-3">🏟️</p>
				<h1 className="text-2xl font-bold mb-1">熟議アリーナ</h1>
				<p className="text-muted-foreground">なかまたちの議論を観戦しよう</p>
			</div>

			{/* Scope filter (signed-in only) */}
			<SignedIn>
				<div className="mb-4">
					<FilterTabs
						options={[
							{ value: "all", label: "すべて" },
							{ value: "mine", label: "自分の議論" },
						]}
						value={scope}
						onChange={handleScopeChange}
					/>
				</div>
			</SignedIn>

			{/* Status filters */}
			<div className="mb-6">
				<FilterTabs
					options={[
						{ value: "all", label: "すべて" },
						{ value: "active", label: "議論中" },
						{ value: "completed", label: "決着済み" },
					]}
					value={status}
					onChange={handleStatusChange}
				/>
			</div>

			{loading && <LoadingState message="議論を読み込み中..." />}

			{error && (
				<InfoAlert variant="error" className="mb-6">
					{error instanceof Error ? error.message : "議論の読み込みに失敗しました"}
				</InfoAlert>
			)}

			{!loading && !error && sessions.length === 0 && (
				<EmptyState
					message="まだ議論がありません"
					actionLabel={status !== "all" ? "すべての議論を見る" : undefined}
					onAction={status !== "all" ? () => handleStatusChange("all") : undefined}
				/>
			)}

			{!loading && !error && sessions.length > 0 && (
				<div>
					<div className="space-y-4 mb-6">
						{sessions.map((session: SessionSummary) => (
							<Link
								key={session.id}
								to={`/sessions/${session.id}`}
								className="block hover:shadow-lg transition"
							>
								<Card>
									<CardContent>
										<div className="flex justify-between items-start mb-3">
											<h3 className="font-semibold text-lg flex-1">{session.topic.title}</h3>
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
												{STATUS_LABELS[session.status] || session.status}
											</StatusBadge>
										</div>

										{/* Turn Progress */}
										<div className="mb-3">
											<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
												<span>
													ターン {session.current_turn} / {session.max_turns}
												</span>
												<span>{session.participant_count}体参戦</span>
											</div>
											<div className="flex gap-1">
												{Array.from({ length: session.max_turns }).map((_, i) => (
													<div
														key={`turn-${session.id}-${i}`}
														className={`h-1.5 flex-1 rounded-full ${
															i < session.current_turn
																? session.status === "active"
																	? "bg-primary"
																	: session.status === "completed"
																		? "bg-green-500"
																		: "bg-muted-foreground/40"
																: session.status === "completed"
																	? "bg-green-500"
																	: "bg-muted"
														}`}
													/>
												))}
											</div>
										</div>

										{/* Timestamps */}
										<div className="text-xs text-muted-foreground">
											{session.status === "active" && session.started_at && (
												<span>開始: {formatDateTime(session.started_at)}</span>
											)}
											{session.status === "completed" && session.completed_at && (
												<span>終了: {formatDateTime(session.completed_at)}</span>
											)}
											{session.status !== "active" &&
												session.status !== "completed" &&
												session.started_at && (
													<span>開始: {formatDateTime(session.started_at)}</span>
												)}
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>

					{/* Pagination */}
					{total > limit && (
						<div className="flex justify-center gap-4 items-center">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePagination(Math.max(0, offset - limit))}
								disabled={offset === 0}
							>
								前へ
							</Button>
							<span className="text-sm text-muted-foreground">
								{offset + 1} - {Math.min(offset + limit, total)} / {total}件
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePagination(offset + limit)}
								disabled={offset + limit >= total}
							>
								次へ
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
