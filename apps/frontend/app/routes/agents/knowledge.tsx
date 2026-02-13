import { useState } from "react";
import { useParams } from "react-router";
import {
	BackLink,
	ConfirmDialog,
	FormField,
	GradientTitle,
	InfoAlert,
	LoadingState,
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
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");

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

			setTitle("");
			setContent("");
			setShowForm(false);
			refetchKnowledge();
		} catch (err) {
			alert(err instanceof Error ? err.message : "ナレッジの追加に失敗しました");
		}
	}

	async function handleDelete(knowledgeId: string) {
		try {
			await deleteKnowledgeMutation.mutateAsync({ id: knowledgeId });
			refetchKnowledge();
		} catch (err) {
			alert(err instanceof Error ? err.message : "ナレッジの削除に失敗しました");
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
									タイトル30文字、内容500文字まで。ナレッジは議論の質に影響します。
								</p>
							</CardContent>
						</Card>

						{/* Add Button */}
						{knowledge.length < MAX_SLOTS && !showForm && (
							<div className="mb-6">
								<Button className="w-full" size="lg" onClick={() => setShowForm(true)}>
									知識を追加する
								</Button>
							</div>
						)}

						{/* Add Form */}
						{showForm && (
							<Card className="mb-6 overflow-hidden">
								<div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-6 py-3 border-b">
									<p className="text-sm font-bold tracking-wider text-blue-700 dark:text-blue-400">
										新しい知識
									</p>
								</div>
								<CardContent className="pt-4">
									<form onSubmit={handleSubmit}>
										<FormField
											label="タイトル"
											name="title"
											value={title}
											onChange={(v) => setTitle(v)}
											placeholder="例: 気候変動の基礎知識、経済政策の要点"
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
											placeholder="なかまに覚えさせたい知識を入力..."
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
						{knowledge.length === 0 ? (
							<div className="text-center py-12 bg-muted/50 rounded-xl">
								<p className="text-4xl mb-3">📦</p>
								<p className="text-lg font-medium text-foreground mb-2">倉庫はまだ空っぽ</p>
								<p className="text-muted-foreground mb-4">知識を与えて議論力を高めよう!</p>
								<Button onClick={() => setShowForm(true)}>最初の知識を追加</Button>
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
													title="ナレッジを削除"
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
