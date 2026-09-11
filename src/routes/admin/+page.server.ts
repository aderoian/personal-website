import { redirect } from '@sveltejs/kit';
import { clearAdminSessionCookie } from '$lib/server/auth';
import { getOverallAnalytics } from '$lib/server/content/blog-analytics';
import { getOverallUpdateAnalytics } from '$lib/server/content/update-analytics';
import { loadBlogPosts } from '$lib/server/content/blog';
import { loadBlogCollections } from '$lib/server/content/blog-collections';
import { loadUpdatePosts } from '$lib/server/content/updates';
import { loadProjects } from '$lib/server/content/projects';
import type { OverallAnalytics, PostAnalyticsSummary } from '$lib/schemas/blog-analytics';
import type { Actions, PageServerLoad } from './$types';

type TitledPostAnalytics = PostAnalyticsSummary & { title: string };

function analyticsWithTitles(
	analytics: OverallAnalytics,
	posts: { slug: string; title: string }[]
): {
	total: number;
	sourcesList: OverallAnalytics['sourcesList'];
	posts: TitledPostAnalytics[];
} {
	const titleBySlug = new Map(posts.map((post) => [post.slug, post.title]));
	const postsWithTitles: TitledPostAnalytics[] = analytics.posts.map((entry) => ({
		...entry,
		title: titleBySlug.get(entry.slug) ?? entry.slug
	}));

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
		total: analytics.total,
		sourcesList: analytics.sourcesList,
		posts: postsWithTitles
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.adminAuthenticated) {
		redirect(303, '/admin/login');
	}

	const posts = loadBlogPosts();
	const updates = loadUpdatePosts();

	return {
		projects: loadProjects(),
		collections: loadBlogCollections(),
		posts,
		updates,
		blogAnalytics: analyticsWithTitles(getOverallAnalytics(), posts),
		updateAnalytics: analyticsWithTitles(getOverallUpdateAnalytics(), updates)
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearAdminSessionCookie(cookies);
		redirect(303, '/admin/login');
	}
};
