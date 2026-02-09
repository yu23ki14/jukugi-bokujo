import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router";
import { AgentCard } from "../components/AgentCard";
import { ProtectedRoute } from "../components/ProtectedRoute";
import {
	type AgentSummary,
	type SessionSummary,
	useGetApiAgents,
	useGetApiSessions,
} from "../hooks/backend";

export function meta() {
	return [{ title: "Dashboard - Jukugi Bokujo" }];
}

export default function Dashboard() {
	const { user } = useUser();

	// Fetch agents using Orval-generated React Query hooks
	const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useGetApiAgents();

	// Fetch all sessions for stats
	const {
		data: allSessionsData,
		isLoading: allSessionsLoading,
		error: allSessionsError,
	} = useGetApiSessions({ limit: 100 });

	// Fetch active sessions
	const {
		data: activeSessionsData,
		isLoading: activeSessionsLoading,
		error: activeSessionsError,
	} = useGetApiSessions({ status: "active", limit: 5 });

	// Compute loading and data states
	const loading = agentsLoading || allSessionsLoading || activeSessionsLoading;
	const hasError = agentsError || allSessionsError || activeSessionsError;

	// Extract data safely with proper null checks
	const agentsResponse = !agentsError && agentsData?.data ? agentsData.data : null;
	const allSessionsResponse =
		!allSessionsError && allSessionsData?.data ? allSessionsData.data : null;
	const activeSessionsResponse =
		!activeSessionsError && activeSessionsData?.data ? activeSessionsData.data : null;

	const agents =
		agentsResponse && "agents" in agentsResponse ? agentsResponse.agents.slice(0, 5) : [];

	const activeSessions =
		activeSessionsResponse && "sessions" in activeSessionsResponse
			? activeSessionsResponse.sessions
			: [];

	const stats = {
		totalAgents: agentsResponse && "agents" in agentsResponse ? agentsResponse.agents.length : 0,
		totalSessions:
			allSessionsResponse && "total" in allSessionsResponse ? allSessionsResponse.total : 0,
		activeSessions:
			activeSessionsResponse && "total" in activeSessionsResponse
				? activeSessionsResponse.total
				: 0,
	};

	// Handle errors
	if (hasError) {
		console.error("Failed to load dashboard data:", {
			agentsError,
			allSessionsError,
			activeSessionsError,
		});
	}

	return (
		<ProtectedRoute>
			<div>
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || "User"}!</h1>
					<p className="text-gray-600">Here's what's happening with your AI deliberation agents</p>
				</div>

				{/* Statistics Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<StatCard
						title="My Agents"
						value={stats.totalAgents}
						description="Total agents created"
						linkTo="/agents"
						linkText="View all"
					/>
					<StatCard
						title="Active Sessions"
						value={stats.activeSessions}
						description="Currently deliberating"
						linkTo="/sessions?status=active"
						linkText="View active"
						highlight
					/>
					<StatCard
						title="Total Sessions"
						value={stats.totalSessions}
						description="Participated in"
						linkTo="/sessions"
						linkText="View history"
					/>
				</div>

				{/* Quick Actions */}
				<div className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
					<div className="flex flex-wrap gap-4">
						<Link
							to="/agents/new"
							className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
						>
							<span>+</span>
							Create New Agent
						</Link>
						<Link
							to="/sessions"
							className="inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition border border-gray-300 font-semibold"
						>
							Browse Sessions
						</Link>
						<Link
							to="/topics"
							className="inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition border border-gray-300 font-semibold"
						>
							Explore Topics
						</Link>
					</div>
				</div>

				{loading ? (
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-4 text-gray-600">Loading dashboard...</p>
					</div>
				) : (
					<>
						{/* My Agents */}
						<div className="mb-8">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-2xl font-bold">My Agents</h2>
								<Link to="/agents" className="text-blue-600 hover:text-blue-800 text-sm">
									View all →
								</Link>
							</div>
							{agents.length === 0 ? (
								<div className="bg-gray-50 rounded-lg p-8 text-center">
									<p className="text-gray-600 mb-4">You haven't created any agents yet</p>
									<Link
										to="/agents/new"
										className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
									>
										Create Your First Agent
									</Link>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{agents.map((agent: AgentSummary) => (
										<AgentCard key={agent.id} agent={agent} />
									))}
								</div>
							)}
						</div>

						{/* Active Sessions */}
						<div className="mb-8">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-2xl font-bold">Active Sessions</h2>
								<Link
									to="/sessions?status=active"
									className="text-blue-600 hover:text-blue-800 text-sm"
								>
									View all →
								</Link>
							</div>
							{activeSessions.length === 0 ? (
								<div className="bg-gray-50 rounded-lg p-8 text-center">
									<p className="text-gray-600">No active sessions at the moment</p>
								</div>
							) : (
								<div className="space-y-4">
									{activeSessions.map((session: SessionSummary) => (
										<Link
											key={session.id}
											to={`/sessions/${session.id}`}
											className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
										>
											<div className="flex justify-between items-start mb-2">
												<h3 className="font-semibold text-lg">{session.topic.title}</h3>
												<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
													Active
												</span>
											</div>
											<div className="flex items-center gap-4 text-sm text-gray-600">
												<span>{session.participant_count} participants</span>
												<span>•</span>
												<span>
													Turn {session.current_turn} / {session.max_turns}
												</span>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>

						{/* Getting Started Guide */}
						{agents.length === 0 && (
							<div className="bg-blue-50 rounded-lg p-6">
								<h3 className="text-lg font-semibold mb-3">Getting Started</h3>
								<ol className="list-decimal list-inside space-y-2 text-gray-700">
									<li>Create your first AI agent with a unique personality</li>
									<li>Add knowledge and direction to shape your agent's behavior</li>
									<li>Watch your agent participate in deliberations automatically</li>
									<li>Provide feedback to evolve your agent's persona over time</li>
								</ol>
							</div>
						)}
					</>
				)}
			</div>
		</ProtectedRoute>
	);
}

function StatCard({
	title,
	value,
	description,
	linkTo,
	linkText,
	highlight = false,
}: {
	title: string;
	value: number;
	description: string;
	linkTo: string;
	linkText: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-lg p-6 ${
				highlight ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
			}`}
		>
			<h3 className={`text-sm font-semibold mb-2 ${highlight ? "text-blue-100" : "text-gray-600"}`}>
				{title}
			</h3>
			<p className={`text-4xl font-bold mb-1 ${highlight ? "text-white" : "text-gray-900"}`}>
				{value}
			</p>
			<p className={`text-sm mb-3 ${highlight ? "text-blue-100" : "text-gray-500"}`}>
				{description}
			</p>
			<Link
				to={linkTo}
				className={`text-sm font-semibold ${
					highlight ? "text-white hover:text-blue-50" : "text-blue-600 hover:text-blue-800"
				}`}
			>
				{linkText} →
			</Link>
		</div>
	);
}
