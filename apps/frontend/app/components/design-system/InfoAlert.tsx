import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

type InfoAlertVariant = "info" | "warning" | "error" | "feedback" | "strategy";

const variantStyles: Record<InfoAlertVariant, string> = {
	info: "border-alert-info-border bg-alert-info-bg text-alert-info [&>svg]:text-alert-info",
	warning:
		"border-alert-warning-border bg-alert-warning-bg text-alert-warning [&>svg]:text-alert-warning",
	error: "border-alert-error-border bg-alert-error-bg text-alert-error [&>svg]:text-alert-error",
	feedback:
		"border-alert-warning-border bg-alert-warning-bg text-alert-warning [&>svg]:text-alert-warning",
	strategy:
		"border-alert-strategy-border bg-alert-strategy-bg text-alert-strategy [&>svg]:text-alert-strategy",
};

interface InfoAlertProps {
	variant?: InfoAlertVariant;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

export function InfoAlert({ variant = "info", title, children, className }: InfoAlertProps) {
	return (
		<Alert className={cn("border-l-4", variantStyles[variant], className)}>
			{title && <AlertTitle>{title}</AlertTitle>}
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}
