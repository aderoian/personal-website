import {
	blogFileSchema,
	blogPostSchema,
	featuredBlogPosts,
	isBlogPostPubliclyVisible,
	publishedBlogPosts,
	sortBlogPosts,
	utcTodayDateString,
	type BlogPost
} from '$lib/schemas/blog-post';
import { ContentConflictError, ContentNotFoundError } from './errors';
import { atomicWriteJson, dataPath, readJsonFile, withWriteLock } from './json-store';

export { ContentConflictError, ContentNotFoundError };

function blogFilePath(): string {
	return dataPath('blog.json');
}

function readAllPosts(): BlogPost[] {
	const parsed = blogFileSchema.parse(readJsonFile(blogFilePath()));
	return sortBlogPosts(parsed);
}

async function savePosts(posts: BlogPost[]): Promise<BlogPost[]> {
	const validated = blogFileSchema.parse(posts);
	const sorted = sortBlogPosts(validated);
	await withWriteLock(() => {
		atomicWriteJson(blogFilePath(), sorted);
	});
	return sorted;
}

export function loadBlogPosts(): BlogPost[] {
	return readAllPosts();
}

export function getPublishedBlogPosts(): BlogPost[] {
	return publishedBlogPosts(loadBlogPosts());
}

export function getLatestPublishedBlogPosts(limit = 2): BlogPost[] {
	const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
	return getPublishedBlogPosts().slice(0, count);
}

export function getLatestPublishedBlogPost(): BlogPost | undefined {
	return getLatestPublishedBlogPosts(1)[0];
}

export function getFeaturedBlogPosts(count: number): BlogPost[] {
	return featuredBlogPosts(loadBlogPosts(), count);
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
	const today = utcTodayDateString();
	return loadBlogPosts().find(
		(post) => post.slug === slug && isBlogPostPubliclyVisible(post, today)
	);
}

export function findBlogPostBySlug(slug: string): BlogPost | undefined {
	return loadBlogPosts().find((post) => post.slug === slug);
}

export function validateBlogPost(post: unknown): BlogPost {
	return blogPostSchema.parse(post);
}

export function utcNowIso(): string {
	return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function utcTodayDate(): string {
	return utcTodayDateString();
}

export async function createBlogPost(input: unknown): Promise<BlogPost> {
	const post = blogPostSchema.parse(input);
	const posts = loadBlogPosts();
	if (posts.some((existing) => existing.slug === post.slug)) {
		throw new ContentConflictError(`A blog post with slug "${post.slug}" already exists.`);
	}
	await savePosts([...posts, post]);
	return post;
}

export async function updateBlogPost(slug: string, input: unknown): Promise<BlogPost> {
	const post = blogPostSchema.parse(input);
	const posts = loadBlogPosts();
	const index = posts.findIndex((existing) => existing.slug === slug);
	if (index === -1) {
		throw new ContentNotFoundError(`Blog post "${slug}" was not found.`);
	}
	if (post.slug !== slug && posts.some((existing) => existing.slug === post.slug)) {
		throw new ContentConflictError(`A blog post with slug "${post.slug}" already exists.`);
	}
	const next = [...posts];
	next[index] = post;
	await savePosts(next);
	return post;
}

export async function deleteBlogPost(slug: string): Promise<void> {
	const posts = loadBlogPosts();
	const next = posts.filter((post) => post.slug !== slug);
	if (next.length === posts.length) {
		throw new ContentNotFoundError(`Blog post "${slug}" was not found.`);
	}
	await savePosts(next);
}

export async function setBlogPostPublished(slug: string, published: boolean): Promise<BlogPost> {
	const existing = findBlogPostBySlug(slug);
	if (!existing) {
		throw new ContentNotFoundError(`Blog post "${slug}" was not found.`);
	}
	return updateBlogPost(slug, {
		...existing,
		published,
		updated_at: utcNowIso(),
		published_at: published && !existing.published ? utcTodayDate() : existing.published_at
	});
}
