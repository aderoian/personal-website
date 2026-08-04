import { error, fail, redirect } from '@sveltejs/kit';
import { blogCollectionToFormValues } from '$lib/admin-forms';
import {
	checkboxChecked,
	parsePostsFromForm,
	parseTagsInput,
	safeParseFields
} from '$lib/server/admin-form';
import { loadBlogPosts } from '$lib/server/content/blog';
import {
	ContentConflictError,
	ContentNotFoundError,
	deleteBlogCollection,
	findBlogCollectionBySlug,
	setBlogCollectionPublished,
	updateBlogCollection,
	utcNowIso
} from '$lib/server/content/blog-collections';
import { blogCollectionSchema } from '$lib/schemas/blog-collection';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const collection = findBlogCollectionBySlug(params.slug);
	if (!collection) {
		error(404, 'Collection not found');
	}

	return {
		collection,
		values: blogCollectionToFormValues(collection),
		availablePosts: loadBlogPosts().map((post) => ({
			slug: post.slug,
			title: post.title,
			published: post.published
		}))
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const existing = findBlogCollectionBySlug(params.slug);
		if (!existing) {
			error(404, 'Collection not found');
		}

		const formData = await request.formData();
		const posts = parsePostsFromForm(formData);
		const values = {
			slug: String(formData.get('slug') ?? ''),
			title: String(formData.get('title') ?? ''),
			summary: String(formData.get('summary') ?? ''),
			tags: String(formData.get('tags') ?? ''),
			posts,
			published: checkboxChecked(formData.get('published'))
		};

		const now = utcNowIso();
		const parsed = safeParseFields(blogCollectionSchema, {
			slug: values.slug,
			title: values.title,
			summary: values.summary,
			tags: parseTagsInput(formData.get('tags')),
			posts: values.posts,
			published: values.published,
			updated_at: now
		});

		if (!parsed.success) {
			return fail(400, {
				values,
				errors: parsed.fields,
				formError: 'Please fix the highlighted fields.'
			});
		}

		try {
			const collection = await updateBlogCollection(params.slug, parsed.data);
			redirect(303, `/admin/blog/collections/${collection.slug}`);
		} catch (err) {
			if (err instanceof ContentConflictError) {
				return fail(409, {
					values,
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
			await deleteBlogCollection(params.slug);
		} catch (err) {
			if (err instanceof ContentNotFoundError) {
				error(404, err.message);
			}
			throw err;
		}

		redirect(303, '/admin');
	},

	togglePublish: async ({ params }) => {
		const collection = findBlogCollectionBySlug(params.slug);
		if (!collection) {
			error(404, 'Collection not found');
		}

		await setBlogCollectionPublished(params.slug, !collection.published);
		redirect(303, '/admin');
	}
};
