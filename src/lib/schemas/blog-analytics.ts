import { z } from 'zod';

export const DEFAULT_UTM_SOURCE = 'worldwide-web';

const sourceKeySchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9_-]{1,64}$/);

export const postAnalyticsSchema = z.object({
	total: z.number().int().nonnegative(),
	sources: z.record(z.string(), z.number().int().nonnegative())
});

export const blogAnalyticsFileSchema = z.object({
	posts: z.record(z.string(), postAnalyticsSchema)
});

export type PostAnalytics = z.infer<typeof postAnalyticsSchema>;
export type BlogAnalyticsFile = z.infer<typeof blogAnalyticsFileSchema>;

export type SourceCount = {
	source: string;
	count: number;
};

export type PostAnalyticsSummary = PostAnalytics & {
	slug: string;
	sourcesList: SourceCount[];
};

export type OverallAnalytics = {
	total: number;
	sources: Record<string, number>;
	sourcesList: SourceCount[];
	posts: PostAnalyticsSummary[];
};

/** Normalize a utm_source value; empty/missing/invalid → worldwide-web. */
export function normalizeUtmSource(raw: string | null | undefined): string {
	if (raw == null) return DEFAULT_UTM_SOURCE;
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return DEFAULT_UTM_SOURCE;
	const parsed = sourceKeySchema.safeParse(trimmed);
	return parsed.success ? parsed.data : DEFAULT_UTM_SOURCE;
}

export function emptyPostAnalytics(): PostAnalytics {
	return { total: 0, sources: {} };
}

export function emptyAnalyticsFile(): BlogAnalyticsFile {
	return { posts: {} };
}

export function sourcesToSortedList(sources: Record<string, number>): SourceCount[] {
	return Object.entries(sources)
		.map(([source, count]) => ({ source, count }))
		.sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

export function summarizePost(slug: string, stats: PostAnalytics): PostAnalyticsSummary {
	return {
		slug,
		total: stats.total,
		sources: stats.sources,
		sourcesList: sourcesToSortedList(stats.sources)
	};
}

export function mergeOverall(file: BlogAnalyticsFile): OverallAnalytics {
	let total = 0;
	const sources: Record<string, number> = {};
	const posts: PostAnalyticsSummary[] = [];

	for (const [slug, stats] of Object.entries(file.posts)) {
		total += stats.total;
		for (const [source, count] of Object.entries(stats.sources)) {
			sources[source] = (sources[source] ?? 0) + count;
		}
		posts.push(summarizePost(slug, stats));
	}

	posts.sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug));

	return {
		total,
		sources,
		sourcesList: sourcesToSortedList(sources),
		posts
	};
}

/** Pure increment used by the store and unit tests. */
export function incrementPostView(
	file: BlogAnalyticsFile,
	slug: string,
	source: string
): BlogAnalyticsFile {
	const existing = file.posts[slug] ?? emptyPostAnalytics();
	const nextSources = { ...existing.sources };
	nextSources[source] = (nextSources[source] ?? 0) + 1;

	return {
		posts: {
			...file.posts,
			[slug]: {
				total: existing.total + 1,
				sources: nextSources
			}
		}
	};
}
