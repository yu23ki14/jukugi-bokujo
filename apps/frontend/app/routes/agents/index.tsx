import { Link } from "react-router";
import { AgentCard } from "../../components/AgentCard";
import { EmptyState, InfoAlert, LoadingState } from "../../components/design-system";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Card, CardContent } from "../../components/ui/card";
import { type AgentSummary, useGetApiAgents } from "../../hooks/backend";

export function meta() {
	return [{ title: "My Agents - Jukugi Bokujo" }];
}

export default function AgentsIndex() {
	const { data: agentsData, isLoading: loading, error } = useGetApiAgents();

	const agentsResponse = !error && agentsData?.data ? agentsData.data : null;
	const agents = agentsResponse && "agents" in agentsResponse ? agentsResponse.agents : [];

	return (
		<ProtectedRoute>
			<div>
				<div className="mb-6">
					<h1 className="text-3xl font-bold">My Agents</h1>
					<p className="text-muted-foreground mt-1">
						{agents.length > 0
							? `${agents.length}体のエージェントを所有中`
							: "エージェントを作って牧場を始めましょう"}
					</p>
				</div>

				{loading && <LoadingState message="Loading agents..." />}

				{error && (
					<InfoAlert variant="error" className="mb-6">
						<p>{error instanceof Error ? error.message : "Failed to load agents"}</p>
					</InfoAlert>
				)}

				{!loading && !error && agents.length === 0 && (
					<EmptyState
						message="まだエージェントがいません"
						description="最初の1体を作成して、熟議に送り出しましょう"
						actionLabel="エージェントを作成する"
						actionTo="/agents/new"
					/>
				)}

				{!loading && !error && agents.length > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{agents.map((agent: AgentSummary) => (
							<AgentCard key={agent.id} agent={agent} />
						))}
						<Link to="/agents/new">
							<Card className="hover:shadow-lg transition-shadow cursor-pointer border-dashed h-full flex items-center justify-center">
								<CardContent className="text-center py-8">
									<p className="text-3xl mb-2">+</p>
									<p className="text-sm font-semibold text-muted-foreground">新規エージェント</p>
								</CardContent>
							</Card>
						</Link>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
