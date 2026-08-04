import { fail, redirect } from '@sveltejs/kit';
import { emptyBlogFormValues } from '$lib/admin-forms';
import { checkboxChecked, parseTagsInput, safeParseFields } from '$lib/server/admin-form';
import {
	ContentConflictError,
	createBlogPost,
	loadBlogPosts,
	utcNowIso,
	utcTodayDate
} from '$lib/server/content/blog';
import { blogPostSchema } from '$lib/schemas/blog-post';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		values: {
			...emptyBlogFormValues(),
			published_at: utcTodayDate()
		},
		postOptions: loadBlogPosts().map((post) => ({ slug: post.slug, title: post.title }))
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
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

		const publishedAt = values.published_at.trim() || utcTodayDate();
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
			const post = await createBlogPost(parsed.data);
			redirect(303, `/admin/blog/${post.slug}`);
		} catch (error) {
			if (error instanceof ContentConflictError) {
				return fail(409, {
					values: { ...values, published_at: publishedAt },
					errors: { slug: error.message },
					formError: error.message
				});
			}
			throw error;
		}
	}
};
