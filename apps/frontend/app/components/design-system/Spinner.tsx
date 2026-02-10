import { cn } from "~/lib/utils";

interface SpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeStyles = {
	sm: "h-4 w-4",
	md: "h-8 w-8",
	lg: "h-12 w-12",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
	return (
		<output aria-label="読み込み中">
			<div
				className={cn(
					"inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
					sizeStyles[size],
					className,
				)}
			/>
		</output>
	);
}
