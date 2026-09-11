import { error, redirect } from '@sveltejs/kit';
import { getUpdateAnalytics } from '$lib/server/content/update-analytics';
import { findUpdatePostBySlug } from '$lib/server/content/updates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.adminAuthenticated) {
		redirect(303, '/admin/login');
	}

	const post = findUpdatePostBySlug(params.slug);
	const analytics = getUpdateAnalytics(params.slug);

	if (!post && analytics.total === 0) {
		error(404, 'Update not found');
	}

	return {
		post: post
			? { slug: post.slug, title: post.title, published: post.published }
			: { slug: params.slug, title: params.slug, published: false },
		analytics
	};
};
