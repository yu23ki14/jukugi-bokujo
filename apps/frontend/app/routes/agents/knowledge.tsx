import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
	BackLink,
	ConfirmDialog,
	FormField,
	GradientTitle,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
	useDeleteApiKnowledgeId,
	useGetApiAgentsAgentIdKnowledge,
	useGetApiAgentsId,
	usePostApiAgentsAgentIdKnowledge,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

const MAX_SLOTS = 10;
const SLOT_KEYS = Array.from({ length: MAX_SLOTS }, (_, i) => `gauge-${i}`);

type KnowledgeCategory = "experience" | "data" | "opinion";

const CATEGORIES: { value: KnowledgeCategory; label: string; emoji: string }[] = [
	{ value: "experience", label: "体験・経験", emoji: "💬" },
	{ value: "data", label: "データ・事実", emoji: "📊" },
	{ value: "opinion", label: "意見・主張", emoji: "💡" },
];

const CATEGORY_HINTS: Record<
	KnowledgeCategory,
	{ titlePlaceholder: string; contentPlaceholder: string; examples: string[] }
> = {
	experience: {
		titlePlaceholder: "例: うちの町の交通事情",
		contentPlaceholder:
			"あなたの体験や身近なエピソードを教えてください...\n\n例: うちの町ではバスが1日3本しかなくて、高齢者が病院に行くのも大変です。",
		examples: ["地元で感じたこと", "仕事で経験したこと", "子育てで気づいたこと"],
	},
	data: {
		titlePlaceholder: "例: 地方バス路線の現状",
		contentPlaceholder:
			"数字や事実、調査結果などを教えてください...\n\n例: 国土交通省の調査によると、地方のバス路線の約4割が赤字で、過去10年で約1万kmの路線が廃止されています。",
		examples: ["ニュースで見た統計", "調査レポートの内容", "公式データ"],
	},
	opinion: {
		titlePlaceholder: "例: 公共交通の未来について",
		contentPlaceholder:
			"あなたの考えや主張を教えてください...\n\n例: 私は地方の公共交通はオンデマンド型に切り替えるべきだと思います。定時運行にこだわるより、必要な時に呼べる仕組みのほうが効率的です。",
		examples: ["こうすべきだと思うこと", "賛成・反対の理由", "提案したいアイデア"],
	},
};

export function meta() {
	return [{ title: "知識倉庫 - 熟議牧場" }];
}

export default function AgentKnowledge() {
	const { id } = useParams();

	// Fetch agent and knowledge data
	const {
		data: agentData,
		isLoading: agentLoading,
		error: agentError,
	} = useGetApiAgentsId(id ?? "");
	const {
		data: knowledgeData,
		isLoading: knowledgeLoading,
		error: knowledgeError,
		refetch: refetchKnowledge,
	} = useGetApiAgentsAgentIdKnowledge(id ?? "");

	const createKnowledgeMutation = usePostApiAgentsAgentIdKnowledge();
	const deleteKnowledgeMutation = useDeleteApiKnowledgeId();

	// Extract data with type narrowing
	const agent = !agentError && agentData?.data && "name" in agentData.data ? agentData.data : null;
	const knowledgeResponse = !knowledgeError && knowledgeData?.data ? knowledgeData.data : null;
	const knowledge =
		knowledgeResponse && "knowledge" in knowledgeResponse ? knowledgeResponse.knowledge : [];

	const loading = agentLoading || knowledgeLoading;
	const error = agentError || knowledgeError;

	// Form state
	const [showForm, setShowForm] = useState(false);
	const [category, setCategory] = useState<KnowledgeCategory | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [addedEffect, setAddedEffect] = useState<string | null>(null);

	// Clear effect after animation
	useEffect(() => {
		if (addedEffect) {
			const timer = setTimeout(() => setAddedEffect(null), 2500);
			return () => clearTimeout(timer);
		}
	}, [addedEffect]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		if (!id || !title.trim() || !content.trim()) {
			return;
		}

		try {
			await createKnowledgeMutation.mutateAsync({
				agentId: id,
				data: {
					title: title.trim(),
					content: content.trim(),
				},
			});

			const newCount = knowledge.length + 1;
			setAddedEffect(`知識 ${newCount}/${MAX_SLOTS} — 議論力アップ!`);
			setTitle("");
			setContent("");
			setCategory(null);
			setShowForm(false);
			refetchKnowledge();
		} catch (err) {
			alert(err instanceof Error ? err.message : "知識の追加に失敗しました");
		}
	}

	function openFormWithCategory(cat: KnowledgeCategory) {
		setCategory(cat);
		setShowForm(true);
	}

	const hints = category ? CATEGORY_HINTS[category] : null;

	async function handleDelete(knowledgeId: string) {
		try {
			await deleteKnowledgeMutation.mutateAsync({ id: knowledgeId });
			refetchKnowledge();
		} catch (err) {
			alert(err instanceof Error ? err.message : "知識の削除に失敗しました");
		}
	}

	const emptySlots = MAX_SLOTS - knowledge.length;

	return (
		<ProtectedRoute>
			<div className="max-w-2xl mx-auto">
				{loading && <LoadingState message="知識倉庫を読み込み中..." />}

				{error && (
					<InfoAlert variant="error">
						<p>{error instanceof Error ? error.message : "データの読み込みに失敗しました"}</p>
					</InfoAlert>
				)}

				{!loading && !error && agent && (
					<div>
						<BackLink to={`/agents/${id}`} label={agent.name} />

						{/* Header */}
						<div className="text-center mb-8">
							<p className="text-5xl mb-3">📚</p>
							<GradientTitle colorScheme="blue" className="text-3xl mb-2">
								知識倉庫
							</GradientTitle>
							<p className="text-muted-foreground">{agent.name} に知識を与えて議論力を高めよう</p>
						</div>

						{/* Slot Gauge */}
						<Card className="mb-6 overflow-hidden">
							<div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-6 py-3 border-b">
								<div className="flex items-center justify-between">
									<p className="text-sm font-bold tracking-wider text-blue-700 dark:text-blue-400">
										倉庫容量
									</p>
									<p className="text-sm font-bold text-blue-700 dark:text-blue-400">
										{knowledge.length} / {MAX_SLOTS}
									</p>
								</div>
							</div>
							<CardContent className="py-4">
								<div className="flex gap-1.5">
									{SLOT_KEYS.map((key, i) => (
										<div
											key={key}
											className={`h-3 flex-1 rounded-full transition-colors ${
												i < knowledge.length
													? "bg-gradient-to-r from-blue-500 to-cyan-500"
													: "bg-muted"
											}`}
										/>
									))}
								</div>
								<p className="text-xs text-muted-foreground mt-3">
									タイトル30文字、内容500文字まで。知識は議論の質に影響します。
								</p>
							</CardContent>
						</Card>

						{/* Effect toast */}
						{addedEffect && (
							<div className="mb-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
								<Card className="inline-block border-green-400/50 bg-green-50 dark:bg-green-950/30">
									<CardContent className="py-3 px-6">
										<p className="text-sm font-bold text-green-700 dark:text-green-400">
											{addedEffect}
										</p>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Category Selection */}
						{knowledge.length < MAX_SLOTS && !showForm && (
							<div className="mb-6">
								<p className="text-sm font-medium mb-3">どんな知識を教える?</p>
								<div className="grid grid-cols-3 gap-3">
									{CATEGORIES.map((cat) => (
										<button
											key={cat.value}
											type="button"
											onClick={() => openFormWithCategory(cat.value)}
											className="border rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
										>
											<p className="text-2xl mb-1">{cat.emoji}</p>
											<p className="text-sm font-semibold">{cat.label}</p>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Add Form */}
						{showForm && (
							<Card className="mb-6 overflow-hidden">
								<div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-6 py-3 border-b">
									<div className="flex items-center justify-between">
										<p className="text-sm font-bold tracking-wider text-blue-700 dark:text-blue-400">
											新しい知識
										</p>
										{category && (
											<StatusBadge variant="info">
												{CATEGORIES.find((c) => c.value === category)?.emoji}{" "}
												{CATEGORIES.find((c) => c.value === category)?.label}
											</StatusBadge>
										)}
									</div>
								</div>
								<CardContent className="pt-4">
									{/* Category switcher */}
									{!category && (
										<div className="mb-4">
											<p className="text-sm text-muted-foreground mb-2">
												カテゴリを選ぶと書きやすくなります
											</p>
											<div className="flex gap-2">
												{CATEGORIES.map((cat) => (
													<Button
														key={cat.value}
														type="button"
														variant="outline"
														size="sm"
														onClick={() => setCategory(cat.value)}
													>
														{cat.emoji} {cat.label}
													</Button>
												))}
											</div>
										</div>
									)}

									{/* Hint examples */}
									{hints && (
										<div className="mb-4 p-3 bg-muted/50 rounded-md">
											<p className="text-xs font-semibold text-muted-foreground mb-1">
												こんなことを書いてみよう
											</p>
											<div className="flex flex-wrap gap-1.5">
												{hints.examples.map((ex) => (
													<span
														key={ex}
														className="text-xs bg-background border rounded-full px-2.5 py-0.5 text-muted-foreground"
													>
														{ex}
													</span>
												))}
											</div>
										</div>
									)}

									<form onSubmit={handleSubmit}>
										<FormField
											label="タイトル"
											name="title"
											value={title}
											onChange={(v) => setTitle(v)}
											placeholder={
												hints?.titlePlaceholder || "例: うちの町のこと、最近気になったニュース"
											}
											maxLength={30}
											disabled={createKnowledgeMutation.isPending}
											required
										/>

										<FormField
											label="内容"
											name="content"
											type="textarea"
											value={content}
											onChange={(v) => setContent(v)}
											placeholder={hints?.contentPlaceholder || "なかまに覚えさせたい知識を入力..."}
											maxLength={500}
											disabled={createKnowledgeMutation.isPending}
											required
											rows={5}
											className="mt-4"
										/>

										<div className="flex gap-4 mt-4">
											<Button
												type="submit"
												disabled={
													createKnowledgeMutation.isPending || !title.trim() || !content.trim()
												}
											>
												{createKnowledgeMutation.isPending ? "追加中..." : "知識を追加"}
											</Button>
											<Button
												type="button"
												variant="secondary"
												onClick={() => {
													setShowForm(false);
													setCategory(null);
													setTitle("");
													setContent("");
												}}
												disabled={createKnowledgeMutation.isPending}
											>
												キャンセル
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						)}

						{/* Knowledge List */}
						{knowledge.length === 0 && !showForm ? (
							<div className="text-center py-12 bg-muted/50 rounded-xl">
								<p className="text-4xl mb-3">📦</p>
								<p className="text-lg font-medium text-foreground mb-2">倉庫はまだ空っぽ</p>
								<p className="text-muted-foreground mb-4">知識を与えて議論力を高めよう!</p>
								<div className="flex justify-center gap-2">
									{CATEGORIES.map((cat) => (
										<Button
											key={cat.value}
											variant="outline"
											onClick={() => openFormWithCategory(cat.value)}
										>
											{cat.emoji} {cat.label}
										</Button>
									))}
								</div>
							</div>
						) : (
							<div className="space-y-3">
								{knowledge.map((entry, index) => (
									<Card
										key={entry.id}
										className="hover:shadow-md transition-shadow overflow-hidden"
									>
										<CardContent className="py-4">
											<div className="flex justify-between items-start mb-2">
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full w-6 h-6 flex items-center justify-center">
														{index + 1}
													</span>
													<h3 className="font-semibold">{entry.title}</h3>
												</div>
												<ConfirmDialog
													trigger={
														<Button
															variant="ghost"
															size="sm"
															className="text-destructive hover:text-destructive"
														>
															削除
														</Button>
													}
													title="知識を削除"
													description={`「${entry.title}」を削除しますか？この操作は取り消せません。`}
													confirmLabel="削除"
													cancelLabel="やめる"
													onConfirm={() => handleDelete(entry.id)}
													variant="destructive"
												/>
											</div>
											<p className="text-foreground whitespace-pre-wrap text-sm">{entry.content}</p>
											<p className="mt-3 text-xs text-muted-foreground">
												追加: {formatDateTime(entry.created_at)}
											</p>
										</CardContent>
									</Card>
								))}

								{/* Empty Slot Indicators */}
								{emptySlots > 0 && (
									<button
										type="button"
										className="w-full border border-dashed rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:border-blue-400/50 transition-colors"
										onClick={() => setShowForm(true)}
									>
										<p className="text-sm">残り {emptySlots} スロット空き</p>
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
