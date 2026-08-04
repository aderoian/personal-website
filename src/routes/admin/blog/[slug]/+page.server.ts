import { error, fail, redirect } from '@sveltejs/kit';
import { blogToFormValues } from '$lib/admin-forms';
import { checkboxChecked, parseTagsInput, safeParseFields } from '$lib/server/admin-form';
import {
	ContentConflictError,
	ContentNotFoundError,
	deleteBlogPost,
	findBlogPostBySlug,
	loadBlogPosts,
	setBlogPostPublished,
	updateBlogPost,
	utcNowIso,
	utcTodayDate
} from '$lib/server/content/blog';
import { blogPostSchema } from '$lib/schemas/blog-post';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const post = findBlogPostBySlug(params.slug);
	if (!post) {
		error(404, 'Post not found');
	}

	return {
		post,
		values: blogToFormValues(post),
		postOptions: loadBlogPosts().map((entry) => ({ slug: entry.slug, title: entry.title }))
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const existing = findBlogPostBySlug(params.slug);
		if (!existing) {
			error(404, 'Post not found');
		}

		const formData = await request.formData();
		const values = {
			slug: String(formData.get('slug') ?? ''),
			title: String(formData.get('title') ?? ''),
			summary: String(formData.get('summary') ?? ''),
			body: String(formData.get('body') ?? ''),
			published: checkboxChecked(formData.get('published')),
			published_at: String(formData.get('published_at') ?? ''),
			tags: String(formData.get('tags') ?? ''),
			continued_reading: String(formData.get('continued_reading') ?? '')
		};

		const publishedAt = values.published_at.trim() || existing.published_at || utcTodayDate();
		const now = utcNowIso();

		const parsed = safeParseFields(blogPostSchema, {
			slug: values.slug,
			title: values.title,
			summary: values.summary,
			body: values.body,
			published: values.published,
			published_at: publishedAt,
			updated_at: now,
			tags: parseTagsInput(formData.get('tags')),
			continued_reading: values.continued_reading
		});

		if (!parsed.success) {
			return fail(400, {
				values: { ...values, published_at: publishedAt },
				errors: parsed.fields,
				formError: 'Please fix the highlighted fields.'
			});
		}

		try {
			const post = await updateBlogPost(params.slug, parsed.data);
			redirect(303, `/admin/blog/${post.slug}`);
		} catch (err) {
			if (err instanceof ContentConflictError) {
				return fail(409, {
					values: { ...values, published_at: publishedAt },
					errors: { slug: err.message },
					formError: err.message
				});
			}
			if (err instanceof ContentNotFoundError) {
				error(404, err.message);
			}
			throw err;
		}
	},

	delete: async ({ request, params }) => {
		const formData = await request.formData();
		if (!checkboxChecked(formData.get('confirm'))) {
			return fail(400, { formError: 'Confirm deletion before continuing.' });
		}

		try {
			await deleteBlogPost(params.slug);
		} catch (err) {
			if (err instanceof ContentNotFoundError) {
				error(404, err.message);
			}
			throw err;
		}

		redirect(303, '/admin');
	},

	togglePublish: async ({ params }) => {
		const post = findBlogPostBySlug(params.slug);
		if (!post) {
			error(404, 'Post not found');
		}

		await setBlogPostPublished(params.slug, !post.published);
		redirect(303, '/admin');
	}
};
