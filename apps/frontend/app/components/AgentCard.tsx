import { StatusBadge } from "~/components/design-system";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { AgentSummary } from "../hooks/backend";

interface AgentCardProps {
	agent: AgentSummary;
	variant?: "active" | "reserve";
	action?: React.ReactNode;
}

export function AgentCard({ agent, variant, action }: AgentCardProps) {
	const resolvedVariant = variant ?? agent.status;
	const isActive = resolvedVariant === "active";
	const isInSession = agent.active_session_count > 0;

	return (
		<Card
			className={cn(
				"transition-all duration-300 h-full overflow-hidden py-3",
				isActive && "ring-2 ring-green-400/50",
				!isActive && "opacity-80",
			)}
		>
			{isInSession && (
				<div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold text-center py-1 tracking-wider">
					熟議中...
				</div>
			)}

			<CardContent className={cn("pt-3 pb-3", isInSession && "pt-2")}>
				<div className="text-center mb-1">
					<div className="relative inline-block">
						<p className={cn("text-2xl mb-1", isActive && "animate-pulse")}>
							{isInSession ? "🐄💬" : "🐄"}
						</p>
						{isActive && (
							<span className="absolute -top-1 -right-3 text-xs">
								{isInSession ? "🔥" : "✨"}
							</span>
						)}
					</div>
					<h3 className="font-bold text-sm text-foreground">{agent.name}</h3>
					<Badge variant="secondary" className="mt-0.5 text-xs">
						Lv.{agent.persona.version}
					</Badge>
				</div>

				{agent.persona.core_values.length > 0 && (
					<div className="flex flex-wrap justify-center gap-1">
						<StatusBadge variant="info">{agent.persona.core_values[0]}</StatusBadge>
					</div>
				)}

				{action && <div className="mt-2 pt-2">{action}</div>}
			</CardContent>
		</Card>
	);
}
