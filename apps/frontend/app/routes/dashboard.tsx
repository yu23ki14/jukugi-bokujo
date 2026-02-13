import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
	EmptyState,
	FormField,
	LoadingState,
	ProgressBar,
	ScoreCard,
	StatusBadge,
} from "~/components/design-system";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
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
	type PersonaChangeData,
	type SessionSummary,
	useGetApiAgents,
	useGetApiFeedbackRequests,
	useGetApiSessions,
	usePostApiAgentsAgentIdFeedbacks,
} from "../hooks/backend";
import type { AgentPersona } from "../lib/types";

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
	if (5 < hour && hour <= 11) return { greeting: "おはようございます", bgClass: "bg-amber-50" };
	if (11 < hour && hour <= 17) return { greeting: "こんにちは", bgClass: "bg-sky-50" };
	if (17 < hour && hour < 22)
		return { greeting: "こんばんは", bgClass: "bg-orange-800", cssVars: darkCssVars };
	return { greeting: "お疲れさまです", bgClass: "bg-indigo-950", cssVars: darkCssVars };
}

function getNextSessionTime(): string {
	const now = new Date();
	const utcHour = now.getUTCHours();
	// Master Cron runs at UTC 22,2,6,10,14,18 (= JST 7,11,15,19,23,3)
	const cronHours = [2, 6, 10, 14, 18, 22];
	const nextHour = cronHours.find((h) => h > utcHour);

	const next = new Date(now);
	next.setUTCMinutes(0, 0, 0);
	if (nextHour !== undefined) {
		next.setUTCHours(nextHour);
	} else {
		next.setUTCDate(next.getUTCDate() + 1);
		next.setUTCHours(cronHours[0]);
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

	const feedbackRequests = (
		feedbackData?.data && "feedback_requests" in feedbackData.data
			? feedbackData.data.feedback_requests
			: []
	).filter((r) => !!r.reflection_question);

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
				<span>🐄 なかま {agentCount}頭</span>
				<span>📝 進行中の熟議 {activeSessionCount}件</span>
				<span>💬 ふりかえり待ち {feedbackCount}件</span>
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
			<ProgressBar value={currentLevelXp} max={100} className="h-3 mb-4" />
			<div className="grid grid-cols-2 gap-4">
				<ScoreCard label="なかまの数" value={agentCount} color="blue" />
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
								<StatusBadge variant="feedback">❗ ふりかえり待ち</StatusBadge>
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
					<h2 className="text-2xl font-bold mb-2">まだ牧場になかまがいません</h2>
					<p className="text-muted-foreground mb-6">なかまを迎えて、熟議に送り出しましょう</p>
					<Button asChild size="lg">
						<Link to="/agents/new">なかまを迎える</Link>
					</Button>
				</CardContent>
			</Card>

			<div>
				<h3 className="text-lg font-semibold mb-4">はじめかた</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<StepCard step={1} title="なかまを迎える" description="名前と性格を設定" />
					<StepCard step={2} title="知識と方向性を与える" description="あなたの考えを教える" />
					<StepCard step={3} title="自動で熟議に参加" description="なかまを観察する" />
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
	refetchFeedback,
}: {
	feedbackRequests: FeedbackRequest[];
	refetchFeedback: () => void;
}) {
	if (feedbackRequests.length === 0) {
		return null;
	}

	return (
		<div className="mb-8">
			<h2 className="text-lg font-bold mb-4">🏠 牧場に帰ってきたなかま</h2>
			<Carousel className="mx-9">
				<CarouselContent>
					{feedbackRequests.map((request: FeedbackRequest) => (
						<CarouselItem key={`${request.agent_id}-${request.session_id}`}>
							<FeedbackCard request={request} onSubmitted={refetchFeedback} />
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
	onSubmitted,
}: {
	request: FeedbackRequest;
	onSubmitted: () => void;
}) {
	const navigate = useNavigate();
	const [content, setContent] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [personaChange, setPersonaChange] = useState<PersonaChangeData | null>(null);
	const mutation = usePostApiAgentsAgentIdFeedbacks();

	const handleSubmit = () => {
		if (!content.trim()) return;

		setDialogOpen(true);
		mutation.mutate(
			{
				agentId: request.agent_id,
				data: {
					session_id: request.session_id,
					content: content.trim(),
					reflection_id: request.reflection_id ?? undefined,
				},
			},
			{
				onSuccess: (response) => {
					if (response.status === 201 && "persona_change" in response.data) {
						setPersonaChange(response.data.persona_change ?? null);
					}
					setContent("");
					setSubmitted(true);
				},
				onError: () => {
					setDialogOpen(false);
				},
			},
		);
	};

	const handleDialogClose = (open: boolean) => {
		if (!open && submitted) {
			onSubmitted();
		}
		setDialogOpen(open);
	};

	const hasReflection = !!request.reflection_question;

	return (
		<>
			<Card className="py-3 border-l-4 border-orange-400">
				<CardContent className="px-3">
					<div className="mb-3">
						{hasReflection ? (
							<>
								<p className="font-bold text-lg">
									🐄 {request.agent_name} がアドバイスを求めています
								</p>
								<p className="text-muted-foreground text-sm mb-2">
									「{request.topic_title}」の議論に参加してきました
								</p>
								<Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
									<CardContent className="py-3 px-3">
										<p className="font-semibold text-md mb-1">💭 {request.reflection_question}</p>
										<p className="text-sm">{request.reflection_context}</p>
									</CardContent>
								</Card>
							</>
						) : (
							<>
								<p className="font-bold text-lg">🐄 {request.agent_name} が帰ってきた！</p>
								<p className="text-muted-foreground text-sm">
									「{request.topic_title}」の議論に参加してきました
								</p>
							</>
						)}
					</div>

					<FormField
						label="声をかける"
						name={`feedback-${request.agent_id}-${request.session_id}`}
						type="textarea"
						value={content}
						onChange={setContent}
						placeholder={
							hasReflection
								? "アドバイスを書いてあげよう..."
								: "がんばったね、次はもっと〇〇してみて..."
						}
						maxLength={200}
						rows={3}
						disabled={mutation.isPending}
					/>

					<div className="flex justify-between items-center mt-3">
						<Button variant="link" size="sm" asChild className="px-0">
							<Link to={`/sessions/${request.session_id}`}>議論を見る →</Link>
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={!content.trim() || mutation.isPending}
							size="sm"
						>
							声をかける
						</Button>
					</div>
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
				<DialogContent showCloseButton={!mutation.isPending}>
					{mutation.isPending ? (
						<>
							<style>
								{`@keyframes cow-bounce {
									0%, 100% { transform: translateY(0); }
									50% { transform: translateY(-12px); }
								}`}
							</style>
							<div className="text-center py-8">
								<p
									className="text-5xl mb-4"
									style={{ animation: "cow-bounce 0.8s ease-in-out infinite" }}
								>
									🐄
								</p>
								<DialogHeader className="items-center">
									<DialogTitle>{request.agent_name} に伝えています...</DialogTitle>
									<DialogDescription>性格に変化があるかも</DialogDescription>
								</DialogHeader>
								<div className="flex justify-center gap-1 mt-4">
									{[0, 1, 2].map((i) => (
										<div
											key={i}
											className="w-2 h-2 rounded-full bg-primary animate-bounce"
											style={{ animationDelay: `${i * 0.15}s` }}
										/>
									))}
								</div>
							</div>
						</>
					) : personaChange ? (
						<div className="text-center py-4">
							<p className="text-5xl mb-3">🎉</p>
							<DialogHeader className="items-center mb-4">
								<DialogTitle>{request.agent_name} が成長しました！</DialogTitle>
							</DialogHeader>
							<div className="text-left">
								<PersonaChangeDiffCard personaChange={personaChange} />
							</div>
							<div className="flex flex-col gap-2 mt-6">
								<Button
									onClick={() => {
										onSubmitted();
										navigate(`/agents/${request.agent_id}?tab=growth`);
									}}
								>
									成長きろくを見る
								</Button>
								<Button variant="ghost" onClick={() => handleDialogClose(false)}>
									とじる
								</Button>
							</div>
						</div>
					) : (
						<div className="text-center py-4">
							<p className="text-5xl mb-3">🐄</p>
							<DialogHeader className="items-center mb-4">
								<DialogTitle>声をかけました！</DialogTitle>
								<DialogDescription>{request.agent_name} に気持ちが伝わりました</DialogDescription>
							</DialogHeader>
							<div className="flex flex-col gap-2 mt-4">
								<Button
									variant="outline"
									onClick={() => {
										onSubmitted();
										navigate(`/agents/${request.agent_id}`);
									}}
								>
									{request.agent_name}の詳細を見る
								</Button>
								<Button variant="ghost" onClick={() => handleDialogClose(false)}>
									とじる
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function PersonaChangeDiffCard({ personaChange }: { personaChange: PersonaChangeData }) {
	let before: AgentPersona;
	let after: AgentPersona;
	try {
		before = JSON.parse(personaChange.persona_before) as AgentPersona;
		after = JSON.parse(personaChange.persona_after) as AgentPersona;
	} catch {
		return null;
	}

	const addedValues = after.core_values.filter((v) => !before.core_values.includes(v));
	const removedValues = before.core_values.filter((v) => !after.core_values.includes(v));
	const addedTraits = after.personality_traits.filter(
		(t) => !before.personality_traits.includes(t),
	);
	const removedTraits = before.personality_traits.filter(
		(t) => !after.personality_traits.includes(t),
	);
	const thinkingChanged = before.thinking_style !== after.thinking_style;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-sm">
				<StatusBadge variant="pending">Lv.{before.version}</StatusBadge>
				<span className="text-muted-foreground">→</span>
				<StatusBadge variant="active">Lv.{after.version}</StatusBadge>
			</div>

			{(addedValues.length > 0 || removedValues.length > 0) && (
				<div>
					<p className="text-xs font-semibold text-muted-foreground mb-1">大事にしていること</p>
					<div className="flex flex-wrap gap-1">
						{addedValues.map((v) => (
							<StatusBadge key={`+${v}`} variant="active">
								+ {v}
							</StatusBadge>
						))}
						{removedValues.map((v) => (
							<StatusBadge key={`-${v}`} variant="cancelled">
								- {v}
							</StatusBadge>
						))}
					</div>
				</div>
			)}

			{(addedTraits.length > 0 || removedTraits.length > 0) && (
				<div>
					<p className="text-xs font-semibold text-muted-foreground mb-1">性格特性</p>
					<div className="flex flex-wrap gap-1">
						{addedTraits.map((t) => (
							<StatusBadge key={`+${t}`} variant="active">
								+ {t}
							</StatusBadge>
						))}
						{removedTraits.map((t) => (
							<StatusBadge key={`-${t}`} variant="cancelled">
								- {t}
							</StatusBadge>
						))}
					</div>
				</div>
			)}

			{thinkingChanged && (
				<div>
					<p className="text-xs font-semibold text-muted-foreground mb-1">思考スタイル</p>
					<p className="text-xs">
						<span className="line-through text-muted-foreground">{before.thinking_style}</span>
					</p>
					<p className="text-xs font-medium">{after.thinking_style}</p>
				</div>
			)}

			{addedValues.length === 0 &&
				removedValues.length === 0 &&
				addedTraits.length === 0 &&
				removedTraits.length === 0 &&
				!thinkingChanged && (
					<p className="text-xs text-muted-foreground">内面的な変化がありました（背景の更新）</p>
				)}
		</div>
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
							description={`次の議論は ${getNextSessionTime()} 頃に始まります`}
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
