import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { Link } from "react-router";
import {
	EmptyState,
	FormField,
	LoadingState,
	ScoreCard,
	StatusBadge,
} from "~/components/design-system";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "~/components/ui/carousel";
import { ProtectedRoute } from "../components/ProtectedRoute";
import {
	type AgentSummary,
	type FeedbackRequest,
	type SessionSummary,
	useGetApiAgents,
	useGetApiFeedbackRequests,
	useGetApiSessions,
	usePostApiAgentsAgentIdFeedbacks,
} from "../hooks/backend";

export function meta() {
	return [{ title: "Dashboard - Jukugi Bokujo" }];
}

const darkCssVars = {
	"--foreground": "oklch(1 0 0)",
	"--muted-foreground": "oklch(0.75 0 0)",
} as React.CSSProperties;

function getTimeTheme(): {
	greeting: string;
	bgClass: string;
	cssVars?: React.CSSProperties;
} {
	const hour = new Date().getHours();
	if (5 < hour && hour < 11)
		return { greeting: "おはようございます", bgClass: "bg-amber-50" };
	if (11 < hour && hour < 17)
		return { greeting: "こんにちは", bgClass: "bg-sky-50" };
	if (17 < hour && hour < 22)
		return { greeting: "こんばんは", bgClass: "bg-orange-800", cssVars: darkCssVars };
	return { greeting: "お疲れさまです", bgClass: "bg-indigo-950", cssVars: darkCssVars };
}

function getNextSessionTime(): string {
	const now = new Date();
	const utcHour = now.getUTCHours();
	// Master Cron runs at UTC 0:00, 6:00, 12:00, 18:00
	const cronHours = [0, 6, 12, 18];
	const nextHour = cronHours.find((h) => h > utcHour);

	const next = new Date(now);
	next.setUTCMinutes(0, 0, 0);
	if (nextHour !== undefined) {
		next.setUTCHours(nextHour);
	} else {
		next.setUTCDate(next.getUTCDate() + 1);
		next.setUTCHours(0);
	}

	return next.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function getRanchWeather(
	activeSessionCount: number,
	feedbackCount: number,
): { emoji: string; label: string } {
	const activity = activeSessionCount + feedbackCount;
	if (activity >= 4) return { emoji: "☀️", label: "にぎやか" };
	if (activity >= 2) return { emoji: "⛅", label: "活動中" };
	if (activity >= 1) return { emoji: "🌤️", label: "のんびり" };
	return { emoji: "🌙", label: "しーん" };
}

export default function Dashboard() {
	const { user } = useUser();

	const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useGetApiAgents();

	const {
		data: activeSessionsData,
		isLoading: activeSessionsLoading,
		error: activeSessionsError,
	} = useGetApiSessions({ status: "active", limit: 5 });

	const {
		data: completedSessionsData,
		isLoading: completedSessionsLoading,
		error: completedSessionsError,
	} = useGetApiSessions({ status: "completed", limit: 1 });

	const {
		data: feedbackData,
		isLoading: feedbackLoading,
		refetch: refetchFeedback,
	} = useGetApiFeedbackRequests();

	const loading =
		agentsLoading || activeSessionsLoading || completedSessionsLoading || feedbackLoading;
	const hasError = agentsError || activeSessionsError || completedSessionsError;

	const agentsResponse = !agentsError && agentsData?.data ? agentsData.data : null;
	const activeSessionsResponse =
		!activeSessionsError && activeSessionsData?.data ? activeSessionsData.data : null;
	const completedSessionsResponse =
		!completedSessionsError && completedSessionsData?.data ? completedSessionsData.data : null;

	const agents =
		agentsResponse && "agents" in agentsResponse ? agentsResponse.agents.slice(0, 5) : [];

	const activeSessions =
		activeSessionsResponse && "sessions" in activeSessionsResponse
			? activeSessionsResponse.sessions
			: [];

	const completedSessionsTotal =
		completedSessionsResponse && "total" in completedSessionsResponse
			? completedSessionsResponse.total
			: 0;

	const feedbackRequests =
		feedbackData?.data && "feedback_requests" in feedbackData.data
			? feedbackData.data.feedback_requests
			: [];

	if (hasError) {
		console.error("Failed to load dashboard data:", {
			agentsError,
			activeSessionsError,
			completedSessionsError,
		});
	}

	const timeTheme = getTimeTheme();

	return (
		<ProtectedRoute>
			<div
				className={`-mx-4 -my-8 px-4 py-8 transition-colors text-foreground ${timeTheme.bgClass}`}
				style={timeTheme.cssVars}
			>
				{loading ? (
					<LoadingState message="牧場を準備中..." />
				) : agents.length === 0 ? (
					<OnboardingView />
				) : (
					<>
						<RanchHeader
							userName={user?.firstName || "User"}
							agentCount={agents.length}
							activeSessionCount={activeSessions.length}
							feedbackCount={feedbackRequests.length}
							greeting={timeTheme.greeting}
						/>
						<AgentsDashboardView
							agents={agents}
							activeSessions={activeSessions}
							feedbackRequests={feedbackRequests}
							refetchFeedback={refetchFeedback}
							completedSessionsTotal={completedSessionsTotal}
							userName={user?.firstName || "User"}
						/>
					</>
				)}
			</div>
		</ProtectedRoute>
	);
}

function RanchHeader({
	userName,
	agentCount,
	activeSessionCount,
	feedbackCount,
	greeting,
}: {
	userName: string;
	agentCount: number;
	activeSessionCount: number;
	feedbackCount: number;
	greeting: string;
}) {
	const weather = getRanchWeather(activeSessionCount, feedbackCount);

	return (
		<div className="mb-8">
			<h1 className="text-2xl font-bold mb-1">
				{weather.emoji} {greeting}、{userName}さん
			</h1>
			<p className="text-muted-foreground mb-3">今の牧場は「{weather.label}」です</p>
			<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
				<span>🐄 エージェント {agentCount}頭</span>
				<span>📝 進行中の熟議 {activeSessionCount}件</span>
				<span>💬 フィードバック待ち {feedbackCount}件</span>
			</div>
		</div>
	);
}

function RanchLevel({
	agentCount,
	completedSessionsTotal,
	userName,
}: {
	agentCount: number;
	completedSessionsTotal: number;
	userName: string;
}) {
	const xp = agentCount * 30 + completedSessionsTotal * 15;
	const level = Math.floor(xp / 100) + 1;
	const currentLevelXp = xp % 100;

	return (
		<div className="mb-8">
			<div className="flex items-baseline gap-2 mb-2">
				<h2 className="text-lg font-bold">🏡 {userName}牧場</h2>
				<span className="text-sm font-semibold text-muted-foreground">Lv.{level}</span>
				<span className="text-xs text-muted-foreground ml-auto">{currentLevelXp} / 100 XP</span>
			</div>
			<div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-4">
				<div
					className="h-full bg-primary rounded-full transition-all"
					style={{ width: `${currentLevelXp}%` }}
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<ScoreCard label="エージェント数" value={agentCount} color="blue" />
				<ScoreCard label="参加議論数" value={completedSessionsTotal} color="green" />
			</div>
		</div>
	);
}

function RanchAgentList({
	agents,
	feedbackAgentIds,
}: {
	agents: AgentSummary[];
	feedbackAgentIds: Set<string>;
}) {
	return (
		<div className="mb-8">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-bold">🐄 牧場のなかま</h2>
				<Button variant="link" size="sm" asChild>
					<Link to="/agents">全員を見る →</Link>
				</Button>
			</div>
			<Card>
				<CardContent className="divide-y">
					{agents.map((agent) => (
						<Link
							key={agent.id}
							to={`/agents/${agent.id}`}
							className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
						>
							<div className="flex items-center gap-3">
								<span className="text-xl">🐄</span>
								<div>
									<p className="font-semibold">{agent.name}</p>
									<p className="text-sm text-muted-foreground">
										{agent.persona.core_values[0] || ""}
									</p>
								</div>
							</div>
							{feedbackAgentIds.has(agent.id) ? (
								<StatusBadge variant="feedback">❗ フィードバック待ち</StatusBadge>
							) : agent.active_session_count > 0 ? (
								<StatusBadge variant="active">📝 出張中</StatusBadge>
							) : (
								<StatusBadge variant="pending">💤 のんびり中</StatusBadge>
							)}
						</Link>
					))}
					<Link
						to="/agents/new"
						className="flex items-center gap-3 py-3 last:pb-0 text-muted-foreground hover:text-foreground transition-colors"
					>
						<span className="text-xl">+</span>
						<p className="font-semibold">新しいなかまを迎える</p>
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}

function OnboardingView() {
	return (
		<div className="space-y-8">
			<Card>
				<CardContent className="text-center py-12">
					<p className="text-4xl mb-4">🐄</p>
					<h2 className="text-2xl font-bold mb-2">まだ牧場にエージェントがいません</h2>
					<p className="text-muted-foreground mb-6">
						AIエージェントを作って、熟議に送り出しましょう
					</p>
					<Button asChild size="lg">
						<Link to="/agents/new">エージェントを作成する</Link>
					</Button>
				</CardContent>
			</Card>

			<div>
				<h3 className="text-lg font-semibold mb-4">はじめかた</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<StepCard step={1} title="エージェントを作る" description="名前と性格を設定" />
					<StepCard step={2} title="知識と方向性を与える" description="あなたの考えを教える" />
					<StepCard step={3} title="自動で熟議に参加" description="エージェントを観察する" />
				</div>
			</div>
		</div>
	);
}

function StepCard({
	step,
	title,
	description,
}: {
	step: number;
	title: string;
	description: string;
}) {
	return (
		<Card>
			<CardContent className="py-4">
				<p className="text-sm font-semibold text-muted-foreground mb-1">Step {step}</p>
				<p className="font-semibold">{title}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);
}

function FeedbackWantedSection({
	feedbackRequests,
	agents,
	refetchFeedback,
}: {
	feedbackRequests: FeedbackRequest[];
	agents: AgentSummary[];
	refetchFeedback: () => void;
}) {
	if (feedbackRequests.length === 0) {
		return null;
	}

	const agentMap = new Map(agents.map((a) => [a.id, a]));

	return (
		<div className="mb-8">
			<h2 className="text-lg font-bold mb-4">🏠 牧場に帰ってきたなかま</h2>
			<Carousel className="mx-9">
				<CarouselContent>
					{feedbackRequests.map((request: FeedbackRequest) => (
						<CarouselItem key={`${request.agent_id}-${request.session_id}`}>
							<FeedbackCard
								request={request}
								agent={agentMap.get(request.agent_id)}
								onSubmitted={refetchFeedback}
							/>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious variant="secondary" className="size-8" />
				<CarouselNext variant="secondary" className="size-8" />
			</Carousel>
		</div>
	);
}

function FeedbackCard({
	request,
	agent,
	onSubmitted,
}: {
	request: FeedbackRequest;
	agent?: AgentSummary;
	onSubmitted: () => void;
}) {
	const [content, setContent] = useState("");
	const mutation = usePostApiAgentsAgentIdFeedbacks();

	const handleSubmit = () => {
		if (!content.trim()) return;

		mutation.mutate(
			{
				agentId: request.agent_id,
				data: {
					session_id: request.session_id,
					content: content.trim(),
				},
			},
			{
				onSuccess: () => {
					setContent("");
					onSubmitted();
				},
			},
		);
	};

	const coreValue = agent?.persona.core_values[0];

	return (
		<Card className="py-3 border-l-4 border-orange-400">
			<CardContent className="px-3">
				<div className="mb-3">
					<p className="font-bold text-lg">🐄 {request.agent_name} が帰ってきた！</p>
					<p className="text-muted-foreground text-sm">
						「{request.topic_title}」の議論に参加してきました
					</p>
					{coreValue && (
						<div className="mt-2">
							<StatusBadge variant="info">大切にしていること: {coreValue}</StatusBadge>
						</div>
					)}
				</div>

				<FormField
					label="声をかける"
					name={`feedback-${request.agent_id}-${request.session_id}`}
					type="textarea"
					value={content}
					onChange={setContent}
					placeholder="がんばったね、次はもっと〇〇してみて..."
					maxLength={400}
					rows={3}
					disabled={mutation.isPending}
				/>

				<div className="flex justify-between items-center mt-3">
					<Button variant="link" size="sm" asChild className="px-0">
						<Link to={`/sessions/${request.session_id}`}>議論を見る →</Link>
					</Button>
					<Button onClick={handleSubmit} disabled={!content.trim() || mutation.isPending} size="sm">
						{mutation.isPending ? "送信中..." : "声をかける"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function AgentsDashboardView({
	agents,
	activeSessions,
	feedbackRequests,
	refetchFeedback,
	completedSessionsTotal,
	userName,
}: {
	agents: AgentSummary[];
	activeSessions: SessionSummary[];
	feedbackRequests: FeedbackRequest[];
	refetchFeedback: () => void;
	completedSessionsTotal: number;
	userName: string;
}) {
	const feedbackAgentIds = new Set(feedbackRequests.map((r) => r.agent_id));

	return (
		<>
			{/* Feedback Wanted */}
			<FeedbackWantedSection
				feedbackRequests={feedbackRequests}
				agents={agents}
				refetchFeedback={refetchFeedback}
			/>

			{/* Ranch Level */}
			<RanchLevel
				agentCount={agents.length}
				completedSessionsTotal={completedSessionsTotal}
				userName={userName}
			/>

			{/* Active Sessions */}
			{agents.length > 0 && (
				<div className="mb-8">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-bold">📝 進行中の議論</h2>
						<Button variant="link" size="sm" asChild>
							<Link to="/sessions?status=active">すべて見る →</Link>
						</Button>
					</div>
					{activeSessions.length === 0 ? (
						<EmptyState
							message="進行中の議論はありません"
							description={`次のセッションは ${getNextSessionTime()} 頃に始まります`}
						/>
					) : (
						<div className="space-y-4 flex flex-col gap-1">
							{activeSessions.map((session: SessionSummary) => (
								<Link key={session.id} to={`/sessions/${session.id}`}>
									<Card className="hover:shadow-lg transition">
										<CardContent>
											<div className="flex justify-between items-start mb-2">
												<h3 className="font-semibold text-lg">{session.topic.title}</h3>
												<StatusBadge variant="active">進行中</StatusBadge>
											</div>
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span>{session.participant_count}頭が参加中</span>
												<span>•</span>
												<span>
													ターン {session.current_turn} / {session.max_turns}
												</span>
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					)}
				</div>
			)}

			{/* Ranch Agents */}
			<RanchAgentList agents={agents} feedbackAgentIds={feedbackAgentIds} />
		</>
	);
}
