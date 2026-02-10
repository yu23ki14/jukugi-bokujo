import { useState } from "react";
import { useParams } from "react-router";
import {
	BackLink,
	EmptyState,
	FormField,
	InfoAlert,
	LoadingState,
	StatusBadge,
} from "~/components/design-system";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
	useGetApiAgentsAgentIdFeedbacks,
	useGetApiAgentsAgentIdStrategies,
	useGetApiAgentsId,
	usePostApiAgentsAgentIdFeedbacks,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Feedback - Jukugi Bokujo" }];
}

export default function AgentFeedback() {
	const { id } = useParams();

	const {
		data: agentData,
		isLoading: agentLoading,
		error: agentError,
	} = useGetApiAgentsId(id ?? "");

	const agent = !agentError && agentData?.data && "name" in agentData.data ? agentData.data : null;

	// Feedbacks
	const { data: feedbacksData, refetch: refetchFeedbacks } = useGetApiAgentsAgentIdFeedbacks(
		id ?? "",
	);

	const feedbacksResponse = feedbacksData?.data;
	const feedbacks =
		feedbacksResponse && "feedbacks" in feedbacksResponse ? feedbacksResponse.feedbacks : [];

	// Strategies
	const { data: strategiesData } = useGetApiAgentsAgentIdStrategies(id ?? "");

	const strategiesResponse = strategiesData?.data;
	const strategies =
		strategiesResponse && "strategies" in strategiesResponse ? strategiesResponse.strategies : [];

	const createMutation = usePostApiAgentsAgentIdFeedbacks();

	// Form state
	const [sessionId, setSessionId] = useState("");
	const [content, setContent] = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !content.trim() || !sessionId) return;

		try {
			await createMutation.mutateAsync({
				agentId: id,
				data: {
					session_id: sessionId,
					content: content.trim(),
				},
			});
			setContent("");
			setSessionId("");
			refetchFeedbacks();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to add feedback");
		}
	}

	// Find strategy for a given session
	function getStrategyForSession(sid: string) {
		return strategies.find((s) => s.session_id === sid);
	}

	return (
		<ProtectedRoute>
			<div className="max-w-4xl mx-auto">
				{agentLoading && <LoadingState message="Loading..." />}

				{agentError && (
					<InfoAlert variant="error">
						{agentError instanceof Error ? agentError.message : "Failed to load data"}
					</InfoAlert>
				)}

				{!agentLoading && !agentError && agent && (
					<div>
						<BackLink to={`/agents/${id}`} label={`Back to ${agent.name}`} />

						<h1 className="text-3xl font-bold mb-6">Feedback</h1>

						<InfoAlert variant="feedback" title="Post-Session Feedback" className="mb-6">
							<ul className="text-sm space-y-1">
								<li>400 characters max reflection after a completed session</li>
								<li>One feedback per session</li>
								<li>Used to evolve the agent's persona</li>
								<li>Agent creates a strategy from your feedback for the next session</li>
							</ul>
						</InfoAlert>

						<Card className="mb-8">
							<CardContent>
								<form onSubmit={handleSubmit}>
									<FormField
										label="Completed Session ID"
										name="sessionId"
										value={sessionId}
										onChange={setSessionId}
										placeholder="Enter completed session ID..."
										disabled={createMutation.isPending}
										required
									/>

									<FormField
										label="Feedback"
										name="content"
										type="textarea"
										value={content}
										onChange={setContent}
										placeholder="e.g., The discussion on environmental policy was good, but next time consider economic trade-offs more carefully..."
										maxLength={400}
										disabled={createMutation.isPending}
										required
										className="mt-4"
									/>

									<Button
										type="submit"
										disabled={createMutation.isPending || !content.trim() || !sessionId}
										className="mt-4"
									>
										{createMutation.isPending ? "Adding..." : "Submit Feedback"}
									</Button>
								</form>
							</CardContent>
						</Card>

						<h2 className="text-2xl font-bold mb-4">History</h2>

						{feedbacks.length === 0 ? (
							<EmptyState message="No feedback yet." />
						) : (
							<div className="space-y-4">
								{feedbacks.map((f) => {
									const strategy = getStrategyForSession(f.session_id);
									return (
										<Card key={f.id}>
											<CardContent>
												<div className="flex justify-between items-start mb-3">
													<div className="flex items-center gap-2">
														<StatusBadge variant="feedback">Feedback</StatusBadge>
														{f.applied_at ? (
															<StatusBadge variant="completed">Applied</StatusBadge>
														) : (
															<StatusBadge variant="pending">Pending</StatusBadge>
														)}
													</div>
												</div>
												<p className="text-foreground whitespace-pre-wrap">{f.content}</p>
												<div className="mt-3 text-xs text-muted-foreground">
													<p>Added: {formatDateTime(f.created_at)}</p>
													{f.applied_at && <p>Applied: {formatDateTime(f.applied_at)}</p>}
												</div>

												{strategy && (
													<InfoAlert
														variant="strategy"
														title="Agent's Strategy (generated from this feedback)"
														className="mt-4"
													>
														<p className="text-sm">{strategy.strategy}</p>
													</InfoAlert>
												)}
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
