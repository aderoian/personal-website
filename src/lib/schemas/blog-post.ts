import { z } from 'zod';
import { slugSchema } from './project';

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
	tags: z.array(z.string().trim().min(1)).optional()
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

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
	return [...posts].sort(
		(a, b) => b.published_at.localeCompare(a.published_at) || a.slug.localeCompare(b.slug)
	);
}

export function publishedBlogPosts(posts: BlogPost[]): BlogPost[] {
	return sortBlogPosts(posts.filter((post) => post.published));
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
