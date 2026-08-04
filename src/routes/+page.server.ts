import { site } from '$lib/config';
import { getLatestPublishedBlogPosts } from '$lib/server/content/blog';
import { getFeaturedProjects } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		featured: getFeaturedProjects(site.topProjectsCount),
		latestPosts: getLatestPublishedBlogPosts(2)
	};
};
