import { z } from 'zod';
import { slugSchema } from './project';

export const blogCollectionSchema = z.object({
	slug: slugSchema,
	title: z.string().trim().min(1),
	summary: z.string().trim().min(1),
	tags: z.array(z.string().trim().min(1)).optional(),
	posts: z
		.array(slugSchema)
		.min(1, 'Select at least one post')
		.superRefine((posts, ctx) => {
			const seen = new Set<string>();
			for (const [index, postSlug] of posts.entries()) {
				if (seen.has(postSlug)) {
					ctx.addIssue({
						code: 'custom',
						message: `Duplicate post slug: ${postSlug}`,
						path: [index]
					});
				}
				seen.add(postSlug);
			}
		}),
	published: z.boolean(),
	updated_at: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'updated_at must be ISO UTC')
});

export const blogCollectionsFileSchema = z
	.array(blogCollectionSchema)
	.superRefine((collections, ctx) => {
		const slugs = new Set<string>();
		for (const [index, collection] of collections.entries()) {
			if (slugs.has(collection.slug)) {
				ctx.addIssue({
					code: 'custom',
					message: `Duplicate slug: ${collection.slug}`,
					path: [index, 'slug']
				});
			}
			slugs.add(collection.slug);
		}
	});

export type BlogCollection = z.infer<typeof blogCollectionSchema>;

export function sortBlogCollections(collections: BlogCollection[]): BlogCollection[] {
	return [...collections].sort(
		(a, b) => b.updated_at.localeCompare(a.updated_at) || a.slug.localeCompare(b.slug)
	);
}

export function publishedBlogCollections(collections: BlogCollection[]): BlogCollection[] {
	return sortBlogCollections(collections.filter((collection) => collection.published));
}
