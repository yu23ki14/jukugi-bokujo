import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type StatusVariant =
	| "active"
	| "completed"
	| "pending"
	| "cancelled"
	| "info"
	| "feedback"
	| "direction";

const variantStyles: Record<StatusVariant, string> = {
	active: "bg-status-active-bg text-status-active hover:bg-status-active-bg",
	completed: "bg-status-completed-bg text-status-completed hover:bg-status-completed-bg",
	pending: "bg-status-pending-bg text-status-pending hover:bg-status-pending-bg",
	cancelled: "bg-status-cancelled-bg text-status-cancelled hover:bg-status-cancelled-bg",
	info: "bg-status-active-bg text-status-active hover:bg-status-active-bg",
	feedback: "bg-status-feedback-bg text-status-feedback hover:bg-status-feedback-bg",
	direction: "bg-status-direction-bg text-status-direction hover:bg-status-direction-bg",
};

interface StatusBadgeProps {
	variant: StatusVariant;
	children: React.ReactNode;
	className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
	return <Badge className={cn(variantStyles[variant], className)}>{children}</Badge>;
}
