import { Link } from "react-router";
import { Button } from "~/components/ui/button";

interface EmptyStateProps {
	message: string;
	description?: string;
	actionLabel?: string;
	actionTo?: string;
	onAction?: () => void;
}

export function EmptyState({
	message,
	description,
	actionLabel,
	actionTo,
	onAction,
}: EmptyStateProps) {
	return (
		<div className="text-center py-12 bg-muted/50 rounded-lg">
			<p className="text-lg font-medium text-foreground mb-2">{message}</p>
			{description && <p className="text-muted-foreground mb-4">{description}</p>}
			{actionLabel && actionTo && (
				<Button asChild>
					<Link to={actionTo}>{actionLabel}</Link>
				</Button>
			)}
			{actionLabel && onAction && !actionTo && <Button onClick={onAction}>{actionLabel}</Button>}
		</div>
	);
}
