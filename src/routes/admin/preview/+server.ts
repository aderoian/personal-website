import { json } from '@sveltejs/kit';
import { renderMarkdownPreview } from '$lib/markdown';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.adminAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	const source =
		typeof body === 'object' && body !== null && 'source' in body
			? (body as { source: unknown }).source
			: undefined;

	if (typeof source !== 'string') {
		return json({ error: 'source must be a string.' }, { status: 400 });
	}

	const result = renderMarkdownPreview(source);
	if (!result.ok) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ html: result.html });
};
