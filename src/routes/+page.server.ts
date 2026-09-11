import { site } from '$lib/config';
import { getFeaturedBlogPosts } from '$lib/server/content/blog';
import { getLatestPublishedArticles } from '$lib/server/content/latest';
import { getFeaturedProjects } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		featured: getFeaturedProjects(site.topProjectsCount),
		featuredPosts: getFeaturedBlogPosts(site.topBlogsCount),
		latestArticles: getLatestPublishedArticles(2)
	};
};
