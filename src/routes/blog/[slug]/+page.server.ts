import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { getBlogPostBySlug } from '$lib/server/content/blog';
import { recordBlogView } from '$lib/server/content/blog-analytics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const post = getBlogPostBySlug(params.slug);

	if (!post) {
		error(404, 'Post not found');
	}

	try {
		await recordBlogView(post.slug, url.searchParams.get('utm_source'));
	} catch (err) {
		console.error('Failed to record blog view', err);
	}

	return {
		post,
		bodyHtml: renderMarkdown(post.body)
	};
};
