import { fail, redirect } from '@sveltejs/kit';
import {
	createAdminSessionToken,
	isAdminConfigured,
	setAdminSessionCookie,
	verifyAdminPassword
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		configured: isAdminConfigured(),
		adminAuthenticated: locals.adminAuthenticated
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (!isAdminConfigured()) {
			return fail(503, { error: 'Authentication failed.' });
		}

		const formData = await request.formData();
		const password = String(formData.get('password') ?? '');

		if (!verifyAdminPassword(password)) {
			return fail(401, { error: 'Authentication failed.' });
		}

		const token = createAdminSessionToken();
		if (!token) {
			return fail(503, { error: 'Authentication failed.' });
		}

		setAdminSessionCookie(cookies, token);

		const next = url.searchParams.get('next');
		const destination =
			next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
		redirect(303, destination);
	}
};
