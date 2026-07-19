import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { getProjectBySlug } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = getProjectBySlug(params.slug);

	if (!project) {
		error(404, 'Project not found');
	}

	return {
		project,
		bodyHtml: renderMarkdown(project.body)
	};
};
