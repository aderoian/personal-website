import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const lastSubmit = event.cookies.get('contact_last_submit');
	event.locals.contactLastSubmit = lastSubmit ? Number.parseInt(lastSubmit, 10) : undefined;

	const sessionToken = event.cookies.get(ADMIN_SESSION_COOKIE);
	event.locals.adminAuthenticated = verifyAdminSessionToken(sessionToken);

	const path = event.url.pathname;
	const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
	const isLoginRoute = path === '/admin/login';
	const isPreviewApi = path === '/admin/preview';

	if (isAdminRoute && !isLoginRoute && !isPreviewApi && !event.locals.adminAuthenticated) {
		const next = encodeURIComponent(`${path}${event.url.search}`);
		redirect(303, `/admin/login?next=${next}`);
	}

	if (isLoginRoute && event.locals.adminAuthenticated) {
		redirect(303, '/admin');
	}

	const response = await resolve(event);

	if (isAdminRoute) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return response;
};
