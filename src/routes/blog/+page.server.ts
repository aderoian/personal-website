import { getPublishedBlogPosts } from '$lib/server/content/blog';
import { getPublishedBlogCollections } from '$lib/server/content/blog-collections';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		collections: getPublishedBlogCollections(),
		posts: getPublishedBlogPosts()
	};
};
