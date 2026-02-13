import { cn } from "~/lib/utils";

interface ScoreCardProps {
	label: string;
	value: number;
	color?: "blue" | "green" | "purple" | "orange";
}

const colorStyles = {
	blue: "text-score-blue",
	green: "text-score-green",
	purple: "text-score-purple",
	orange: "text-score-orange",
};

export function ScoreCard({ label, value, color = "blue" }: ScoreCardProps) {
	return (
		<div className="text-center p-3 bg-card rounded-lg">
			<div className={cn("text-2xl font-bold", colorStyles[color])}>{value}</div>
			<div className="text-sm text-muted-foreground">{label}</div>
		</div>
	);
}
