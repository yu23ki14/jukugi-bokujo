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
	active: "bg-blue-100 text-blue-700 hover:bg-blue-100",
	completed: "bg-green-100 text-green-700 hover:bg-green-100",
	pending: "bg-gray-100 text-gray-700 hover:bg-gray-100",
	cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
	info: "bg-blue-100 text-blue-700 hover:bg-blue-100",
	feedback: "bg-orange-100 text-orange-700 hover:bg-orange-100",
	direction: "bg-purple-100 text-purple-700 hover:bg-purple-100",
};

interface StatusBadgeProps {
	variant: StatusVariant;
	children: React.ReactNode;
	className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
	return <Badge className={cn(variantStyles[variant], className)}>{children}</Badge>;
}
