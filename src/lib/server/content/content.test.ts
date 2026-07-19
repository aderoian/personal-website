import { describe, expect, it } from 'vitest';
import { loadProjects, getProjectBySlug, getFeaturedProjects } from '$lib/server/content/projects';
import { getPublishedBlogPosts } from '$lib/server/content/blog';

describe('content loaders', () => {
	it('loads and validates all projects from data/projects.json', () => {
		const projects = loadProjects();
		expect(projects.length).toBeGreaterThan(0);
		expect(projects[0]?.slug).toBeTruthy();
	});

	it('returns featured projects in order', () => {
		const featured = getFeaturedProjects(3);
		expect(featured).toHaveLength(3);
		expect(featured[0]?.slug).toBe('synthorcha');
	});

	it('finds a project by slug', () => {
		const project = getProjectBySlug('stratos');
		expect(project?.title).toBe('Stratos');
	});

	it('returns empty published blog posts after test post removal', () => {
		expect(getPublishedBlogPosts()).toHaveLength(0);
	});
});
