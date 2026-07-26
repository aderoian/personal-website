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

export { normalizeUtmSource } from '$lib/schemas/blog-analytics';

function analyticsFilePath(): string {
	return dataPath('blog-analytics.json');
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

export function loadBlogAnalytics(): BlogAnalyticsFile {
	return readAnalyticsFile();
}

export function getOverallAnalytics(): OverallAnalytics {
	return mergeOverall(readAnalyticsFile());
}

export function getPostAnalytics(slug: string): PostAnalyticsSummary {
	const file = readAnalyticsFile();
	const stats = file.posts[slug] ?? emptyPostAnalytics();
	return summarizePost(slug, stats);
}

export async function recordBlogView(slug: string, utmSource: string | null | undefined): Promise<void> {
	const source = normalizeUtmSource(utmSource);
	const next = incrementPostView(readAnalyticsFile(), slug, source);
	await saveAnalyticsFile(next);
}
