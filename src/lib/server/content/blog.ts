import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	blogFileSchema,
	blogPostSchema,
	publishedBlogPosts,
	sortBlogPosts,
	type BlogPost
} from '$lib/schemas/blog-post';

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');

function readJson(path: string): unknown {
	const raw = readFileSync(path, 'utf8');
	return JSON.parse(raw) as unknown;
}

export function loadBlogPosts(): BlogPost[] {
	const path = join(DATA_DIR, 'blog.json');
	const parsed = blogFileSchema.parse(readJson(path));
	return sortBlogPosts(parsed);
}

export function getPublishedBlogPosts(): BlogPost[] {
	return publishedBlogPosts(loadBlogPosts());
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
	return loadBlogPosts().find((post) => post.slug === slug && post.published);
}

export function validateBlogPost(post: unknown): BlogPost {
	return blogPostSchema.parse(post);
}
