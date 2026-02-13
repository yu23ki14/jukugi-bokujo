import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	BackLink,
	FormField,
	GradientTitle,
	InfoAlert,
	ProgressBar,
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
import { cn } from "../../lib/utils";

const AGENT_VALUE_OPTIONS = [
	{ label: "公平", emoji: "⚖️" },
	{ label: "共感", emoji: "💞" },
	{ label: "平和", emoji: "☮️" },
	{ label: "多様性", emoji: "🌈" },
	{ label: "思いやり", emoji: "🫶" },
	{ label: "感謝", emoji: "🙏" },
	{ label: "誠実", emoji: "💎" },
	{ label: "希望", emoji: "🌟" },
	{ label: "効率", emoji: "⚡" },
	{ label: "伝統", emoji: "🏯" },
	{ label: "自由", emoji: "🕊️" },
	{ label: "好奇心", emoji: "🔍" },
	{ label: "忍耐", emoji: "🪨" },
	{ label: "自立", emoji: "🧍" },
	{ label: "挑戦", emoji: "🔥" },
	{ label: "冷静", emoji: "🧊" },
	{ label: "本音主義", emoji: "🎭" },
	{ label: "損得勘定", emoji: "💰" },
	{ label: "負けず嫌い", emoji: "🔥" },
	{ label: "疑い深さ", emoji: "🔮" },
	{ label: "皮肉屋", emoji: "🃏" },
	{ label: "野心", emoji: "🦊" },
	{ label: "頑固", emoji: "🧱" },
	{ label: "毒舌", emoji: "👅" },
] as const;

const REQUIRED_VALUES_COUNT = 3;

type Phase = "form" | "values" | "generating" | "reveal";

export function meta() {
	return [{ title: "なかまを迎える - 熟議牧場" }];
}

export default function NewAgent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [selectedValues, setSelectedValues] = useState<string[]>([]);
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

	function handleNameSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) {
			setError("なかまの名前を入力してください");
			return;
		}
		setError(null);
		setPhase("values");
	}

	function toggleValue(value: string) {
		setSelectedValues((prev) => {
			if (prev.includes(value)) {
				return prev.filter((v) => v !== value);
			}
			if (prev.length >= REQUIRED_VALUES_COUNT) {
				return prev;
			}
			return [...prev, value];
		});
	}

	async function handleValuesSubmit() {
		if (selectedValues.length !== REQUIRED_VALUES_COUNT) return;
		try {
			setError(null);
			setPhase("generating");
			const response = await createAgentMutation.mutateAsync({
				data: { name: name.trim(), values: selectedValues },
			});
			if (response.data && "id" in response.data) {
				setCreatedAgent(response.data);
				setPhase("reveal");
			}
		} catch (err) {
			setPhase("values");
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

							<p className="text-center text-sm text-muted-foreground mb-4">
								あなたの気持ち、ちゃんと届いたみたい!
							</p>

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
												<StatusBadge
													key={v}
													variant={selectedValues.includes(v) ? "direction" : "info"}
												>
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

	if (phase === "values") {
		return (
			<ProtectedRoute>
				<div className="max-w-2xl mx-auto">
					<BackLink to="/agents" label="牧場に戻る" />

					<div className="text-center mb-8">
						<p className="text-5xl mb-3">💭</p>
						<GradientTitle className="text-3xl mb-2">大切にしていること</GradientTitle>
						<p className="text-muted-foreground">
							「{name}」に大切にしてほしいことを{REQUIRED_VALUES_COUNT}つ選んでね
						</p>
					</div>

					<Card>
						<CardContent>
							<div className="mb-4">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-medium">
										{selectedValues.length} / {REQUIRED_VALUES_COUNT}
									</p>
								</div>
								<ProgressBar
									value={selectedValues.length}
									max={REQUIRED_VALUES_COUNT}
									colorScheme="green"
									size="sm"
								/>
							</div>

							<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
								{AGENT_VALUE_OPTIONS.map(({ label, emoji }) => {
									const isSelected = selectedValues.includes(label);
									const isDisabled = !isSelected && selectedValues.length >= REQUIRED_VALUES_COUNT;
									return (
										<Button
											key={label}
											type="button"
											variant={isSelected ? "default" : "outline"}
											className={cn("h-auto py-3 text-base", isDisabled && "opacity-50")}
											disabled={isDisabled}
											onClick={() => toggleValue(label)}
										>
											{emoji} {label}
										</Button>
									);
								})}
							</div>

							{error && (
								<InfoAlert variant="error" className="mb-4">
									<p>{error}</p>
								</InfoAlert>
							)}

							<div className="flex gap-4">
								<Button
									type="button"
									size="lg"
									disabled={
										selectedValues.length !== REQUIRED_VALUES_COUNT || createAgentMutation.isPending
									}
									className="flex-1"
									onClick={handleValuesSubmit}
								>
									この子に教える!
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="lg"
									onClick={() => {
										setPhase("form");
										setSelectedValues([]);
										setError(null);
									}}
									disabled={createAgentMutation.isPending}
								>
									もどる
								</Button>
							</div>
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
						名前を決めて、大切にしてほしいことを選びましょう
						<br />
						あなたの気持ちを知っているなかまが生まれます
					</p>
				</div>

				<Card>
					<CardContent>
						<form onSubmit={handleNameSubmit}>
							<FormField
								label="なまえ"
								name="name"
								value={name}
								onChange={(v) => setName(v)}
								placeholder="例: オードリー・タン2号、大阪のおばちゃん..."
								maxLength={20}
								helperText="名前がなかまの性格に影響します"
							/>

							{error && (
								<InfoAlert variant="error" className="mt-6">
									<p>{error}</p>
								</InfoAlert>
							)}

							<div className="flex gap-4 mt-6">
								<Button type="submit" size="lg" disabled={!name.trim()} className="flex-1">
									つぎへ
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="lg"
									onClick={() => navigate("/agents")}
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
