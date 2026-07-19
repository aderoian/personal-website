import { redirect } from '@sveltejs/kit';
import { clearAdminSessionCookie } from '$lib/server/auth';
import { loadBlogPosts } from '$lib/server/content/blog';
import { loadProjects } from '$lib/server/content/projects';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.adminAuthenticated) {
		redirect(303, '/admin/login');
	}

	return {
		projects: loadProjects(),
		posts: loadBlogPosts()
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		clearAdminSessionCookie(cookies);
		redirect(303, '/admin/login');
	}
};
