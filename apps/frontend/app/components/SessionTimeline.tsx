import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { EmptyState, StatusBadge } from "~/components/design-system";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { Turn } from "../hooks/backend";
import { formatTime } from "../utils/date";

interface SessionTimelineProps {
	turns: Turn[];
	myAgentIds?: Set<string>;
	maxTurns: number;
	isCompleted?: boolean;
}

/**
 * SessionTimeline component
 * Latest turn is expanded prominently, past turns are collapsed by default
 */
export function SessionTimeline({
	turns,
	myAgentIds,
	maxTurns,
	isCompleted,
}: SessionTimelineProps) {
	if (turns.length === 0) {
		return <EmptyState message="まだターンが始まっていません" />;
	}

	const reversedTurns = [...turns].reverse();
	const newest = reversedTurns[0];

	// When session is completed, all turns go into collapsible past turns
	if (isCompleted) {
		return (
			<div className="space-y-4">
				<PastTurnsSection turns={reversedTurns} myAgentIds={myAgentIds} />
			</div>
		);
	}

	// If the newest turn is pending with no statements, show it as a small banner
	// and promote the previous turn as the main card
	const newestIsPending =
		newest.status === "pending" && (!newest.statements || newest.statements.length === 0);
	const mainTurn = newestIsPending && reversedTurns.length > 1 ? reversedTurns[1] : newest;
	const pastTurns = reversedTurns.filter(
		(t) => t.id !== mainTurn.id && t.id !== (newestIsPending ? newest.id : ""),
	);
	const isFinalTurn = mainTurn.turn_number === maxTurns;

	return (
		<div className="space-y-4">
			{/* Pending banner when newest turn is waiting */}
			{newestIsPending && <PendingTurnBanner turn={newest} />}

			{/* Final turn separator */}
			{isFinalTurn && <FinalSeparator />}

			{/* Main turn - always expanded */}
			<LatestTurnCard turn={mainTurn} myAgentIds={myAgentIds} isFinal={isFinalTurn} />

			{/* Past turns - collapsed by default */}
			{pastTurns.length > 0 && <PastTurnsSection turns={pastTurns} myAgentIds={myAgentIds} />}
		</div>
	);
}

/** Small banner for a pending turn with no statements yet */
function PendingTurnBanner({ turn }: { turn: Turn }) {
	return (
		<div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground">
			<StatusBadge variant="pending">待機中</StatusBadge>
			<span>ターン {turn.turn_number} — なかまに声をかけられます。</span>
		</div>
	);
}

/** Decorative separator for the final turn */
function FinalSeparator() {
	return (
		<div className="flex items-center gap-3">
			<div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
			<span className="text-xs font-bold tracking-widest text-primary uppercase">Final</span>
			<div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
		</div>
	);
}

/** Latest turn displayed as a prominent card */
function LatestTurnCard({
	turn,
	myAgentIds,
	isFinal,
}: {
	turn: Turn;
	myAgentIds?: Set<string>;
	isFinal?: boolean;
}) {
	return (
		<Card
			className={cn(
				isFinal ? "border-2 border-primary shadow-lg shadow-primary/20" : "border-primary/30",
			)}
		>
			<CardContent className="p-4">
				<div className="flex items-center gap-2 mb-3">
					<span className="font-bold">ターン {turn.turn_number}</span>
					{isFinal ? (
						<StatusBadge variant="active">最終ターン</StatusBadge>
					) : (
						<StatusBadge variant="active">最新</StatusBadge>
					)}
					{turn.status === "processing" && (
						<StatusBadge variant="feedback">発言生成中...</StatusBadge>
					)}
					{turn.status === "pending" && <StatusBadge variant="pending">待機中</StatusBadge>}
				</div>
				<div className="space-y-3">
					{turn.statements && turn.statements.length > 0 ? (
						[...turn.statements]
							.reverse()
							.map((statement) => (
								<StatementBubble
									key={statement.id}
									statement={statement}
									isMine={myAgentIds?.has(statement.agent_id) ?? false}
								/>
							))
					) : (
						<p className="text-sm text-muted-foreground">まだ発言がありません</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

/** Past turns section with expand all / collapse all toggle */
function PastTurnsSection({ turns, myAgentIds }: { turns: Turn[]; myAgentIds?: Set<string> }) {
	const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

	const allExpanded = turns.length > 0 && expandedTurns.size === turns.length;

	function toggleTurn(turnNumber: number) {
		setExpandedTurns((prev) => {
			const next = new Set(prev);
			if (next.has(turnNumber)) {
				next.delete(turnNumber);
			} else {
				next.add(turnNumber);
			}
			return next;
		});
	}

	function toggleAll() {
		if (allExpanded) {
			setExpandedTurns(new Set());
		} else {
			setExpandedTurns(new Set(turns.map((t) => t.turn_number)));
		}
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<p className="text-sm text-muted-foreground font-medium">過去のターン ({turns.length})</p>
				<button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
					{allExpanded ? "すべて閉じる" : "すべて開く"}
				</button>
			</div>
			<div className="space-y-1">
				{turns.map((turn) => (
					<CollapsibleTurn
						key={turn.id}
						turn={turn}
						isExpanded={expandedTurns.has(turn.turn_number)}
						onToggle={() => toggleTurn(turn.turn_number)}
						myAgentIds={myAgentIds}
					/>
				))}
			</div>
		</div>
	);
}

/** A collapsible past turn row */
function CollapsibleTurn({
	turn,
	isExpanded,
	onToggle,
	myAgentIds,
}: {
	turn: Turn;
	isExpanded: boolean;
	onToggle: () => void;
	myAgentIds?: Set<string>;
}) {
	const statementCount = turn.statements?.length ?? 0;
	const statements = turn.statements ?? [];

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: role is conditionally set based on isExpanded
		<div
			className={cn(
				"border rounded-md",
				!isExpanded && "cursor-pointer hover:bg-muted/50 transition",
			)}
			onClick={!isExpanded ? onToggle : undefined}
			onKeyDown={
				!isExpanded
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onToggle();
							}
						}
					: undefined
			}
			role={!isExpanded ? "button" : undefined}
			tabIndex={!isExpanded ? 0 : undefined}
		>
			{isExpanded ? (
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition"
				>
					<ChevronRight className="size-4 text-muted-foreground shrink-0 transition-transform rotate-90" />
					<span className="font-medium whitespace-nowrap">ターン {turn.turn_number}</span>
					<span className="text-muted-foreground whitespace-nowrap">{statementCount}発言</span>
					{turn.completed_at && (
						<span className="text-muted-foreground ml-auto whitespace-nowrap">
							{formatTime(turn.completed_at)}
						</span>
					)}
				</button>
			) : (
				<div className="flex items-center gap-2 px-3 py-2 text-sm">
					<ChevronRight className="size-4 text-muted-foreground shrink-0 transition-transform" />
					<span className="font-medium whitespace-nowrap">ターン {turn.turn_number}</span>
					<span className="text-muted-foreground whitespace-nowrap">{statementCount}発言</span>
					{turn.completed_at && (
						<span className="text-muted-foreground ml-auto whitespace-nowrap">
							{formatTime(turn.completed_at)}
						</span>
					)}
				</div>
			)}
			{!isExpanded && statements.length > 0 && (
				<div className="px-3 pb-2 space-y-1">
					{[...statements].reverse().map((s) => (
						<p key={s.id} className="text-xs text-muted-foreground">
							<span className={cn("font-medium", myAgentIds?.has(s.agent_id) && "text-primary")}>
								{s.agent_name}
							</span>
							: {s.summary || s.content.replace(/\n/g, " ")}
						</p>
					))}
				</div>
			)}
			{isExpanded && (
				<div className="px-3 pb-3 space-y-2">
					{statements.length > 0 ? (
						[...statements]
							.reverse()
							.map((statement) => (
								<StatementBubble
									key={statement.id}
									statement={statement}
									isMine={myAgentIds?.has(statement.agent_id) ?? false}
									compact
								/>
							))
					) : (
						<p className="text-xs text-muted-foreground">発言なし</p>
					)}
				</div>
			)}
		</div>
	);
}

/** Individual statement display */
function StatementBubble({
	statement,
	isMine,
	compact,
}: {
	statement: {
		id: string;
		agent_id: string;
		agent_name: string;
		content: string;
		created_at: number;
	};
	isMine: boolean;
	compact?: boolean;
}) {
	return (
		<div
			className={cn(
				"rounded-md",
				compact ? "p-2" : "p-3",
				isMine ? "border-l-4 border-l-primary bg-primary/5" : "border border-border bg-card",
			)}
		>
			<div className="flex items-center gap-2 mb-1">
				<span className={cn("font-semibold text-sm", isMine && "text-primary")}>
					{isMine && "★ "}
					{statement.agent_name}
				</span>
				<span className="text-xs text-muted-foreground">{formatTime(statement.created_at)}</span>
			</div>
			<p
				className={cn(
					"text-foreground/80 leading-relaxed whitespace-pre-wrap",
					compact ? "text-sm" : "",
				)}
			>
				{statement.content}
			</p>
		</div>
	);
}
