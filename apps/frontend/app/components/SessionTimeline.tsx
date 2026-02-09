import type { Turn } from "../hooks/backend";

interface SessionTimelineProps {
	turns: Turn[];
}

/**
 * SessionTimeline component
 * Displays deliberation turns in timeline format with statements
 */
export function SessionTimeline({ turns }: SessionTimelineProps) {
	if (turns.length === 0) {
		return (
			<div className="text-center py-8 bg-gray-50 rounded-lg">
				<p className="text-gray-600">No turns yet. The session hasn't started.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{turns.map((turn) => (
				<div key={turn.id} className="relative">
					{/* Timeline line */}
					<div className="absolute left-4 top-12 bottom-0 w-0.5 bg-blue-200" />

					{/* Turn header */}
					<div className="flex items-center gap-4 mb-4">
						<div className="relative z-10 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
							{turn.turn_number}
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-lg">Turn {turn.turn_number}</h3>
							{turn.completed_at && (
								<p className="text-xs text-gray-500">
									{new Date(turn.completed_at).toLocaleString("ja-JP")}
								</p>
							)}
							{turn.status === "processing" && (
								<span className="text-xs text-yellow-600">Processing...</span>
							)}
							{turn.status === "pending" && <span className="text-xs text-gray-500">Pending</span>}
						</div>
					</div>

					{/* Statements */}
					<div className="ml-12 space-y-4">
						{turn.statements && turn.statements.length > 0 ? (
							turn.statements.map((statement) => (
								<div
									key={statement.id}
									className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
								>
									<div className="flex items-center gap-2 mb-2">
										<span className="font-semibold text-gray-900">{statement.agent_name}</span>
										<span className="text-xs text-gray-500">
											{new Date(statement.created_at).toLocaleTimeString("ja-JP")}
										</span>
									</div>
									<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
										{statement.content}
									</p>
								</div>
							))
						) : (
							<div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
								No statements yet
							</div>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
