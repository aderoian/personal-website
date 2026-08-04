import { error } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'node:fs';
import {
	blogImageFilePath,
	isSafeBlogImageFilename
} from '$lib/server/content/blog-images';
import type { RequestHandler } from './$types';

const CONTENT_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!isSafeBlogImageFilename(filename)) {
		error(404, 'Image not found');
	}

	const path = blogImageFilePath(filename);
	if (!existsSync(path)) {
		error(404, 'Image not found');
	}

	const ext = filename.split('.').pop() ?? '';
	const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
	const bytes = readFileSync(path);

	return new Response(bytes, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
