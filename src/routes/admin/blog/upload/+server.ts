import { json } from '@sveltejs/kit';
import { BlogImageUploadError, saveBlogImageUpload } from '$lib/server/content/blog-images';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.adminAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Invalid multipart form data.' }, { status: 400 });
	}

	const file = formData.get('image');
	if (!(file instanceof File)) {
		return json({ error: 'Choose an image file to upload.' }, { status: 400 });
	}

	try {
		const saved = await saveBlogImageUpload(file);
		return json(saved);
	} catch (err) {
		if (err instanceof BlogImageUploadError) {
			return json({ error: err.message }, { status: 400 });
		}
		throw err;
	}
};
