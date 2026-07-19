import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

export function isContactFormEnabled(): boolean {
	const to = env.CONTACT_FORM_TO_EMAIL?.trim() ?? '';
	return to !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
}

type SendContactMessageInput = {
	name: string;
	from: string;
	message: string;
	remoteAddr?: string;
	userAgent?: string;
};

export async function sendContactMessage(
	input: SendContactMessageInput
): Promise<{ ok: true } | { ok: false; error: string }> {
	const to = env.CONTACT_FORM_TO_EMAIL?.trim();
	if (!to) {
		return { ok: false, error: 'Contact form is not configured.' };
	}

	const subjectPrefix = env.CONTACT_FORM_SUBJECT_PREFIX?.trim() || '[Website]';
	const fromEmail = env.CONTACT_FORM_FROM_EMAIL?.trim() || to;

	const text = [
		`Name: ${input.name}`,
		`Email: ${input.from}`,
		input.remoteAddr ? `IP: ${input.remoteAddr}` : null,
		input.userAgent ? `User-Agent: ${input.userAgent}` : null,
		'',
		input.message
	]
		.filter(Boolean)
		.join('\n');

	const transportOptions = {
		host: env.CONTACT_SMTP_HOST?.trim() || undefined,
		port: env.CONTACT_SMTP_PORT ? Number(env.CONTACT_SMTP_PORT) : 587,
		secure: env.CONTACT_SMTP_ENCRYPTION === 'ssl',
		auth:
			env.CONTACT_SMTP_USERNAME && env.CONTACT_SMTP_PASSWORD
				? {
						user: env.CONTACT_SMTP_USERNAME,
						pass: env.CONTACT_SMTP_PASSWORD
					}
				: undefined,
		tls: env.CONTACT_SMTP_ENCRYPTION === 'tls' ? { rejectUnauthorized: true } : undefined
	};

	try {
		const transporter = nodemailer.createTransport(transportOptions);
		await transporter.sendMail({
			from: fromEmail,
			to,
			replyTo: input.from,
			subject: `${subjectPrefix} Message from ${input.name}`,
			text
		});
		return { ok: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown mail error';
		return { ok: false, error: message };
	}
}
