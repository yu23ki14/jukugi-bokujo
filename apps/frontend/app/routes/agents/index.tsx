import { Link } from "react-router";
import { AgentCard } from "../../components/AgentCard";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { type AgentSummary, useGetApiAgents } from "../../hooks/backend";

export function meta() {
	return [{ title: "My Agents - Jukugi Bokujo" }];
}

export default function AgentsIndex() {
	const { data: agentsData, isLoading: loading, error } = useGetApiAgents();

	// Extract agents safely
	const agentsResponse = !error && agentsData?.data ? agentsData.data : null;
	const agents = agentsResponse && "agents" in agentsResponse ? agentsResponse.agents : [];

	return (
		<ProtectedRoute>
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold">My Agents</h1>
					<Link
						to="/agents/new"
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
					>
						Create New Agent
					</Link>
				</div>

				{loading && (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading agents...</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
						<p className="text-red-700">
							{error instanceof Error ? error.message : "Failed to load agents"}
						</p>
						<p className="text-red-600 text-sm mt-2">
							Make sure the backend API is running and accessible.
						</p>
					</div>
				)}

				{!loading && !error && agents.length === 0 && (
					<div className="text-center py-12 bg-gray-50 rounded-lg">
						<p className="text-gray-600 mb-4">You haven't created any agents yet.</p>
						<Link
							to="/agents/new"
							className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
						>
							Create Your First Agent
						</Link>
					</div>
				)}

				{!loading && !error && agents.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{agents.map((agent: AgentSummary) => (
							<AgentCard key={agent.id} agent={agent} />
						))}
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
}
