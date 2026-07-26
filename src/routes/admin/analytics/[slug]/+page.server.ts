import { error, redirect } from '@sveltejs/kit';
import { getPostAnalytics } from '$lib/server/content/blog-analytics';
import { findBlogPostBySlug } from '$lib/server/content/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.adminAuthenticated) {
		redirect(303, '/admin/login');
	}

	const post = findBlogPostBySlug(params.slug);
	const analytics = getPostAnalytics(params.slug);

	if (!post && analytics.total === 0) {
		error(404, 'Post not found');
	}

	return {
		post: post
			? { slug: post.slug, title: post.title, published: post.published }
			: { slug: params.slug, title: params.slug, published: false },
		analytics
	};
};
