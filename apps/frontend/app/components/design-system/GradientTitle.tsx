import { cn } from "~/lib/utils";

type ColorScheme = "green" | "blue";

const colorSchemes: Record<ColorScheme, string> = {
	green: "from-green-600 to-emerald-500",
	blue: "from-blue-600 to-cyan-500",
};

interface GradientTitleProps {
	children: React.ReactNode;
	colorScheme?: ColorScheme;
	as?: "h1" | "h2" | "h3" | "p";
	className?: string;
}

export function GradientTitle({
	children,
	colorScheme = "green",
	as: Tag = "h1",
	className,
}: GradientTitleProps) {
	return (
		<Tag
			className={cn(
				"font-bold bg-gradient-to-r bg-clip-text text-transparent",
				colorSchemes[colorScheme],
				className,
			)}
		>
			{children}
		</Tag>
	);
}
