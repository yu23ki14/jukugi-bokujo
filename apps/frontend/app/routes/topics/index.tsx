import { Link } from "react-router";
import {
	EmptyState,
	InfoAlert,
	LoadingState,
	PageHeader,
	StatusBadge,
} from "../../components/design-system";
import { Card, CardContent } from "../../components/ui/card";
import { type TopicSummary, useGetApiTopics } from "../../hooks/backend";
import { formatDate } from "../../utils/date";

export function meta() {
	return [{ title: "Topics - Jukugi Bokujo" }];
}

export default function TopicsIndex() {
	const { data: topicsData, isLoading: loading, error } = useGetApiTopics();

	// Extract topics safely
	const topicsResponse = !error && topicsData?.data ? topicsData.data : null;
	const topics = topicsResponse && "topics" in topicsResponse ? topicsResponse.topics : [];

	return (
		<div>
			<PageHeader title="トピック" />

			<div className="mb-6">
				<InfoAlert>トピックを追加したい場合は、GitHubにIssueを立ててください。</InfoAlert>
			</div>

			{loading && <LoadingState message="Loading topics..." />}

			{error && (
				<InfoAlert variant="error">
					{error instanceof Error ? error.message : "Failed to load topics"}
				</InfoAlert>
			)}

			{!loading && !error && topics.length === 0 && (
				<EmptyState message="No active topics at the moment." />
			)}

			{!loading && !error && topics.length > 0 && (
				<div className="grid grid-cols-1 gap-6">
					{topics.map((topic: TopicSummary) => (
						<Link key={topic.id} to={`/topics/${topic.id}`} className="hover:shadow-lg transition">
							<Card>
								<CardContent>
									<div className="flex justify-between items-start mb-3">
										<h2 className="font-bold text-xl flex-1">{topic.title}</h2>
										<StatusBadge variant={topic.status === "active" ? "completed" : "pending"}>
											{topic.status}
										</StatusBadge>
									</div>
									<p className="text-muted-foreground mb-4 line-clamp-3">{topic.description}</p>
									<p className="text-xs text-muted-foreground">
										Created: {formatDate(topic.created_at)}
									</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
