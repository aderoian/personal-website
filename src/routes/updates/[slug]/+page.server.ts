import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { resolveContinuedReading } from '$lib/schemas/update-post';
import { getPublishedUpdatePosts, getUpdatePostBySlug } from '$lib/server/content/updates';
import { recordUpdateView } from '$lib/server/content/update-analytics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const post = getUpdatePostBySlug(params.slug);

	if (!post) {
		error(404, 'Update not found');
	}

	try {
		await recordUpdateView(post.slug, url.searchParams.get('utm_source'));
	} catch (err) {
		console.error('Failed to record update view', err);
	}

	const published = getPublishedUpdatePosts();

	return {
		post,
		bodyHtml: renderMarkdown(post.body),
		continuedReading: resolveContinuedReading(post, published) ?? null
	};
};
