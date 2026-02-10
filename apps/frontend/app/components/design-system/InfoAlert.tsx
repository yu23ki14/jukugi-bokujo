import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

type InfoAlertVariant = "info" | "warning" | "error" | "feedback" | "strategy";

const variantStyles: Record<InfoAlertVariant, string> = {
	info: "border-blue-400 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
	warning: "border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-600",
	error: "border-red-400 bg-red-50 text-red-900 [&>svg]:text-red-600",
	feedback: "border-orange-400 bg-orange-50 text-orange-900 [&>svg]:text-orange-600",
	strategy: "border-indigo-400 bg-indigo-50 text-indigo-900 [&>svg]:text-indigo-600",
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
