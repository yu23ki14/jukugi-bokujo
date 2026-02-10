import { useState } from "react";
import { useParams } from "react-router";
import {
	BackLink,
	ConfirmDialog,
	EmptyState,
	FormField,
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

export function meta() {
	return [{ title: "Agent Knowledge - Jukugi Bokujo" }];
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
				{loading && <LoadingState message="ナレッジを読み込み中..." />}

				{error && (
					<InfoAlert variant="error">
						<p>{error instanceof Error ? error.message : "データの読み込みに失敗しました"}</p>
					</InfoAlert>
				)}

				{!loading && !error && agent && (
					<div>
						<BackLink to={`/agents/${id}`} label={agent.name} />

						{/* Header */}
						<div className="text-center mb-6">
							<p className="text-5xl mb-3">📚</p>
							<h1 className="text-2xl font-bold mb-1">ナレッジベース</h1>
							<p className="text-muted-foreground">{agent.name} に知識を与えて議論力を高めよう</p>
						</div>

						{/* Slot Indicator */}
						<Card className="mb-6">
							<CardContent className="py-4">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-semibold">スロット使用状況</p>
									<p className="text-sm text-muted-foreground">
										{knowledge.length} / {MAX_SLOTS}
									</p>
								</div>
								<div className="flex gap-1.5">
									{Array.from({ length: MAX_SLOTS }).map((_, i) => (
										<div
											key={`slot-${i}`}
											className={`h-2 flex-1 rounded-full ${
												i < knowledge.length ? "bg-primary" : "bg-muted"
											}`}
										/>
									))}
								</div>
								<p className="text-xs text-muted-foreground mt-2">
									タイトル30文字、内容500文字まで。ナレッジはエージェントの議論に反映されます。
								</p>
							</CardContent>
						</Card>

						{/* Add Button */}
						{knowledge.length < MAX_SLOTS && !showForm && (
							<div className="mb-6">
								<Button className="w-full" size="lg" onClick={() => setShowForm(true)}>
									ナレッジを追加する
								</Button>
							</div>
						)}

						{/* Add Form */}
						{showForm && (
							<Card className="mb-6">
								<CardContent>
									<p className="font-semibold mb-4">新しいナレッジ</p>
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
											placeholder="エージェントに覚えさせたい知識を入力..."
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
												{createKnowledgeMutation.isPending ? "追加中..." : "ナレッジを追加"}
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
							<EmptyState
								message="まだナレッジがありません。知識を与えて育てましょう！"
								actionLabel="最初のナレッジを追加"
								onAction={() => setShowForm(true)}
							/>
						) : (
							<div className="space-y-4">
								{knowledge.map((entry) => (
									<Card key={entry.id}>
										<CardContent>
											<div className="flex justify-between items-start mb-3">
												<h3 className="font-semibold text-lg">{entry.title}</h3>
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
													cancelLabel="キャンセル"
													onConfirm={() => handleDelete(entry.id)}
													variant="destructive"
												/>
											</div>
											<p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
											<p className="mt-3 text-xs text-muted-foreground">
												追加: {formatDateTime(entry.created_at)}
											</p>
										</CardContent>
									</Card>
								))}

								{/* Empty Slot Indicators */}
								{emptySlots > 0 && (
									<div
										className="border border-dashed rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
										onClick={() => setShowForm(true)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") setShowForm(true);
										}}
										role="button"
										tabIndex={0}
									>
										<p className="text-sm">残り {emptySlots} スロット空き</p>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
