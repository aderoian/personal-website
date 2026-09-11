import { z } from 'zod';
import { slugSchema } from './project';

const optionalSlugSchema = z.preprocess((value) => {
	if (value === '' || value === null || value === undefined) return undefined;
	return value;
}, slugSchema.optional());

export const blogPostSchema = z.object({
	slug: slugSchema,
	title: z.string().trim().min(1),
	summary: z.string().trim().min(1),
	body: z.string().min(1),
	published: z.boolean(),
	published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'published_at must be YYYY-MM-DD'),
	updated_at: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'updated_at must be ISO UTC'),
	tags: z.array(z.string().trim().min(1)).optional(),
	/** Optional slug of the post to suggest after this article. */
	continued_reading: optionalSlugSchema,
	/** Lower numbers appear first among featured posts. Omitted posts are not featured. */
	featured_order: z.number().int().optional()
});

export const blogFileSchema = z.array(blogPostSchema).superRefine((posts, ctx) => {
	const slugs = new Set<string>();
	for (const [index, post] of posts.entries()) {
		if (slugs.has(post.slug)) {
			ctx.addIssue({
				code: 'custom',
				message: `Duplicate slug: ${post.slug}`,
				path: [index, 'slug']
			});
		}
		slugs.add(post.slug);
	}
});

export type BlogPost = z.infer<typeof blogPostSchema>;

/** Calendar date in UTC as YYYY-MM-DD (matches `published_at`). */
export function utcTodayDateString(): string {
	return new Date().toISOString().slice(0, 10);
}

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
	return [...posts].sort(
		(a, b) => b.published_at.localeCompare(a.published_at) || a.slug.localeCompare(b.slug)
	);
}

/** Published and not scheduled for a future calendar date. */
export function isBlogPostPubliclyVisible(
	post: BlogPost,
	today: string = utcTodayDateString()
): boolean {
	return post.published && post.published_at <= today;
}

export function publishedBlogPosts(
	posts: BlogPost[],
	today: string = utcTodayDateString()
): BlogPost[] {
	return sortBlogPosts(posts.filter((post) => isBlogPostPubliclyVisible(post, today)));
}

export function formatBlogDate(date: string): string {
	const parsed = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return date;
	return parsed.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

export type BlogSearchable = {
	title: string;
	tags?: string[];
};

/**
 * Tag filter: with no tags selected, everything is visible.
 * With any tags selected, an item must share at least one selected tag.
 * Untagged items only pass when nothing is selected.
 */
export function matchesBlogTags(item: BlogSearchable, selectedTags: string[]): boolean {
	if (selectedTags.length === 0) return true;
	const itemTags = item.tags ?? [];
	if (itemTags.length === 0) return false;
	const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));
	return itemTags.some((tag) => selected.has(tag.toLowerCase()));
}

/** Case-insensitive title match; every query word must appear in the title. */
export function matchesBlogTitle(item: BlogSearchable, query: string): boolean {
	const words = query
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return true;
	const title = item.title.toLowerCase();
	return words.every((word) => title.includes(word));
}

/** Tag filter first, then title search. */
export function matchesBlogSearch(
	item: BlogSearchable,
	query: string,
	selectedTags: string[] = []
): boolean {
	if (!matchesBlogTags(item, selectedTags)) return false;
	return matchesBlogTitle(item, query);
}

export function collectBlogTags(items: { tags?: string[] }[]): string[] {
	const tags = new Set<string>();
	for (const item of items) {
		for (const tag of item.tags ?? []) {
			tags.add(tag);
		}
	}
	return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * Prefer an explicit `continued_reading` slug when that post is public.
 * Otherwise use the next older published post, or the latest if there is no next.
 */
export function resolveContinuedReading(
	current: BlogPost,
	published: BlogPost[]
): BlogPost | undefined {
	const others = published.filter((post) => post.slug !== current.slug);
	if (others.length === 0) return undefined;

	if (current.continued_reading) {
		const explicit = others.find((post) => post.slug === current.continued_reading);
		if (explicit) return explicit;
	}

	const index = published.findIndex((post) => post.slug === current.slug);
	if (index !== -1 && index + 1 < published.length) {
		return published[index + 1];
	}

	return others[0];
}

/**
 * Published posts that have a featured_order, sorted like projects
 * (featured_order then slug), then sliced to `count`.
 */
export function featuredBlogPosts(posts: BlogPost[], count: number): BlogPost[] {
	const featured = publishedBlogPosts(posts)
		.filter((post) => post.featured_order !== undefined)
		.sort(
			(a, b) =>
				(a.featured_order ?? 0) - (b.featured_order ?? 0) || a.slug.localeCompare(b.slug)
		);
	return featured.slice(0, Math.max(0, count));
}
