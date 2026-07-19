import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createBlogPost,
	getBlogPostBySlug,
	getPublishedBlogPosts,
	loadBlogPosts
} from '$lib/server/content/blog';
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

	it('returns empty published blog posts after test post removal', () => {
		expect(getPublishedBlogPosts()).toHaveLength(0);
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

		expect(loadBlogPosts()).toHaveLength(2);
		expect(getPublishedBlogPosts()).toHaveLength(1);
		expect(getBlogPostBySlug('draft')).toBeUndefined();
		expect(getBlogPostBySlug('hello')?.title).toBe('Hello');
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
});
