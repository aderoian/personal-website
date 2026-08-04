import { error } from '@sveltejs/kit';
import { isBlogPostPubliclyVisible, type BlogPost } from '$lib/schemas/blog-post';
import { loadBlogPosts } from '$lib/server/content/blog';
import { getBlogCollectionBySlug } from '$lib/server/content/blog-collections';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const collection = getBlogCollectionBySlug(params.slug);

	if (!collection) {
		error(404, 'Collection not found');
	}

	const postsBySlug = new Map(loadBlogPosts().map((post) => [post.slug, post]));
	const posts: BlogPost[] = [];
	for (const slug of collection.posts) {
		const post = postsBySlug.get(slug);
		if (post && isBlogPostPubliclyVisible(post)) {
			posts.push(post);
		}
	}

	return {
		collection,
		posts
	};
};
