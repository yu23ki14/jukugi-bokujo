import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	BackLink,
	FormField,
	GradientTitle,
	InfoAlert,
	StatusBadge,
} from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
	type CreateAgentResponse,
	getGetApiAgentsQueryKey,
	usePostApiAgents,
} from "../../hooks/backend";

type Phase = "form" | "generating" | "reveal";

export function meta() {
	return [{ title: "なかまを迎える - 熟議牧場" }];
}

export default function NewAgent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [phase, setPhase] = useState<Phase>("form");
	const [createdAgent, setCreatedAgent] = useState<CreateAgentResponse | null>(null);

	const createAgentMutation = usePostApiAgents({
		mutation: {
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: getGetApiAgentsQueryKey() });
				const previousAgents = queryClient.getQueryData(getGetApiAgentsQueryKey());
				// biome-ignore lint/suspicious/noExplicitAny: queryClient.setQueryData requires generic type inference for complex API response structure
				queryClient.setQueryData(getGetApiAgentsQueryKey(), (old: any) => {
					if (!old || old.status !== 200) return old;
					const optimisticAgent = {
						id: `temp-${Date.now()}`,
						name: variables.data.name,
						created_at: Math.floor(Date.now() / 1000),
						updated_at: Math.floor(Date.now() / 1000),
						persona: {
							version: 0,
							core_values: [],
							thinking_style: "",
							personality_traits: [],
							background: "",
						},
					};
					return {
						...old,
						data: {
							...old.data,
							agents: [...(old.data.agents || []), optimisticAgent],
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

	useEffect(() => {
		if (phase === "reveal" && createdAgent) {
			const timer = setTimeout(() => {
				navigate(`/agents/${createdAgent.id}`);
			}, 2500);
			return () => clearTimeout(timer);
		}
	}, [phase, createdAgent, navigate]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) {
			setError("なかまの名前を入力してください");
			return;
		}
		try {
			setError(null);
			setPhase("generating");
			const response = await createAgentMutation.mutateAsync({ data: { name: name.trim() } });
			if (response.data && "id" in response.data) {
				setCreatedAgent(response.data);
				setPhase("reveal");
			}
		} catch (err) {
			setPhase("form");
			setError(err instanceof Error ? err.message : "なかまの作成に失敗しました");
		}
	}

	if (phase === "generating") {
		return (
			<ProtectedRoute>
				<style>
					{`@keyframes egg-wobble {
						0%, 100% { transform: rotate(0deg); }
						25% { transform: rotate(-8deg); }
						75% { transform: rotate(8deg); }
					}`}
				</style>
				<div className="flex items-center justify-center min-h-[60vh]">
					<Card className="w-full max-w-md">
						<CardContent className="text-center py-16">
							<p
								className="text-6xl mb-6"
								style={{ animation: "egg-wobble 0.5s ease-in-out infinite" }}
							>
								🥚
							</p>
							<p className="text-xl font-bold mb-2">性格を考え中...</p>
							<p className="text-muted-foreground">AIが「{name}」の性格を考えています</p>
							<div className="flex justify-center gap-1 mt-4">
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className="w-2 h-2 rounded-full bg-primary animate-bounce"
										style={{ animationDelay: `${i * 0.15}s` }}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</ProtectedRoute>
		);
	}

	if (phase === "reveal" && createdAgent) {
		const { persona } = createdAgent;
		return (
			<ProtectedRoute>
				<style>
					{`@keyframes hatch {
						0% { transform: scale(0.3); opacity: 0; }
						50% { transform: scale(1.05); }
						100% { transform: scale(1); opacity: 1; }
					}
					@keyframes sparkle {
						0%, 100% { opacity: 0; transform: scale(0.5); }
						50% { opacity: 1; transform: scale(1); }
					}`}
				</style>
				<div className="flex items-center justify-center min-h-[60vh]">
					<Card className="w-full max-w-md" style={{ animation: "hatch 0.6s ease-out" }}>
						<CardContent className="py-10">
							<div className="text-center mb-6 relative">
								<div className="absolute -top-2 left-1/4">
									<span
										className="text-lg"
										style={{ animation: "sparkle 1s ease-in-out infinite" }}
									>
										✨
									</span>
								</div>
								<div className="absolute -top-2 right-1/4">
									<span
										className="text-lg"
										style={{
											animation: "sparkle 1s ease-in-out infinite 0.3s",
										}}
									>
										✨
									</span>
								</div>
								<p className="text-6xl mb-4">🐄</p>
								<GradientTitle as="p" className="text-2xl">
									{createdAgent.name}
								</GradientTitle>
								<p className="text-lg text-muted-foreground">が牧場にやってきた!</p>
							</div>

							<div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
								{persona.thinking_style && (
									<div>
										<p className="text-xs font-semibold text-muted-foreground mb-1">思考スタイル</p>
										<p className="text-sm">{persona.thinking_style}</p>
									</div>
								)}
								{persona.core_values.length > 0 && (
									<div>
										<p className="text-xs font-semibold text-muted-foreground mb-1">
											大事にしていること
										</p>
										<div className="flex flex-wrap gap-1.5">
											{persona.core_values.map((v) => (
												<StatusBadge key={v} variant="info">
													{v}
												</StatusBadge>
											))}
										</div>
									</div>
								)}
								{persona.personality_traits.length > 0 && (
									<div>
										<p className="text-xs font-semibold text-muted-foreground mb-1">性格特性</p>
										<div className="flex flex-wrap gap-1.5">
											{persona.personality_traits.map((t) => (
												<StatusBadge key={t} variant="completed">
													{t}
												</StatusBadge>
											))}
										</div>
									</div>
								)}
							</div>

							<p className="text-center text-sm text-muted-foreground mt-6">
								知識と方向性を与えて育てていこう!
							</p>
						</CardContent>
					</Card>
				</div>
			</ProtectedRoute>
		);
	}

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto">
				<BackLink to="/agents" label="牧場に戻る" />

				{/* Header */}
				<div className="text-center mb-8">
					<p className="text-5xl mb-3">🥚</p>
					<GradientTitle className="text-3xl mb-2">新しいなかまを迎える</GradientTitle>
					<p className="text-muted-foreground">
						名前を決めると、AIが独自の性格を考えます
						<br />
						どんな性格のなかまが来るかはお楽しみ!
					</p>
				</div>

				<Card>
					<CardContent>
						<form onSubmit={handleSubmit}>
							<FormField
								label="なまえ"
								name="name"
								value={name}
								onChange={(v) => setName(v)}
								placeholder="例: 環境活動家タロウ、テクノロジー推進派..."
								maxLength={20}
								disabled={createAgentMutation.isPending}
								helperText="名前がなかまの性格に影響します"
							/>

							{error && (
								<InfoAlert variant="error" className="mt-6">
									<p>{error}</p>
								</InfoAlert>
							)}

							<div className="flex gap-4 mt-6">
								<Button
									type="submit"
									size="lg"
									disabled={createAgentMutation.isPending || !name.trim()}
									className="flex-1"
								>
									なかまを生み出す
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="lg"
									onClick={() => navigate("/agents")}
									disabled={createAgentMutation.isPending}
								>
									やめる
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</ProtectedRoute>
	);
}
