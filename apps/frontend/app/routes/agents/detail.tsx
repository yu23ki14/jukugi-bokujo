import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import {
	BackLink,
	ConfirmDialog,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
	getGetApiAgentsQueryKey,
	useDeleteApiAgentsId,
	useGetApiAgentsId,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Agent Detail - Jukugi Bokujo" }];
}

export default function AgentDetail() {
	const { id } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

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
			alert(err instanceof Error ? err.message : "Failed to delete agent");
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto">
				{loading && <LoadingState message="Loading agent..." />}

				{error && (
					<InfoAlert variant="error">
						<p>{error instanceof Error ? error.message : "Failed to load agent"}</p>
					</InfoAlert>
				)}

				{!loading && !error && agent && (
					<div>
						<BackLink to="/agents" label="My Agents" />

						{/* Agent Header */}
						<div className="text-center mb-6">
							<p className="text-5xl mb-3">🐄</p>
							<h1 className="text-3xl font-bold mb-1">{agent.name}</h1>
							<Badge variant="secondary">v{agent.persona.version}</Badge>
						</div>

						{/* Persona Profile */}
						<Card className="mb-6">
							<CardContent className="space-y-4">
								<div>
									<p className="text-xs font-semibold text-muted-foreground mb-1">思考スタイル</p>
									<p className="text-sm">{agent.persona.thinking_style}</p>
								</div>

								<div>
									<p className="text-xs font-semibold text-muted-foreground mb-1">背景</p>
									<p className="text-sm">{agent.persona.background}</p>
								</div>

								<div>
									<p className="text-xs font-semibold text-muted-foreground mb-1">コアバリュー</p>
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

						{/* Actions */}
						<div className="flex gap-3 mb-6">
							<Button asChild className="flex-1">
								<Link to={`/agents/${id}/knowledge`}>ナレッジを管理</Link>
							</Button>
							<Button variant="outline" asChild className="flex-1">
								<Link to={`/sessions?agent=${id}`}>セッション履歴</Link>
							</Button>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>
								作成: {formatDateTime(agent.created_at)} / 更新: {formatDateTime(agent.updated_at)}
							</span>
							<ConfirmDialog
								trigger={
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										disabled={deleteAgentMutation.isPending}
									>
										{deleteAgentMutation.isPending ? "削除中..." : "エージェントを削除"}
									</Button>
								}
								title="エージェントを削除"
								description={`「${agent.name}」を削除しますか？この操作は取り消せません。`}
								confirmLabel="削除"
								cancelLabel="キャンセル"
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
