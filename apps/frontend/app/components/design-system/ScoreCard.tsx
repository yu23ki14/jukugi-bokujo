import { cn } from "~/lib/utils";

interface ScoreCardProps {
	label: string;
	value: number;
	color?: "blue" | "green" | "purple" | "orange";
}

const colorStyles = {
	blue: "text-blue-600",
	green: "text-green-600",
	purple: "text-purple-600",
	orange: "text-orange-600",
};

export function ScoreCard({ label, value, color = "blue" }: ScoreCardProps) {
	return (
		<div className="text-center p-3 bg-white rounded-lg">
			<div className={cn("text-2xl font-bold", colorStyles[color])}>{value}</div>
			<div className="text-sm text-muted-foreground">{label}</div>
		</div>
	);
}
