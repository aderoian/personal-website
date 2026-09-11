import { describe, expect, it } from 'vitest';
import {
	featuredProjects,
	projectEffectiveImage,
	projectSchema,
	publishedProjects,
	sortProjects
} from '$lib/schemas/project';
import {
	blogPostSchema,
	collectBlogTags,
	featuredBlogPosts,
	formatBlogDate,
	isBlogPostPubliclyVisible,
	matchesBlogSearch,
	publishedBlogPosts,
	resolveContinuedReading,
	sortBlogPosts
} from '$lib/schemas/blog-post';
import { contactFormSchema } from '$lib/schemas/contact';

const sampleProject = {
	slug: 'test-project',
	title: 'Test Project',
	short_description: 'Short',
	summary: 'Summary',
	body: '<p>Body</p>',
	image: '',
	featured_order: 2,
	year: 2026,
	tags: ['TypeScript'],
	repo_url: 'https://github.com/example/repo',
	published: true
};

const samplePost = {
	slug: 'hello-world',
	title: 'Hello',
	summary: 'Summary',
	body: '# Hello',
	published: true,
	published_at: '2026-07-18',
	updated_at: '2026-07-18T12:00:00Z'
};

describe('project schema', () => {
	it('validates a complete project', () => {
		expect(projectSchema.parse(sampleProject)).toMatchObject({
			slug: 'test-project',
			published: true
		});
	});

	it('defaults published to true when omitted', () => {
		const withoutPublished = {
			slug: sampleProject.slug,
			title: sampleProject.title,
			short_description: sampleProject.short_description,
			summary: sampleProject.summary,
			body: sampleProject.body,
			image: sampleProject.image,
			featured_order: sampleProject.featured_order,
			year: sampleProject.year,
			tags: sampleProject.tags,
			repo_url: sampleProject.repo_url
		};
		expect(projectSchema.parse(withoutPublished).published).toBe(true);
	});

	it('rejects invalid slugs', () => {
		expect(() => projectSchema.parse({ ...sampleProject, slug: 'Bad Slug' })).toThrow();
	});

	it('sorts by featured_order then slug', () => {
		const sorted = sortProjects([
			{ ...sampleProject, slug: 'b', featured_order: 2 },
			{ ...sampleProject, slug: 'a', featured_order: 1 }
		]);
		expect(sorted.map((p) => p.slug)).toEqual(['a', 'b']);
	});

	it('filters unpublished projects from public helpers', () => {
		const projects = [
			{ ...sampleProject, slug: 'a', featured_order: 1, published: true },
			{ ...sampleProject, slug: 'draft', featured_order: 0, published: false },
			{ ...sampleProject, slug: 'b', featured_order: 2, published: true }
		];
		expect(publishedProjects(projects).map((p) => p.slug)).toEqual(['a', 'b']);
		expect(featuredProjects(projects, 3).map((p) => p.slug)).toEqual(['a', 'b']);
	});

	it('returns featured subset', () => {
		const featured = featuredProjects(
			[
				{ ...sampleProject, slug: 'a', featured_order: 1 },
				{ ...sampleProject, slug: 'b', featured_order: 2 },
				{ ...sampleProject, slug: 'c', featured_order: 3 },
				{ ...sampleProject, slug: 'd', featured_order: 4 }
			],
			3
		);
		expect(featured).toHaveLength(3);
	});

	it('assigns stable placeholder images', () => {
		const image = projectEffectiveImage({ ...sampleProject, image: '' });
		expect(image).toMatch(/^assets\/projects\/placeholders\//);
	});
});

describe('blog schema', () => {
	it('validates a blog post', () => {
		expect(blogPostSchema.parse(samplePost).slug).toBe('hello-world');
	});

	it('filters unpublished posts', () => {
		const posts = publishedBlogPosts(
			[samplePost, { ...samplePost, slug: 'draft', published: false }],
			'2026-07-18'
		);
		expect(posts).toHaveLength(1);
	});

	it('hides future-dated published posts until their date', () => {
		const posts = publishedBlogPosts(
			[
				samplePost,
				{
					...samplePost,
					slug: 'scheduled',
					published: true,
					published_at: '2026-12-01'
				}
			],
			'2026-07-18'
		);
		expect(posts.map((post) => post.slug)).toEqual(['hello-world']);
		expect(
			isBlogPostPubliclyVisible(
				{ ...samplePost, slug: 'scheduled', published_at: '2026-12-01' },
				'2026-07-18'
			)
		).toBe(false);
		expect(
			isBlogPostPubliclyVisible(
				{ ...samplePost, slug: 'scheduled', published_at: '2026-12-01' },
				'2026-12-01'
			)
		).toBe(true);
	});

	it('sorts by published_at descending', () => {
		const sorted = sortBlogPosts([
			{ ...samplePost, slug: 'older', published_at: '2026-01-01' },
			{ ...samplePost, slug: 'newer', published_at: '2026-07-01' }
		]);
		expect(sorted[0]?.slug).toBe('newer');
	});

	it('formats blog dates', () => {
		expect(formatBlogDate('2026-07-18')).toContain('2026');
	});

	it('accepts optional continued_reading slug', () => {
		expect(
			blogPostSchema.parse({ ...samplePost, continued_reading: 'another-post' }).continued_reading
		).toBe('another-post');
		expect(blogPostSchema.parse({ ...samplePost, continued_reading: '' }).continued_reading).toBe(
			undefined
		);
	});

	it('filters by selected tags then title search', () => {
		const post = { title: 'Gildenkrieg Simulation Devlog', tags: ['gamedev', 'cpp'] };
		expect(matchesBlogSearch(post, '', [])).toBe(true);
		expect(matchesBlogSearch(post, '', ['gamedev'])).toBe(true);
		expect(matchesBlogSearch(post, '', ['networking'])).toBe(false);
		expect(matchesBlogSearch(post, '', ['networking', 'cpp'])).toBe(true);
		expect(matchesBlogSearch(post, 'gildenkrieg', ['gamedev'])).toBe(true);
		expect(matchesBlogSearch(post, 'gildenkrieg physics', ['gamedev'])).toBe(false);
		expect(matchesBlogSearch({ title: 'Untagged', tags: [] }, '', [])).toBe(true);
		expect(matchesBlogSearch({ title: 'Untagged', tags: [] }, '', ['gamedev'])).toBe(false);
	});

	it('collects unique sorted tags', () => {
		expect(
			collectBlogTags([
				{ tags: ['cpp', 'gamedev'] },
				{ tags: ['gamedev', 'ecs'] },
				{}
			])
		).toEqual(['cpp', 'ecs', 'gamedev']);
	});

	it('resolves continued reading with explicit then next then latest fallback', () => {
		const posts = sortBlogPosts([
			{ ...samplePost, slug: 'newest', published_at: '2026-07-03', title: 'Newest' },
			{ ...samplePost, slug: 'middle', published_at: '2026-07-02', title: 'Middle' },
			{ ...samplePost, slug: 'oldest', published_at: '2026-07-01', title: 'Oldest' }
		]);

		expect(resolveContinuedReading(posts[0]!, posts)?.slug).toBe('middle');
		expect(resolveContinuedReading(posts[2]!, posts)?.slug).toBe('newest');
		expect(
			resolveContinuedReading(
				{ ...posts[0]!, continued_reading: 'oldest' },
				posts
			)?.slug
		).toBe('oldest');
		expect(
			resolveContinuedReading({ ...posts[0]!, continued_reading: 'missing' }, posts)?.slug
		).toBe('middle');
	});

	it('accepts optional featured_order', () => {
		expect(blogPostSchema.parse({ ...samplePost, featured_order: 2 }).featured_order).toBe(2);
		expect(blogPostSchema.parse(samplePost).featured_order).toBeUndefined();
	});

	it('selects featured posts by featured_order, skipping unpublished and unfeatured', () => {
		const posts = [
			{ ...samplePost, slug: 'unfeatured', published_at: '2026-07-20' },
			{ ...samplePost, slug: 'draft', published: false, featured_order: 0 },
			{ ...samplePost, slug: 'second', featured_order: 2, published_at: '2026-07-19' },
			{ ...samplePost, slug: 'first', featured_order: 1, published_at: '2026-07-01' }
		];
		expect(featuredBlogPosts(posts, 3).map((post) => post.slug)).toEqual(['first', 'second']);
		expect(featuredBlogPosts(posts, 1).map((post) => post.slug)).toEqual(['first']);
	});
});

describe('contact schema', () => {
	it('validates contact form input', () => {
		const result = contactFormSchema.parse({
			name: 'Armen',
			email: 'test@example.com',
			message: 'Hello'
		});
		expect(result.name).toBe('Armen');
	});

	it('rejects empty messages', () => {
		expect(() =>
			contactFormSchema.parse({
				name: 'Armen',
				email: 'test@example.com',
				message: ''
			})
		).toThrow();
	});
});
