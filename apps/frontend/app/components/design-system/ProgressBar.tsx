import { cn } from "~/lib/utils";

interface ProgressBarProps {
	value: number;
	max: number;
	colorScheme?: "primary" | "green" | "blue";
	size?: "sm" | "md";
	className?: string;
}

const barColors: Record<string, string> = {
	primary: "bg-primary",
	green: "bg-green-500",
	blue: "bg-gradient-to-r from-blue-500 to-cyan-500",
};

export function ProgressBar({
	value,
	max,
	colorScheme = "primary",
	size = "md",
	className,
}: ProgressBarProps) {
	const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
	return (
		<div
			className={cn(
				"w-full bg-muted rounded-full overflow-hidden",
				size === "sm" ? "h-1.5" : "h-2",
				className,
			)}
		>
			<div
				className={cn("h-full rounded-full transition-all", barColors[colorScheme])}
				style={{ width: `${percentage}%` }}
			/>
		</div>
	);
}
