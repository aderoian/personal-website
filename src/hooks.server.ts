import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const lastSubmit = event.cookies.get('contact_last_submit');
	event.locals.contactLastSubmit = lastSubmit ? Number.parseInt(lastSubmit, 10) : undefined;

	return resolve(event);
};
