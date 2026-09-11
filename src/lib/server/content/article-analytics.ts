import { existsSync } from 'node:fs';
import {
	blogAnalyticsFileSchema,
	emptyAnalyticsFile,
	emptyPostAnalytics,
	incrementPostView,
	mergeOverall,
	normalizeUtmSource,
	summarizePost,
	type BlogAnalyticsFile,
	type OverallAnalytics,
	type PostAnalyticsSummary
} from '$lib/schemas/blog-analytics';
import { atomicWriteJson, dataPath, readJsonFile, withWriteLock } from './json-store';

export type ArticleAnalyticsStore = {
	load: () => BlogAnalyticsFile;
	getOverall: () => OverallAnalytics;
	getPost: (slug: string) => PostAnalyticsSummary;
	recordView: (slug: string, utmSource: string | null | undefined) => Promise<void>;
};

export function createArticleAnalyticsStore(fileName: string): ArticleAnalyticsStore {
	function analyticsFilePath(): string {
		return dataPath(fileName);
	}

	function readAnalyticsFile(): BlogAnalyticsFile {
		const path = analyticsFilePath();
		if (!existsSync(path)) {
			return emptyAnalyticsFile();
		}
		return blogAnalyticsFileSchema.parse(readJsonFile(path));
	}

	async function saveAnalyticsFile(file: BlogAnalyticsFile): Promise<void> {
		const validated = blogAnalyticsFileSchema.parse(file);
		await withWriteLock(() => {
			atomicWriteJson(analyticsFilePath(), validated);
		});
	}

	return {
		load: () => readAnalyticsFile(),
		getOverall: () => mergeOverall(readAnalyticsFile()),
		getPost: (slug: string) => {
			const file = readAnalyticsFile();
			const stats = file.posts[slug] ?? emptyPostAnalytics();
			return summarizePost(slug, stats);
		},
		recordView: async (slug: string, utmSource: string | null | undefined) => {
			const source = normalizeUtmSource(utmSource);
			const next = incrementPostView(readAnalyticsFile(), slug, source);
			await saveAnalyticsFile(next);
		}
	};
}
