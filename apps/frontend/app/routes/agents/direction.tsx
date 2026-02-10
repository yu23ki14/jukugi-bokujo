import { useState } from "react";
import { useParams } from "react-router";
import {
	BackLink,
	EmptyState,
	FormField,
	InfoAlert,
	LoadingState,
	PageHeader,
	StatusBadge,
} from "~/components/design-system";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
	useGetApiAgentsAgentIdDirections,
	useGetApiAgentsId,
	useGetApiSessionsId,
	usePostApiAgentsAgentIdDirections,
} from "../../hooks/backend";
import { formatDateTime } from "../../utils/date";

export function meta() {
	return [{ title: "Direction - Jukugi Bokujo" }];
}

export default function AgentDirection() {
	const { id } = useParams();

	const {
		data: agentData,
		isLoading: agentLoading,
		error: agentError,
	} = useGetApiAgentsId(id ?? "");

	const agent = !agentError && agentData?.data && "name" in agentData.data ? agentData.data : null;

	// Form state
	const [sessionId, setSessionId] = useState("");
	const [turnNumber, setTurnNumber] = useState(1);
	const [content, setContent] = useState("");

	// Fetch directions filtered by session
	const { data: directionsData, refetch: refetchDirections } = useGetApiAgentsAgentIdDirections(
		id ?? "",
		sessionId ? { session_id: sessionId } : {},
	);

	const directionsResponse = directionsData?.data;
	const directions =
		directionsResponse && "directions" in directionsResponse ? directionsResponse.directions : [];

	// Fetch session info when sessionId is entered
	const { data: sessionData } = useGetApiSessionsId(sessionId, {
		query: { enabled: !!sessionId },
	});
	const session = sessionData?.data && "status" in sessionData.data ? sessionData.data : null;

	const createMutation = usePostApiAgentsAgentIdDirections();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !content.trim() || !sessionId) return;

		try {
			await createMutation.mutateAsync({
				agentId: id,
				data: {
					session_id: sessionId,
					turn_number: turnNumber,
					content: content.trim(),
				},
			});
			setContent("");
			refetchDirections();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to add direction");
		}
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

						<PageHeader title="Direction" />

						<InfoAlert variant="info" title="Direction" className="mb-6">
							<ul className="text-sm space-y-1">
								<li>80 characters max short instruction for each turn</li>
								<li>Influences only the specified turn (volatile)</li>
								<li>Does not affect persona</li>
							</ul>
						</InfoAlert>

						<Card className="mb-8">
							<CardContent>
								<form onSubmit={handleSubmit}>
									<FormField
										label="Session ID"
										name="sessionId"
										value={sessionId}
										onChange={setSessionId}
										placeholder="Enter active session ID..."
										disabled={createMutation.isPending}
										required
										helperText={
											session
												? `Status: ${session.status} | Turn: ${session.current_turn}/${session.max_turns}`
												: undefined
										}
									/>

									<FormField
										label="Turn Number"
										name="turnNumber"
										type="number"
										value={turnNumber}
										onChange={(v) => setTurnNumber(Number(v))}
										min={1}
										max={session?.max_turns ?? 10}
										disabled={createMutation.isPending}
										required
										className="mt-4"
									/>

									<FormField
										label="Direction Content"
										name="content"
										value={content}
										onChange={setContent}
										placeholder="e.g., Focus on economic impact..."
										maxLength={80}
										disabled={createMutation.isPending}
										required
										className="mt-4"
									/>

									<Button
										type="submit"
										disabled={createMutation.isPending || !content.trim() || !sessionId}
										className="mt-4"
									>
										{createMutation.isPending ? "Adding..." : "Add Direction"}
									</Button>
								</form>
							</CardContent>
						</Card>

						<h2 className="text-2xl font-bold mb-4">History</h2>

						{directions.length === 0 ? (
							<EmptyState message="No directions yet." />
						) : (
							<div className="space-y-4">
								{directions.map((d) => (
									<Card key={d.id}>
										<CardContent>
											<div className="flex justify-between items-start mb-3">
												<div className="flex items-center gap-2">
													<StatusBadge variant="direction">Turn {d.turn_number}</StatusBadge>
												</div>
											</div>
											<p className="text-foreground">{d.content}</p>
											<p className="mt-3 text-xs text-muted-foreground">
												Added: {formatDateTime(d.created_at)}
											</p>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
