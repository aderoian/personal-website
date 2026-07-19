import { fail, redirect } from '@sveltejs/kit';
import { emptyProjectFormValues } from '$lib/admin-forms';
import {
	checkboxChecked,
	optionalInt,
	parseTagsInput,
	safeParseFields
} from '$lib/server/admin-form';
import { ContentConflictError, createProject } from '$lib/server/content/projects';
import { projectSchema } from '$lib/schemas/project';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		values: emptyProjectFormValues()
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const values = {
			slug: String(formData.get('slug') ?? ''),
			title: String(formData.get('title') ?? ''),
			short_description: String(formData.get('short_description') ?? ''),
			summary: String(formData.get('summary') ?? ''),
			body: String(formData.get('body') ?? ''),
			image: String(formData.get('image') ?? ''),
			featured_order: String(formData.get('featured_order') ?? ''),
			year: String(formData.get('year') ?? ''),
			tags: String(formData.get('tags') ?? ''),
			repo_url: String(formData.get('repo_url') ?? ''),
			demo_url: String(formData.get('demo_url') ?? ''),
			demo_embed_src: String(formData.get('demo_embed_src') ?? ''),
			published: checkboxChecked(formData.get('published'))
		};

		const parsed = safeParseFields(projectSchema, {
			slug: values.slug,
			title: values.title,
			short_description: values.short_description,
			summary: values.summary,
			body: values.body,
			image: values.image,
			featured_order: optionalInt(formData.get('featured_order')),
			year: optionalInt(formData.get('year')),
			tags: parseTagsInput(formData.get('tags')),
			repo_url: values.repo_url,
			demo_url: values.demo_url,
			demo_embed_src: values.demo_embed_src,
			published: values.published
		});

		if (!parsed.success) {
			return fail(400, {
				values,
				errors: parsed.fields,
				formError: 'Please fix the highlighted fields.'
			});
		}

		try {
			const project = await createProject(parsed.data);
			redirect(303, `/admin/projects/${project.slug}`);
		} catch (error) {
			if (error instanceof ContentConflictError) {
				return fail(409, {
					values,
					errors: { slug: error.message },
					formError: error.message
				});
			}
			throw error;
		}
	}
};
