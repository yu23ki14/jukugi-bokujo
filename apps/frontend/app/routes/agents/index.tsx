import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { AgentCard } from "../../components/AgentCard";
import { GradientTitle, InfoAlert, LoadingState } from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
	type AgentSummary,
	getGetApiAgentsQueryKey,
	useGetApiAgents,
	usePatchApiAgentsIdStatus,
} from "../../hooks/backend";

const MAX_ACTIVE_AGENTS = 2;

export function meta() {
	return [{ title: "牧場 - 熟議牧場" }];
}

export default function AgentsIndex() {
	const { data: agentsData, isLoading: loading, error } = useGetApiAgents();
	const queryClient = useQueryClient();
	const statusMutation = usePatchApiAgentsIdStatus();

	const agentsResponse = !error && agentsData?.data ? agentsData.data : null;
	const agents: AgentSummary[] =
		agentsResponse && "agents" in agentsResponse ? agentsResponse.agents : [];

	const activeAgents = agents.filter((a) => a.status === "active");
	const reserveAgents = agents.filter((a) => a.status === "reserve");

	const handleStatusChange = (agentId: string, newStatus: "active" | "reserve") => {
		statusMutation.mutate(
			{ id: agentId, data: { status: newStatus } },
			{
				onSuccess: () => {
					queryClient.invalidateQueries({ queryKey: getGetApiAgentsQueryKey() });
				},
			},
		);
	};

	const isInSession = (agent: AgentSummary) => agent.active_session_count > 0;
	const isActiveSlotFull = activeAgents.length >= MAX_ACTIVE_AGENTS;

	return (
		<ProtectedRoute>
			<div className="-mx-4 -my-8 bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-950/20">
				{/* Ranch Header */}
				<div className="text-center py-6 px-4">
					<GradientTitle className="text-2xl mb-1">なかまたち</GradientTitle>
					<p className="text-muted-foreground">
						{agents.length > 0
							? `${agents.length}体のなかまがいます`
							: "なかまを迎えて牧場を始めよう"}
					</p>
				</div>

				{loading && (
					<div className="px-4">
						<LoadingState message="牧場を読み込み中..." />
					</div>
				)}

				{error && (
					<div className="px-4">
						<InfoAlert variant="error" className="mb-6">
							<p>{error instanceof Error ? error.message : "Failed to load agents"}</p>
						</InfoAlert>
					</div>
				)}

				{!loading && !error && agents.length === 0 && (
					<div className="px-4 pb-16">
						<div className="text-center py-16 bg-muted/50 rounded-xl max-w-lg mx-auto">
							<p className="text-6xl mb-4">🌿</p>
							<p className="text-xl font-bold text-foreground mb-2">牧場はまだ静か...</p>
							<p className="text-muted-foreground mb-6">
								最初のなかまを迎えて、熟議の世界に送り出そう
							</p>
							<Button size="lg" asChild>
								<Link to="/agents/new">なかまを迎える</Link>
							</Button>
						</div>
					</div>
				)}

				{!loading && !error && agents.length > 0 && (
					<div>
						{/* Active Zone - Grazing Field */}
						<section className="p-4">
							<div className="max-w-3xl mx-auto">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-xl">🌾</span>
									<h2 className="text-xl font-bold">放牧エリア</h2>
									<span className="text-sm text-muted-foreground ml-1">
										{activeAgents.length}/{MAX_ACTIVE_AGENTS}
									</span>
								</div>
								<p className="text-sm text-muted-foreground mb-4 ml-8">
									ここにいるなかまが熟議に出場します
								</p>

								<div className="grid grid-cols-2 gap-4">
									{activeAgents.map((agent) => (
										<AgentCard
											key={agent.id}
											agent={agent}
											variant="active"
											action={
												<div className="flex gap-2">
													<Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
														<Link to={`/agents/${agent.id}`}>詳細</Link>
													</Button>
													<Button
														variant="outline"
														size="sm"
														className="flex-1 text-xs"
														disabled={isInSession(agent) || statusMutation.isPending}
														onClick={() => handleStatusChange(agent.id, "reserve")}
														title={isInSession(agent) ? "議論参加中は移動できません" : undefined}
													>
														{isInSession(agent) ? "熟議中..." : "小屋へ"}
													</Button>
												</div>
											}
										/>
									))}
									{["slot-1", "slot-2"]
										.slice(0, MAX_ACTIVE_AGENTS - activeAgents.length)
										.map((key) => (
											<Card
												key={key}
												className="border-dashed border-green-300/50 dark:border-green-700/30 h-full flex items-center justify-center bg-green-50/30 dark:bg-green-950/10"
											>
												<CardContent className="text-center py-4">
													<p className="text-2xl mb-1 opacity-30">🌿</p>
													<p className="text-sm text-muted-foreground">空きスロット</p>
													<p className="text-xs text-muted-foreground mt-1">
														小屋からなかまを送り出そう
													</p>
												</CardContent>
											</Card>
										))}
								</div>
							</div>
						</section>

						{/* Reserve Zone - Barn */}
						<section className="py-8 px-4">
							<div className="max-w-3xl mx-auto">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-xl">🏠</span>
									<h2 className="text-xl font-bold">なかま小屋</h2>
									<span className="text-sm text-muted-foreground ml-1">
										{reserveAgents.length}体
									</span>
								</div>
								<p className="text-sm text-muted-foreground mb-4 ml-8">お休み中のなかまたち</p>

								<div className="overflow-x-auto overflow-y-hidden pb-2">
									<div className="flex gap-4 min-w-min">
										{reserveAgents.map((agent) => (
											<div key={agent.id} className="w-40 shrink-0">
												<AgentCard
													agent={agent}
													variant="reserve"
													action={
														<div className="flex gap-1.5">
															<Button
																variant="outline"
																size="sm"
																className="flex-1 text-xs"
																asChild
															>
																<Link to={`/agents/${agent.id}`}>詳細</Link>
															</Button>
															<Button
																variant="default"
																size="sm"
																className="flex-1 text-xs"
																disabled={isActiveSlotFull || statusMutation.isPending}
																onClick={() => handleStatusChange(agent.id, "active")}
																title={
																	isActiveSlotFull ? "放牧エリアに空きがありません" : undefined
																}
															>
																{isActiveSlotFull ? "空きなし" : "放牧"}
															</Button>
														</div>
													}
												/>
											</div>
										))}
										<Link to="/agents/new" className="w-40 shrink-0">
											<Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-dashed h-full flex items-center justify-center hover:border-green-400/50">
												<CardContent className="text-center py-4">
													<p className="text-2xl mb-1">🥚</p>
													<p className="text-xs font-semibold text-muted-foreground">
														新しいなかまを迎える
													</p>
												</CardContent>
											</Card>
										</Link>
									</div>
								</div>
							</div>
						</section>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
