import { getPublishedBlogPosts } from '$lib/server/content/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		posts: getPublishedBlogPosts()
	};
};
