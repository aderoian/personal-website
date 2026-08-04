import { redirect } from '@sveltejs/kit';
import { clearAdminSessionCookie } from '$lib/server/auth';
import { getOverallAnalytics } from '$lib/server/content/blog-analytics';
import { loadBlogPosts } from '$lib/server/content/blog';
import { loadBlogCollections } from '$lib/server/content/blog-collections';
import { loadProjects } from '$lib/server/content/projects';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.adminAuthenticated) {
		redirect(303, '/admin/login');
	}

	const posts = loadBlogPosts();
	const analytics = getOverallAnalytics();
	const titleBySlug = new Map(posts.map((post) => [post.slug, post.title]));

	const postsWithTitles = analytics.posts.map((entry) => ({
		...entry,
		title: titleBySlug.get(entry.slug) ?? entry.slug
	}));

	// Include published/draft posts that have zero views so the bar chart is complete.
	const trackedSlugs = new Set(analytics.posts.map((entry) => entry.slug));
	for (const post of posts) {
		if (!trackedSlugs.has(post.slug)) {
			postsWithTitles.push({
				slug: post.slug,
				title: post.title,
				total: 0,
				sources: {},
				sourcesList: []
			});
		}
	}

	postsWithTitles.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));

	return {
		projects: loadProjects(),
		collections: loadBlogCollections(),
		posts,
		analytics: {
			total: analytics.total,
			sourcesList: analytics.sourcesList,
			posts: postsWithTitles
		}
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearAdminSessionCookie(cookies);
		redirect(303, '/admin/login');
	}
};
