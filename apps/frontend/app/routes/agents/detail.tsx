import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
	BackLink,
	ConfirmDialog,
	EmptyState,
	GradientTitle,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
	getGetApiAgentsQueryKey,
	type PersonaChangeEntry,
	useDeleteApiAgentsId,
	useGetApiAgentsAgentIdPersonaChanges,
	useGetApiAgentsId,
} from "../../hooks/backend";
import type { AgentPersona } from "../../lib/types";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "なかま詳細 - 熟議牧場" }];
}

export default function AgentDetail() {
	const { id } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchParams] = useSearchParams();
	const defaultTab = searchParams.get("tab") === "growth" ? "growth" : "profile";

	const { data: agentData, isLoading: loading, error } = useGetApiAgentsId(id ?? "");
	const deleteAgentMutation = useDeleteApiAgentsId({
		mutation: {
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: getGetApiAgentsQueryKey() });
				const previousAgents = queryClient.getQueryData(getGetApiAgentsQueryKey());
				// biome-ignore lint/suspicious/noExplicitAny: queryClient.setQueryData requires generic type inference for complex API response structure
				queryClient.setQueryData(getGetApiAgentsQueryKey(), (old: any) => {
					if (!old || old.status !== 200) return old;
					return {
						...old,
						data: {
							...old.data,
							agents: (old.data.agents || []).filter(
								// biome-ignore lint/suspicious/noExplicitAny: array filter requires type inference from API response structure
								(agent: any) => agent.id !== variables.id,
							),
						},
					};
				});
				return { previousAgents };
			},
			onError: (_err, _variables, context) => {
				if (context?.previousAgents) {
					queryClient.setQueryData(getGetApiAgentsQueryKey(), context.previousAgents);
				}
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: getGetApiAgentsQueryKey() });
			},
		},
	});

	const agent =
		!error && agentData?.status === 200 && "name" in agentData.data ? agentData.data : null;

	async function handleDelete() {
		if (!id || !agent) return;
		try {
			await deleteAgentMutation.mutateAsync({ id });
			navigate("/agents");
		} catch (err) {
			alert(err instanceof Error ? err.message : "なかまの削除に失敗しました");
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto">
				{loading && <LoadingState message="読み込み中..." />}

				{error && (
					<InfoAlert variant="error">
						<p>{error instanceof Error ? error.message : "なかま情報の読み込みに失敗しました"}</p>
					</InfoAlert>
				)}

				{!loading && !error && agent && (
					<div>
						<BackLink to="/agents" label="牧場に戻る" />

						{/* Agent Profile Header */}
						<div className="text-center mb-8">
							<p className="text-6xl mb-3">🐄</p>
							<GradientTitle className="text-3xl mb-1">{agent.name}</GradientTitle>
							<Badge variant="secondary" className="text-sm">
								Lv.{agent.persona.version}
							</Badge>
						</div>

						<Tabs defaultValue={defaultTab}>
							<TabsList className="w-full mb-6">
								<TabsTrigger value="profile" className="flex-1">
									プロフィール
								</TabsTrigger>
								<TabsTrigger value="growth" className="flex-1">
									成長きろく
								</TabsTrigger>
							</TabsList>

							<TabsContent value="profile">
								{/* Persona Status Card */}
								<Card className="mb-6 overflow-hidden">
									<CardContent className="space-y-4">
										<div>
											<p className="text-xs font-semibold text-muted-foreground mb-1">
												思考スタイル
											</p>
											<p className="text-sm">{agent.persona.thinking_style}</p>
										</div>

										<div>
											<p className="text-xs font-semibold text-muted-foreground mb-1">背景</p>
											<p className="text-sm">{agent.persona.background}</p>
										</div>

										<div>
											<p className="text-xs font-semibold text-muted-foreground mb-1">
												大事にしていること
											</p>
											<div className="flex flex-wrap gap-1.5">
												{agent.persona.core_values.map((value) => (
													<StatusBadge key={value} variant="info">
														{value}
													</StatusBadge>
												))}
											</div>
										</div>

										<div>
											<p className="text-xs font-semibold text-muted-foreground mb-1">性格特性</p>
											<div className="flex flex-wrap gap-1.5">
												{agent.persona.personality_traits.map((trait) => (
													<StatusBadge key={trait} variant="completed">
														{trait}
													</StatusBadge>
												))}
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Action Buttons */}
								<div className="grid grid-cols-2 gap-3 mb-6">
									<ActionCard
										emoji="📚"
										label="知識管理"
										description="知識を与えて育てる"
										to={`/agents/${id}/knowledge`}
									/>
									<ActionCard
										emoji="📜"
										label="議論の履歴"
										description="過去の議論を振り返る"
										to={`/sessions?agent=${id}`}
									/>
								</div>
							</TabsContent>

							<TabsContent value="growth">
								<GrowthHistory agentId={id ?? ""} />
							</TabsContent>
						</Tabs>

						{/* Footer */}
						<div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
							<span>
								牧場入り: {formatDateTime(agent.created_at)} / 最終更新:{" "}
								{formatDateTime(agent.updated_at)}
							</span>
							<ConfirmDialog
								trigger={
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										disabled={deleteAgentMutation.isPending}
									>
										{deleteAgentMutation.isPending ? "お別れ中..." : "お別れする"}
									</Button>
								}
								title="このなかまとお別れしますか？"
								description={`「${agent.name}」を牧場から送り出します。この操作は取り消せません。`}
								confirmLabel="お別れする"
								cancelLabel="やめる"
								onConfirm={handleDelete}
								variant="destructive"
							/>
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}

function ActionCard({
	emoji,
	label,
	description,
	to,
}: {
	emoji: string;
	label: string;
	description: string;
	to: string;
}) {
	return (
		<Link to={to}>
			<Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
				<CardContent className="py-5 text-center">
					<p className="text-2xl mb-2">{emoji}</p>
					<p className="font-bold text-sm">{label}</p>
					<p className="text-xs text-muted-foreground mt-1">{description}</p>
				</CardContent>
			</Card>
		</Link>
	);
}

function GrowthHistory({ agentId }: { agentId: string }) {
	const { data, isLoading } = useGetApiAgentsAgentIdPersonaChanges(agentId);

	if (isLoading) {
		return <LoadingState message="成長きろくを読み込み中..." />;
	}

	const changes: PersonaChangeEntry[] =
		data?.status === 200 && data.data && "persona_changes" in data.data
			? data.data.persona_changes
			: [];

	if (changes.length === 0) {
		return <EmptyState message="まだ成長きろくがありません" description="声をかけると成長します" />;
	}

	return (
		<div className="space-y-4">
			{changes.map((change) => (
				<GrowthHistoryEntry key={change.id} change={change} />
			))}
		</div>
	);
}

function GrowthHistoryEntry({ change }: { change: PersonaChangeEntry }) {
	let before: AgentPersona;
	let after: AgentPersona;
	try {
		before = JSON.parse(change.persona_before) as AgentPersona;
		after = JSON.parse(change.persona_after) as AgentPersona;
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
		<Card>
			<CardContent className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-sm">
						<StatusBadge variant="pending">Lv.{before.version}</StatusBadge>
						<span className="text-muted-foreground">→</span>
						<StatusBadge variant="active">Lv.{after.version}</StatusBadge>
					</div>
					<span className="text-xs text-muted-foreground">{formatDateTime(change.created_at)}</span>
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
			</CardContent>
		</Card>
	);
}
