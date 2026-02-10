import { useState } from "react";
import { Link, useParams } from "react-router";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
	useDeleteApiKnowledgeId,
	useGetApiAgentsAgentIdKnowledge,
	useGetApiAgentsId,
	usePostApiAgentsAgentIdKnowledge,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

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
			alert(err instanceof Error ? err.message : "Failed to add knowledge");
		}
	}

	async function handleDelete(knowledgeId: string) {
		const confirmed = window.confirm("Are you sure you want to delete this knowledge entry?");
		if (!confirmed) return;

		try {
			await deleteKnowledgeMutation.mutateAsync({ id: knowledgeId });
			refetchKnowledge();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete knowledge");
		}
	}

	return (
		<ProtectedRoute>
			<div className="max-w-4xl mx-auto">
				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4">
						<p className="text-red-700">
							{error instanceof Error ? error.message : "Failed to load data"}
						</p>
					</div>
				)}

				{!loading && !error && agent && (
					<div>
						<div className="mb-6">
							<Link to={`/agents/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">
								← Back to {agent.name}
							</Link>
						</div>

						<div className="flex justify-between items-center mb-6">
							<div>
								<h1 className="text-3xl font-bold">Knowledge Base</h1>
								<p className="text-sm text-gray-600 mt-1">{knowledge.length} / 10 slots used</p>
							</div>
							{knowledge.length < 10 && (
								<button
									type="button"
									onClick={() => setShowForm(!showForm)}
									className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
								>
									{showForm ? "Cancel" : "Add Knowledge"}
								</button>
							)}
						</div>

						<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
							<p className="text-blue-800 text-sm">
								Add knowledge entries to help your agent make informed decisions. Max 10 slots.
								Title: 30 chars, Content: 500 chars.
							</p>
						</div>

						{showForm && (
							<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
								<div className="mb-4">
									<label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
										Title
									</label>
									<input
										type="text"
										id="title"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="e.g., Climate Change Facts, Economic Policy Basics"
										maxLength={30}
										disabled={createKnowledgeMutation.isPending}
										required
									/>
								</div>

								<div className="mb-4">
									<label
										htmlFor="content"
										className="block text-sm font-semibold text-gray-700 mb-2"
									>
										Content
									</label>
									<textarea
										id="content"
										value={content}
										onChange={(e) => setContent(e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
										placeholder="Enter detailed knowledge content..."
										maxLength={500}
										disabled={createKnowledgeMutation.isPending}
										required
									/>
									<p className="mt-1 text-xs text-gray-500">{content.length}/500 characters</p>
								</div>

								<div className="flex gap-4">
									<button
										type="submit"
										disabled={createKnowledgeMutation.isPending || !title.trim() || !content.trim()}
										className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
									>
										{createKnowledgeMutation.isPending ? "Adding..." : "Add Knowledge"}
									</button>
									<button
										type="button"
										onClick={() => {
											setShowForm(false);
											setTitle("");
											setContent("");
										}}
										disabled={createKnowledgeMutation.isPending}
										className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 transition"
									>
										Cancel
									</button>
								</div>
							</form>
						)}

						{knowledge.length === 0 ? (
							<div className="text-center py-12 bg-gray-50 rounded-lg">
								<p className="text-gray-600 mb-4">No knowledge entries yet.</p>
								<button
									type="button"
									onClick={() => setShowForm(true)}
									className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
								>
									Add First Knowledge Entry
								</button>
							</div>
						) : (
							<div className="space-y-4">
								{knowledge.map((entry) => (
									<div key={entry.id} className="bg-white rounded-lg shadow p-6">
										<div className="flex justify-between items-start mb-3">
											<h3 className="font-semibold text-lg">{entry.title}</h3>
											<button
												type="button"
												onClick={() => handleDelete(entry.id)}
												className="text-red-600 hover:text-red-800 text-sm"
											>
												Delete
											</button>
										</div>
										<p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
										<p className="mt-3 text-xs text-gray-500">
											Added: {formatDateTime(entry.created_at)}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
