import { Link } from "react-router";
import { StatusBadge } from "~/components/design-system";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import type { AgentSummary } from "../hooks/backend";

interface AgentCardProps {
	agent: AgentSummary;
	onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
	const cardContent = (
		<Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
			<CardContent className="pt-5 pb-4">
				<div className="text-center mb-3">
					<p className="text-3xl mb-2">🐄</p>
					<h3 className="font-bold text-lg text-foreground">{agent.name}</h3>
					<Badge variant="secondary" className="mt-1">
						v{agent.persona.version}
					</Badge>
				</div>

				{agent.persona.core_values.length > 0 && (
					<div>
						<div className="flex flex-wrap justify-center gap-1.5">
							<StatusBadge variant="info">{agent.persona.core_values[0]}</StatusBadge>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className="w-full text-left">
				{cardContent}
			</button>
		);
	}

	return <Link to={`/agents/${agent.id}`}>{cardContent}</Link>;
}
