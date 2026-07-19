import { fail, redirect } from '@sveltejs/kit';
import type { ContactFormFailure } from '$lib/contact-form';
import { emptyContactFormValues } from '$lib/contact-form';
import { contactFormSchema } from '$lib/schemas/contact';
import { isContactFormEnabled, sendContactMessage } from '$lib/server/mail';
import { site } from '$lib/config';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		formEnabled: isContactFormEnabled(),
		contact: site.contact
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		if (!isContactFormEnabled()) {
			return fail(404, {
				error: 'Not found',
				values: emptyContactFormValues
			} satisfies ContactFormFailure);
		}

		const formData = await request.formData();
		const raw = {
			name: formData.get('name'),
			email: formData.get('email'),
			message: formData.get('message'),
			website: formData.get('website')
		};

		const honeypot = typeof raw.website === 'string' ? raw.website.trim() : '';
		if (honeypot !== '') {
			throw redirect(303, '/contact?sent=1');
		}

		const lastSubmit = cookies.get('contact_last_submit');
		const lastTime = lastSubmit ? Number.parseInt(lastSubmit, 10) : 0;
		const now = Math.floor(Date.now() / 1000);
		if (lastTime > 0 && now - lastTime < 30) {
			return fail(429, {
				error: 'Please wait a moment before sending another message.',
				values: {
					name: String(raw.name ?? ''),
					email: String(raw.email ?? ''),
					message: String(raw.message ?? '')
				}
			} satisfies ContactFormFailure);
		}

		const parsed = contactFormSchema.safeParse({
			name: raw.name,
			email: raw.email,
			message: raw.message,
			website: raw.website
		});

		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? 'Invalid form submission.';
			return fail(400, {
				error: firstError,
				values: {
					name: String(raw.name ?? ''),
					email: String(raw.email ?? ''),
					message: String(raw.message ?? '')
				}
			} satisfies ContactFormFailure);
		}

		const result = await sendContactMessage({
			name: parsed.data.name,
			from: parsed.data.email,
			message: parsed.data.message,
			remoteAddr: getClientAddress(),
			userAgent: request.headers.get('user-agent') ?? undefined
		});

		if (!result.ok) {
			return fail(500, {
				error: result.error
					? `Message could not be sent: ${result.error}`
					: 'Message could not be sent. Please try again later.',
				values: {
					name: parsed.data.name,
					email: parsed.data.email,
					message: parsed.data.message
				}
			} satisfies ContactFormFailure);
		}

		cookies.set('contact_last_submit', String(now), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60
		});

		throw redirect(303, '/contact?sent=1');
	}
};
