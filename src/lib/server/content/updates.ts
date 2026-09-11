import { existsSync } from 'node:fs';
import {
	isUpdatePostPubliclyVisible,
	publishedUpdatePosts,
	sortUpdatePosts,
	updateFileSchema,
	updatePostSchema,
	utcTodayDateString,
	type UpdatePost
} from '$lib/schemas/update-post';
import { ContentConflictError, ContentNotFoundError } from './errors';
import { atomicWriteJson, dataPath, readJsonFile, withWriteLock } from './json-store';

export { ContentConflictError, ContentNotFoundError };

function updatesFilePath(): string {
	return dataPath('updates.json');
}

function readAllPosts(): UpdatePost[] {
	const path = updatesFilePath();
	if (!existsSync(path)) {
		return [];
	}
	const parsed = updateFileSchema.parse(readJsonFile(path));
	return sortUpdatePosts(parsed);
}

async function savePosts(posts: UpdatePost[]): Promise<UpdatePost[]> {
	const validated = updateFileSchema.parse(posts);
	const sorted = sortUpdatePosts(validated);
	await withWriteLock(() => {
		atomicWriteJson(updatesFilePath(), sorted);
	});
	return sorted;
}

export function loadUpdatePosts(): UpdatePost[] {
	return readAllPosts();
}

export function getPublishedUpdatePosts(): UpdatePost[] {
	return publishedUpdatePosts(loadUpdatePosts());
}

export function getLatestPublishedUpdatePosts(limit = 2): UpdatePost[] {
	const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
	return getPublishedUpdatePosts().slice(0, count);
}

export function getUpdatePostBySlug(slug: string): UpdatePost | undefined {
	const today = utcTodayDateString();
	return loadUpdatePosts().find(
		(post) => post.slug === slug && isUpdatePostPubliclyVisible(post, today)
	);
}

export function findUpdatePostBySlug(slug: string): UpdatePost | undefined {
	return loadUpdatePosts().find((post) => post.slug === slug);
}

export function validateUpdatePost(post: unknown): UpdatePost {
	return updatePostSchema.parse(post);
}

export function utcNowIso(): string {
	return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function utcTodayDate(): string {
	return utcTodayDateString();
}

export async function createUpdatePost(input: unknown): Promise<UpdatePost> {
	const post = updatePostSchema.parse(input);
	const posts = loadUpdatePosts();
	if (posts.some((existing) => existing.slug === post.slug)) {
		throw new ContentConflictError(`An update with slug "${post.slug}" already exists.`);
	}
	await savePosts([...posts, post]);
	return post;
}

export async function updateUpdatePost(slug: string, input: unknown): Promise<UpdatePost> {
	const post = updatePostSchema.parse(input);
	const posts = loadUpdatePosts();
	const index = posts.findIndex((existing) => existing.slug === slug);
	if (index === -1) {
		throw new ContentNotFoundError(`Update "${slug}" was not found.`);
	}
	if (post.slug !== slug && posts.some((existing) => existing.slug === post.slug)) {
		throw new ContentConflictError(`An update with slug "${post.slug}" already exists.`);
	}
	const next = [...posts];
	next[index] = post;
	await savePosts(next);
	return post;
}

export async function deleteUpdatePost(slug: string): Promise<void> {
	const posts = loadUpdatePosts();
	const next = posts.filter((post) => post.slug !== slug);
	if (next.length === posts.length) {
		throw new ContentNotFoundError(`Update "${slug}" was not found.`);
	}
	await savePosts(next);
}

export async function setUpdatePostPublished(slug: string, published: boolean): Promise<UpdatePost> {
	const existing = findUpdatePostBySlug(slug);
	if (!existing) {
		throw new ContentNotFoundError(`Update "${slug}" was not found.`);
	}
	return updateUpdatePost(slug, {
		...existing,
		published,
		updated_at: utcNowIso(),
		published_at: published && !existing.published ? utcTodayDate() : existing.published_at
	});
}
