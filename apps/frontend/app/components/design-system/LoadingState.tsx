import { Spinner } from "./Spinner";

interface LoadingStateProps {
	message?: string;
}

export function LoadingState({ message = "読み込み中..." }: LoadingStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12">
			<Spinner size="lg" />
			<p className="mt-4 text-muted-foreground">{message}</p>
		</div>
	);
}
