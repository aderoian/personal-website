import {
	blogCollectionSchema,
	blogCollectionsFileSchema,
	publishedBlogCollections,
	sortBlogCollections,
	type BlogCollection
} from '$lib/schemas/blog-collection';
import { ContentConflictError, ContentNotFoundError } from './errors';
import { atomicWriteJson, dataPath, readJsonFile, withWriteLock } from './json-store';

export { ContentConflictError, ContentNotFoundError };

function collectionsFilePath(): string {
	return dataPath('blog-collections.json');
}

function readAllCollections(): BlogCollection[] {
	const parsed = blogCollectionsFileSchema.parse(readJsonFile(collectionsFilePath()));
	return sortBlogCollections(parsed);
}

async function saveCollections(collections: BlogCollection[]): Promise<BlogCollection[]> {
	const validated = blogCollectionsFileSchema.parse(collections);
	const sorted = sortBlogCollections(validated);
	await withWriteLock(() => {
		atomicWriteJson(collectionsFilePath(), sorted);
	});
	return sorted;
}

export function loadBlogCollections(): BlogCollection[] {
	return readAllCollections();
}

export function getPublishedBlogCollections(): BlogCollection[] {
	return publishedBlogCollections(loadBlogCollections());
}

export function getBlogCollectionBySlug(slug: string): BlogCollection | undefined {
	return loadBlogCollections().find(
		(collection) => collection.slug === slug && collection.published
	);
}

export function findBlogCollectionBySlug(slug: string): BlogCollection | undefined {
	return loadBlogCollections().find((collection) => collection.slug === slug);
}

export function validateBlogCollection(collection: unknown): BlogCollection {
	return blogCollectionSchema.parse(collection);
}

export function utcNowIso(): string {
	return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function createBlogCollection(input: unknown): Promise<BlogCollection> {
	const collection = blogCollectionSchema.parse(input);
	const collections = loadBlogCollections();
	if (collections.some((existing) => existing.slug === collection.slug)) {
		throw new ContentConflictError(
			`A blog collection with slug "${collection.slug}" already exists.`
		);
	}
	await saveCollections([...collections, collection]);
	return collection;
}

export async function updateBlogCollection(
	slug: string,
	input: unknown
): Promise<BlogCollection> {
	const collection = blogCollectionSchema.parse(input);
	const collections = loadBlogCollections();
	const index = collections.findIndex((existing) => existing.slug === slug);
	if (index === -1) {
		throw new ContentNotFoundError(`Blog collection "${slug}" was not found.`);
	}
	if (
		collection.slug !== slug &&
		collections.some((existing) => existing.slug === collection.slug)
	) {
		throw new ContentConflictError(
			`A blog collection with slug "${collection.slug}" already exists.`
		);
	}
	const next = [...collections];
	next[index] = collection;
	await saveCollections(next);
	return collection;
}

export async function deleteBlogCollection(slug: string): Promise<void> {
	const collections = loadBlogCollections();
	const next = collections.filter((collection) => collection.slug !== slug);
	if (next.length === collections.length) {
		throw new ContentNotFoundError(`Blog collection "${slug}" was not found.`);
	}
	await saveCollections(next);
}

export async function setBlogCollectionPublished(
	slug: string,
	published: boolean
): Promise<BlogCollection> {
	const existing = findBlogCollectionBySlug(slug);
	if (!existing) {
		throw new ContentNotFoundError(`Blog collection "${slug}" was not found.`);
	}
	return updateBlogCollection(slug, {
		...existing,
		published,
		updated_at: utcNowIso()
	});
}
