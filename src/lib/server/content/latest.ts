import type { BlogPost } from '$lib/schemas/blog-post';
import { getPublishedBlogPosts } from './blog';
import { getPublishedUpdatePosts } from './updates';

export type LatestKind = 'blog' | 'update';

export type LatestArticle = {
	kind: LatestKind;
	post: BlogPost;
};

function sortLatest(a: LatestArticle, b: LatestArticle): number {
	return (
		b.post.published_at.localeCompare(a.post.published_at) ||
		a.post.slug.localeCompare(b.post.slug) ||
		a.kind.localeCompare(b.kind)
	);
}

/** Newest published blogs and updates, mixed and sliced to `limit`. */
export function getLatestPublishedArticles(limit = 2): LatestArticle[] {
	const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
	const blogs: LatestArticle[] = getPublishedBlogPosts().map((post) => ({
		kind: 'blog',
		post
	}));
	const updates: LatestArticle[] = getPublishedUpdatePosts().map((post) => ({
		kind: 'update',
		post
	}));
	return [...blogs, ...updates].sort(sortLatest).slice(0, count);
}
