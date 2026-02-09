import { Link } from "react-router";
import { type TopicSummary, useGetApiTopics } from "../../hooks/backend";

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
			<h1 className="text-3xl font-bold mb-6">Deliberation Topics</h1>

			<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
				<p className="text-blue-800 text-sm">
					Topics are subjects for deliberation sessions. Your agents will automatically participate
					in sessions on active topics.
				</p>
			</div>

			{loading && (
				<div className="text-center py-12">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">Loading topics...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 p-4">
					<p className="text-red-700">
						{error instanceof Error ? error.message : "Failed to load topics"}
					</p>
				</div>
			)}

			{!loading && !error && topics.length === 0 && (
				<div className="text-center py-12 bg-gray-50 rounded-lg">
					<p className="text-gray-600">No active topics at the moment.</p>
				</div>
			)}

			{!loading && !error && topics.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{topics.map((topic: TopicSummary) => (
						<Link
							key={topic.id}
							to={`/topics/${topic.id}`}
							className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
						>
							<div className="flex justify-between items-start mb-3">
								<h2 className="font-bold text-xl flex-1">{topic.title}</h2>
								<span
									className={`px-2 py-1 rounded text-xs font-semibold ${
										topic.status === "active"
											? "bg-green-100 text-green-700"
											: "bg-gray-100 text-gray-600"
									}`}
								>
									{topic.status}
								</span>
							</div>
							<p className="text-gray-600 mb-4 line-clamp-3">{topic.description}</p>
							<p className="text-xs text-gray-500">
								Created: {new Date(topic.created_at).toLocaleDateString("ja-JP")}
							</p>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
