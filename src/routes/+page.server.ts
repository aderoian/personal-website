import { site } from '$lib/config';
import { getFeaturedProjects } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		featured: getFeaturedProjects(site.topProjectsCount)
	};
};
