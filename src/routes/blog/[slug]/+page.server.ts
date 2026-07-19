import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { getBlogPostBySlug } from '$lib/server/content/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const post = getBlogPostBySlug(params.slug);

	if (!post) {
		error(404, 'Post not found');
	}

	return {
		post,
		bodyHtml: renderMarkdown(post.body)
	};
};
