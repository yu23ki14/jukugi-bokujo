import { Link } from "react-router";
import type { AgentSummary } from "../hooks/backend";

interface AgentCardProps {
	agent: AgentSummary;
	onClick?: () => void;
}

/**
 * AgentCard component
 * Displays an agent with its persona information
 */
export function AgentCard({ agent, onClick }: AgentCardProps) {
	const cardContent = (
		<div className="border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
			<div className="flex justify-between items-start mb-4">
				<h3 className="font-bold text-xl text-gray-900">{agent.name}</h3>
				<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
					v{agent.persona.version}
				</span>
			</div>

			<div className="space-y-3">
				<div>
					<p className="text-sm font-semibold text-gray-700 mb-1">思考スタイル</p>
					<p className="text-sm text-gray-600">{agent.persona.thinking_style}</p>
				</div>

				<div>
					<p className="text-sm font-semibold text-gray-700 mb-1">背景</p>
					<p className="text-sm text-gray-600 line-clamp-2">{agent.persona.background}</p>
				</div>

				<div>
					<p className="text-sm font-semibold text-gray-700 mb-1">コアバリュー</p>
					<div className="flex flex-wrap gap-2">
						{agent.persona.core_values.map((value) => (
							<span key={value} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
								{value}
							</span>
						))}
					</div>
				</div>

				<div>
					<p className="text-sm font-semibold text-gray-700 mb-1">性格特性</p>
					<div className="flex flex-wrap gap-2">
						{agent.persona.personality_traits.map((trait) => (
							<span key={trait} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
								{trait}
							</span>
						))}
					</div>
				</div>
			</div>

			<div className="mt-4 pt-4 border-t border-gray-200">
				<p className="text-xs text-gray-500">
					作成日: {new Date(agent.created_at).toLocaleDateString("ja-JP")}
				</p>
			</div>
		</div>
	);

	if (onClick) {
		return <div onClick={onClick}>{cardContent}</div>;
	}

	return <Link to={`/agents/${agent.id}`}>{cardContent}</Link>;
}
