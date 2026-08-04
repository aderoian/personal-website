import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createBlogPost,
	getBlogPostBySlug,
	getLatestPublishedBlogPost,
	getLatestPublishedBlogPosts,
	getPublishedBlogPosts,
	loadBlogPosts
} from '$lib/server/content/blog';
import {
	createBlogCollection,
	deleteBlogCollection,
	findBlogCollectionBySlug,
	getBlogCollectionBySlug,
	getPublishedBlogCollections,
	loadBlogCollections,
	setBlogCollectionPublished,
	updateBlogCollection
} from '$lib/server/content/blog-collections';
import {
	BlogImageUploadError,
	isSafeBlogImageFilename,
	saveBlogImageUpload
} from '$lib/server/content/blog-images';
import {
	createProject,
	deleteProject,
	getFeaturedProjects,
	getProjectBySlug,
	getPublishedProjects,
	loadProjects,
	updateProject
} from '$lib/server/content/projects';

describe('content loaders (repository data)', () => {
	const previousDataDir = process.env.DATA_DIR;

	beforeEach(() => {
		delete process.env.DATA_DIR;
	});

	afterEach(() => {
		if (previousDataDir === undefined) delete process.env.DATA_DIR;
		else process.env.DATA_DIR = previousDataDir;
	});

	it('loads and validates all projects from data/projects.json', () => {
		const projects = loadProjects();
		expect(projects.length).toBeGreaterThan(0);
		expect(projects[0]?.slug).toBeTruthy();
		expect(projects.every((project) => typeof project.published === 'boolean')).toBe(true);
	});

	it('returns featured projects in order', () => {
		const featured = getFeaturedProjects(3);
		expect(featured).toHaveLength(3);
		expect(featured[0]?.featured_order).toBeLessThanOrEqual(featured[1]?.featured_order ?? Infinity);
		expect(featured[1]?.featured_order).toBeLessThanOrEqual(featured[2]?.featured_order ?? Infinity);
	});

	it('finds a project by slug', () => {
		const project = getProjectBySlug('stratos');
		expect(project?.title).toBe('Stratos');
	});

	it('loads published blog posts from data/blog.json', () => {
		const posts = getPublishedBlogPosts();
		expect(posts.length).toBeGreaterThan(0);
		expect(posts.every((post) => post.published)).toBe(true);
	});

	it('loads blog collections from data/blog-collections.json', () => {
		const collections = loadBlogCollections();
		expect(Array.isArray(collections)).toBe(true);
		expect(collections.every((collection) => typeof collection.published === 'boolean')).toBe(
			true
		);
	});
});

describe('content repositories (temp DATA_DIR)', () => {
	const previousDataDir = process.env.DATA_DIR;
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'pw-content-'));
		process.env.DATA_DIR = tempDir;
		writeFileSync(join(tempDir, 'projects.json'), '[]\n', 'utf8');
		writeFileSync(join(tempDir, 'blog.json'), '[]\n', 'utf8');
		writeFileSync(join(tempDir, 'blog-collections.json'), '[]\n', 'utf8');
	});

	afterEach(() => {
		if (previousDataDir === undefined) delete process.env.DATA_DIR;
		else process.env.DATA_DIR = previousDataDir;
		rmSync(tempDir, { recursive: true, force: true });
	});

	const baseProject = {
		slug: 'alpha',
		title: 'Alpha',
		short_description: 'Short',
		summary: 'Summary',
		body: '<p>Body</p>',
		image: '',
		featured_order: 1,
		published: true
	};

	it('creates, updates, and deletes projects with atomic persistence', async () => {
		await createProject(baseProject);
		expect(loadProjects()).toHaveLength(1);
		expect(JSON.parse(readFileSync(join(tempDir, 'projects.json'), 'utf8'))).toHaveLength(1);

		await updateProject('alpha', { ...baseProject, title: 'Alpha 2', featured_order: 2 });
		expect(getProjectBySlug('alpha')?.title).toBe('Alpha 2');

		await deleteProject('alpha');
		expect(loadProjects()).toHaveLength(0);
	});

	it('rejects duplicate slugs', async () => {
		await createProject(baseProject);
		await expect(createProject({ ...baseProject, title: 'Other' })).rejects.toThrow(
			/already exists/
		);
	});

	it('filters drafts from public loaders', async () => {
		await createProject(baseProject);
		await createProject({
			...baseProject,
			slug: 'draft',
			featured_order: 0,
			published: false
		});

		expect(loadProjects()).toHaveLength(2);
		expect(getPublishedProjects().map((p) => p.slug)).toEqual(['alpha']);
		expect(getProjectBySlug('draft')).toBeUndefined();
		expect(getFeaturedProjects(5).map((p) => p.slug)).toEqual(['alpha']);
	});

	it('creates posts and filters unpublished from public loaders', async () => {
		await createBlogPost({
			slug: 'hello',
			title: 'Hello',
			summary: 'Summary',
			body: '# Hello',
			published: true,
			published_at: '2026-07-18',
			updated_at: '2026-07-18T12:00:00Z'
		});
		await createBlogPost({
			slug: 'draft',
			title: 'Draft',
			summary: 'Summary',
			body: '# Draft',
			published: false,
			published_at: '2026-07-18',
			updated_at: '2026-07-18T12:00:00Z'
		});
		await createBlogPost({
			slug: 'earlier',
			title: 'Earlier',
			summary: 'Summary',
			body: '# Earlier',
			published: true,
			published_at: '2026-07-10',
			updated_at: '2026-07-10T12:00:00Z'
		});

		expect(loadBlogPosts()).toHaveLength(3);
		expect(getPublishedBlogPosts()).toHaveLength(2);
		expect(getBlogPostBySlug('draft')).toBeUndefined();
		expect(getBlogPostBySlug('hello')?.title).toBe('Hello');
		expect(getLatestPublishedBlogPosts(2).map((post) => post.slug)).toEqual(['hello', 'earlier']);
		expect(getLatestPublishedBlogPosts(1).map((post) => post.slug)).toEqual(['hello']);
	});

	it('hides future-dated posts from public loaders and returns latest live post', async () => {
		await createBlogPost({
			slug: 'live',
			title: 'Live',
			summary: 'Summary',
			body: '# Live',
			published: true,
			published_at: '2026-07-01',
			updated_at: '2026-07-01T12:00:00Z'
		});
		await createBlogPost({
			slug: 'scheduled',
			title: 'Scheduled',
			summary: 'Summary',
			body: '# Scheduled',
			published: true,
			published_at: '2099-01-01',
			updated_at: '2026-07-01T12:00:00Z'
		});

		expect(getPublishedBlogPosts().map((post) => post.slug)).toEqual(['live']);
		expect(getBlogPostBySlug('scheduled')).toBeUndefined();
		expect(getLatestPublishedBlogPost()?.slug).toBe('live');
		expect(getLatestPublishedBlogPosts(2).map((post) => post.slug)).toEqual(['live']);
	});

	it('rejects duplicate blog slugs', async () => {
		const post = {
			slug: 'hello',
			title: 'Hello',
			summary: 'Summary',
			body: '# Hello',
			published: true,
			published_at: '2026-07-18',
			updated_at: '2026-07-18T12:00:00Z'
		};
		await createBlogPost(post);
		await expect(createBlogPost(post)).rejects.toThrow(/already exists/);
	});

	it('creates, updates, publishes, and deletes blog collections', async () => {
		const base = {
			slug: 'devlog',
			title: 'Devlog',
			summary: 'Build notes',
			tags: ['devlog'],
			posts: ['hello', 'earlier'],
			published: false,
			updated_at: '2026-07-18T12:00:00Z'
		};

		await createBlogCollection(base);
		expect(loadBlogCollections()).toHaveLength(1);
		expect(JSON.parse(readFileSync(join(tempDir, 'blog-collections.json'), 'utf8'))).toHaveLength(
			1
		);
		expect(getPublishedBlogCollections()).toHaveLength(0);
		expect(getBlogCollectionBySlug('devlog')).toBeUndefined();
		expect(findBlogCollectionBySlug('devlog')?.title).toBe('Devlog');

		await updateBlogCollection('devlog', {
			...base,
			title: 'Devlog Series',
			posts: ['hello'],
			updated_at: '2026-07-19T12:00:00Z'
		});
		expect(findBlogCollectionBySlug('devlog')?.title).toBe('Devlog Series');
		expect(findBlogCollectionBySlug('devlog')?.posts).toEqual(['hello']);

		await setBlogCollectionPublished('devlog', true);
		expect(getPublishedBlogCollections().map((c) => c.slug)).toEqual(['devlog']);
		expect(getBlogCollectionBySlug('devlog')?.published).toBe(true);

		await deleteBlogCollection('devlog');
		expect(loadBlogCollections()).toHaveLength(0);
	});

	it('rejects duplicate blog collection slugs and empty post lists', async () => {
		const collection = {
			slug: 'series',
			title: 'Series',
			summary: 'Summary',
			posts: ['hello'],
			published: true,
			updated_at: '2026-07-18T12:00:00Z'
		};
		await createBlogCollection(collection);
		await expect(createBlogCollection(collection)).rejects.toThrow(/already exists/);
		await expect(
			createBlogCollection({
				...collection,
				slug: 'empty',
				posts: []
			})
		).rejects.toThrow();
	});

	it('rejects duplicate post refs within a collection', async () => {
		await expect(
			createBlogCollection({
				slug: 'dupes',
				title: 'Dupes',
				summary: 'Summary',
				posts: ['hello', 'hello'],
				published: true,
				updated_at: '2026-07-18T12:00:00Z'
			})
		).rejects.toThrow();
	});

	it('saves uploaded blog images with unique names and markdown/html refs', async () => {
		const file = new File([Uint8Array.from([137, 80, 78, 71])], 'My Cool Photo.PNG', {
			type: 'image/png'
		});
		const saved = await saveBlogImageUpload(file);

		expect(isSafeBlogImageFilename(saved.filename)).toBe(true);
		expect(saved.filename).toMatch(/-my-cool-photo\.png$/);
		expect(saved.url).toBe(`/assets/blog/${saved.filename}`);
		expect(saved.markdown).toBe(`![my cool photo](${saved.url})`);
		expect(saved.html).toBe(`<img src="${saved.url}" alt="my cool photo" />`);
		expect(existsSync(join(tempDir, 'blog-images', saved.filename))).toBe(true);
		expect(readFileSync(join(tempDir, 'blog-images', saved.filename))).toHaveLength(4);
	});

	it('rejects unsupported blog image uploads', async () => {
		const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
		await expect(saveBlogImageUpload(file)).rejects.toBeInstanceOf(BlogImageUploadError);
	});
});
