import { Link } from "react-router";

interface BackLinkProps {
	to: string;
	label: string;
}

export function BackLink({ to, label }: BackLinkProps) {
	return (
		<Link
			to={to}
			className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
		>
			&larr; {label}
		</Link>
	);
}
