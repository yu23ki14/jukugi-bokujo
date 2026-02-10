import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * Unix秒タイムスタンプをDateオブジェクトに変換
 * バックエンドから返されるタイムスタンプは秒単位なので、ミリ秒に変換する
 */
export function fromUnixSeconds(timestamp: number): Date {
	return new Date(timestamp * 1000);
}

/**
 * 日付を "2024/02/09" 形式でフォーマット
 */
export function formatDate(timestamp: number): string {
	return format(fromUnixSeconds(timestamp), "yyyy/MM/dd", { locale: ja });
}

/**
 * 日時を "2024/02/09 15:30:45" 形式でフォーマット
 */
export function formatDateTime(timestamp: number): string {
	return format(fromUnixSeconds(timestamp), "yyyy/MM/dd HH:mm:ss", { locale: ja });
}

/**
 * 時刻のみを "15:30:45" 形式でフォーマット
 */
export function formatTime(timestamp: number): string {
	return format(fromUnixSeconds(timestamp), "HH:mm:ss", { locale: ja });
}
