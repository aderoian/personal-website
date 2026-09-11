import { getPublishedUpdatePosts } from '$lib/server/content/updates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		posts: getPublishedUpdatePosts()
	};
};
