/** ステータス文字列を日本語ラベルに変換するユーティリティ */

const SESSION_STATUS_LABELS: Record<string, string> = {
	active: "議論中",
	completed: "決着済み",
	cancelled: "中止",
	pending: "準備中",
};

const TOPIC_STATUS_LABELS: Record<string, string> = {
	active: "公開中",
	archived: "終了",
};

export function sessionStatusLabel(status: string): string {
	return SESSION_STATUS_LABELS[status] ?? status;
}

export function topicStatusLabel(status: string): string {
	return TOPIC_STATUS_LABELS[status] ?? status;
}
