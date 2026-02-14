import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { RadarAxis } from "../../components/design-system";
import {
	BackLink,
	FormField,
	InfoAlert,
	LoadingState,
	ProgressBar,
	RadarChart,
	StatusBadge,
} from "../../components/design-system";
import { SessionTimeline } from "../../components/SessionTimeline";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "../../components/ui/sheet";
import {
	useGetApiAgents,
	useGetApiAgentsAgentIdDirections,
	useGetApiSessionsId,
	useGetApiSessionsIdTurns,
	usePostApiAgentsAgentIdDirections,
} from "../../hooks/backend";
import { cn } from "../../lib/utils";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Session Detail - Jukugi Bokujo" }];
}

export default function SessionDetailPage() {
	const { id } = useParams();
	const { isSignedIn } = useAuth();

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

	const { data: agentsData } = useGetApiAgents({
		query: { enabled: !!isSignedIn },
	});

	const session =
		!sessionError && sessionData?.data && "topic" in sessionData.data ? sessionData.data : null;
	const turnsResponse = !turnsError && turnsData?.data ? turnsData.data : null;
	const turns = turnsResponse && "turns" in turnsResponse ? turnsResponse.turns : [];

	const loading = sessionLoading || turnsLoading;
	const error = sessionError || turnsError;

	const myAgentIds = useMemo(() => {
		const agentsResponse = agentsData?.data;
		const agents = agentsResponse && "agents" in agentsResponse ? agentsResponse.agents : [];
		return new Set(agents.map((a) => a.id));
	}, [agentsData]);

	const myParticipants = useMemo(() => {
		if (!session) return [];
		return session.participants.filter((p) => myAgentIds.has(p.agent_id));
	}, [session, myAgentIds]);

	const isActive = session?.status === "active";
	const hasProcessingTurn = turns.some((t) => t.status === "processing");
	const showDirectionInput = isActive && myParticipants.length > 0 && !hasProcessingTurn;

	// Auto-refresh for active sessions every 15 seconds
	useEffect(() => {
		if (isActive) {
			const interval = setInterval(() => {
				refetchSession();
				refetchTurns();
			}, 15000);
			return () => clearInterval(interval);
		}
	}, [isActive, refetchSession, refetchTurns]);

	return (
		<div className="max-w-6xl mx-auto">
			{loading && <LoadingState message="Loading session..." />}

			{error && (
				<InfoAlert variant="error">
					{error instanceof Error ? error.message : "Failed to load session"}
				</InfoAlert>
			)}

			{!loading && !error && session && (
				<Sheet>
					<div>
						{/* Back link */}
						<BackLink to="/sessions" label="熟議アリーナ" />

						{/* Compact header */}
						<div className="flex items-center gap-3 flex-wrap mb-1">
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
								{session.status}
							</StatusBadge>
							<h1 className="text-lg font-bold">{session.topic.title}</h1>
							<TurnProgressBar current={session.current_turn} max={session.max_turns} />
						</div>
						{session.topic.description && (
							<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
								{session.topic.description}
							</p>
						)}

						{/* Completed session: judge + summary (between header and participants) */}
						{session.status === "completed" && (session.summary || session.judge_verdict) && (
							<CompletedSection summary={session.summary} judgeVerdict={session.judge_verdict} />
						)}

						{/* Spectator banner for signed-in users with no participating agents */}
						<SignedIn>
							{myParticipants.length === 0 && (
								<InfoAlert variant="warning" className="mb-4">
									この議論を観戦中です。あなたのなかまは参加していません。
								</InfoAlert>
							)}
						</SignedIn>

						{/* Participants inline chips */}
						<p className="text-sm text-muted-foreground">参加なかま</p>
						<div className="flex items-center gap-1 flex-wrap mb-4">
							{session.participants.map((participant) => {
								const isMine = myAgentIds.has(participant.agent_id);
								return (
									<Link key={participant.agent_id} to={`/agents/${participant.agent_id}`}>
										{isMine ? (
											<Badge className="bg-primary/10 text-primary border-primary border">
												{participant.agent_name}
											</Badge>
										) : (
											<Badge variant="outline">{participant.agent_name}</Badge>
										)}
									</Link>
								);
							})}
						</div>

						{showDirectionInput && (
							<div className="mb-4">
								<SheetTrigger asChild>
									<Button variant="outline" size="lg" className="ml-auto">
										📣 声をかける
									</Button>
								</SheetTrigger>
							</div>
						)}

						{/* Timeline - main content */}
						<SessionTimeline turns={turns} myAgentIds={myAgentIds} maxTurns={session.max_turns} />

						{/* Timestamps */}
						{(session.started_at || session.completed_at) && (
							<div className="mt-4 text-sm text-muted-foreground flex gap-6">
								{session.started_at && <span>開始: {formatDateTime(session.started_at)}</span>}
								{session.completed_at && <span>終了: {formatDateTime(session.completed_at)}</span>}
							</div>
						)}
					</div>

					{/* Direction Sheet */}
					{showDirectionInput && id && (
						<DirectionSheet
							sessionId={id}
							maxTurns={session.max_turns}
							turns={turns}
							myParticipants={myParticipants}
						/>
					)}
				</Sheet>
			)}

			{/* Floating CTA for signed-out users */}
			<SignedOut>
				<div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
					<div className="bg-primary text-primary-foreground shadow-lg rounded-full px-6 py-3 flex items-center gap-3 pointer-events-auto">
						<span className="text-sm font-medium">あなたのなかまも参戦させよう</span>
						<Button variant="secondary" size="sm" asChild>
							<Link to="/signup">無料で始める</Link>
						</Button>
					</div>
				</div>
			</SignedOut>
		</div>
	);
}

const JUDGE_AXES: RadarAxis[] = [
	{ key: "quality_score", label: "議論の質", description: "論理性、根拠の明確さ、議論の深さ" },
	{
		key: "cooperation_score",
		label: "協調性",
		description: "建設的な対話、相互理解、攻撃性の有無",
	},
	{
		key: "convergence_score",
		label: "まとまり度",
		description: "明確な合意形成、曖昧さの排除",
	},
	{
		key: "novelty_score",
		label: "新規性",
		description: "創造性、既存の通説からの脱却",
	},
	{
		key: "inclusiveness_score",
		label: "包摂性",
		description: "多様な立場・背景への配慮、少数意見の尊重",
	},
	{
		key: "transformation_score",
		label: "意見変容度",
		description: "議論を通じた意見の変化・発展、柔軟性",
	},
	{
		key: "cross_reference_score",
		label: "相互参照度",
		description: "他者の発言への言及・引用、対話の連続性",
	},
];

/** Completed session section: judge verdict + collapsible summary */
function CompletedSection({
	summary,
	judgeVerdict,
}: {
	summary: string | null;
	judgeVerdict: {
		quality_score: number;
		cooperation_score: number;
		convergence_score: number;
		novelty_score: number;
		inclusiveness_score?: number;
		transformation_score?: number;
		cross_reference_score?: number;
		summary: string;
		highlights?: string[];
		consensus?: string;
	} | null;
}) {
	const [summaryOpen, setSummaryOpen] = useState(false);

	return (
		<Card className="mb-4">
			<CardContent>
				{/* Judge verdict (top) */}
				{judgeVerdict && (
					<div className={summary ? "mb-4" : ""}>
						<h2 className="text-lg font-bold mb-2">ジャッジ評価</h2>
						<div className="space-y-4">
							<RadarChart
								axes={JUDGE_AXES}
								data={judgeVerdict as unknown as Record<string, number | undefined>}
							/>

							<div>
								<h3 className="font-semibold text-foreground mb-2">まとめ</h3>
								<p className="text-muted-foreground">{judgeVerdict.summary}</p>
							</div>

							{judgeVerdict.highlights && judgeVerdict.highlights.length > 0 && (
								<div>
									<h3 className="font-semibold text-foreground mb-2">ハイライト</h3>
									<ul className="list-disc list-inside space-y-1">
										{judgeVerdict.highlights.map((highlight, idx) => (
											<li
												key={`highlight-${idx}-${highlight.substring(0, 50)}`}
												className="text-muted-foreground"
											>
												{highlight}
											</li>
										))}
									</ul>
								</div>
							)}

							{judgeVerdict.consensus && (
								<div>
									<h3 className="font-semibold text-foreground mb-2">合意点</h3>
									<p className="text-muted-foreground">{judgeVerdict.consensus}</p>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Summary accordion (bottom) */}
				{summary && (
					<div className={judgeVerdict ? "border-t pt-4" : ""}>
						<button
							type="button"
							onClick={() => setSummaryOpen((prev) => !prev)}
							className="w-full flex items-center gap-2 text-left"
						>
							<ChevronRight
								className={cn(
									"size-4 text-muted-foreground transition-transform",
									summaryOpen && "rotate-90",
								)}
							/>
							<h2 className="text-lg font-bold">議論の詳細まとめ</h2>
						</button>
						{summaryOpen && (
							<p className="mt-2 pl-6 text-foreground whitespace-pre-wrap leading-relaxed">
								{summary}
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/** Turn progress bar */
function TurnProgressBar({ current, max }: { current: number; max: number }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground whitespace-nowrap">
				ターン {current} / {max}
			</span>
			<ProgressBar value={current} max={max} className="w-24" />
		</div>
	);
}

/** Direction input as a right-side Sheet */
function DirectionSheet({
	sessionId,
	maxTurns,
	turns,
	myParticipants,
}: {
	sessionId: string;
	maxTurns: number;
	turns: { turn_number: number; status: string }[];
	myParticipants: { agent_id: string; agent_name: string }[];
}) {
	const [selectedAgentId, setSelectedAgentId] = useState(myParticipants[0]?.agent_id ?? "");
	const [content, setContent] = useState("");

	// Find the next turn that hasn't started yet.
	// If a pending turn exists in the data, use it.
	// Otherwise, the latest turn is processing/completed, so target the one after it.
	const sorted = [...turns].sort((a, b) => a.turn_number - b.turn_number);
	const firstPending = sorted.find((t) => t.status === "pending");
	const latestTurn = sorted[sorted.length - 1];
	const turnNumber = firstPending
		? firstPending.turn_number
		: latestTurn
			? Math.min(latestTurn.turn_number + 1, maxTurns)
			: 1;

	const { data: directionsData, refetch: refetchDirections } = useGetApiAgentsAgentIdDirections(
		selectedAgentId,
		{ session_id: sessionId },
	);

	const directionsResponse = directionsData?.data;
	const directions =
		directionsResponse && "directions" in directionsResponse ? directionsResponse.directions : [];

	const createMutation = usePostApiAgentsAgentIdDirections();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedAgentId || !content.trim()) return;

		try {
			await createMutation.mutateAsync({
				agentId: selectedAgentId,
				data: {
					session_id: sessionId,
					turn_number: turnNumber,
					content: content.trim(),
				},
			});
			setContent("");
			refetchDirections();
		} catch {
			// error is shown via mutation state
		}
	}

	return (
		<SheetContent side="right">
			<SheetHeader>
				<SheetTitle>📣 なかまに伝える</SheetTitle>
				<SheetDescription>なかまに次のターンの方針を伝えます</SheetDescription>
			</SheetHeader>

			<div className="px-4 pb-4 overflow-y-auto flex-1">
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Agent selector */}
					{myParticipants.length > 1 && (
						<div>
							<p className="text-sm font-medium mb-2">なかま選択</p>
							<div className="flex flex-wrap gap-2">
								{myParticipants.map((p) => (
									<Button
										key={p.agent_id}
										type="button"
										variant={selectedAgentId === p.agent_id ? "default" : "outline"}
										size="sm"
										onClick={() => setSelectedAgentId(p.agent_id)}
									>
										{p.agent_name}
									</Button>
								))}
							</div>
						</div>
					)}

					<p className="text-sm text-muted-foreground">
						対象ターン: <span className="font-medium text-foreground">ターン {turnNumber}</span>
					</p>

					<FormField
						label="指示内容"
						name="directionContent"
						type="textarea"
						rows={3}
						value={content}
						onChange={setContent}
						placeholder="例: 経済的な影響に注目して..."
						maxLength={80}
						disabled={createMutation.isPending}
						required
					/>

					<Button
						type="submit"
						disabled={createMutation.isPending || !content.trim()}
						className="w-full"
					>
						{createMutation.isPending ? "送信中..." : "送信"}
					</Button>

					{createMutation.isError && (
						<p className="text-sm text-destructive">
							{createMutation.error instanceof Error
								? createMutation.error.message
								: "送信に失敗しました"}
						</p>
					)}
				</form>

				{/* Existing directions */}
				{directions.length > 0 && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium mb-2 text-muted-foreground">送信済みの指示</p>
						<div className="space-y-2">
							{directions.map((d) => (
								<div key={d.id} className="flex items-center gap-2 text-sm">
									<StatusBadge variant="direction">ターン {d.turn_number}</StatusBadge>
									<span className="text-foreground">{d.content}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</SheetContent>
	);
}
