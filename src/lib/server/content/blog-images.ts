import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { dataPath } from './json-store';

export const BLOG_IMAGE_PUBLIC_PREFIX = '/assets/blog';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Map<string, string>([
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/gif', '.gif'],
	['image/webp', '.webp'],
	['image/svg+xml', '.svg']
]);

export class BlogImageUploadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BlogImageUploadError';
	}
}

export type SavedBlogImage = {
	filename: string;
	url: string;
	markdown: string;
	html: string;
};

function blogImagesDir(): string {
	return dataPath('blog-images');
}

function ensureBlogImagesDir(): string {
	const dir = blogImagesDir();
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	return dir;
}

function sanitizeBaseName(name: string): string {
	const withoutExt = name.replace(/\.[^.]+$/, '');
	const cleaned = withoutExt
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
	return cleaned || 'image';
}

function resolveExtension(file: File): string {
	const fromMime = ALLOWED_MIME_TYPES.get(file.type);
	if (fromMime) return fromMime;

	const fromName = extname(file.name).toLowerCase();
	const allowedExts = new Set(ALLOWED_MIME_TYPES.values());
	if (allowedExts.has(fromName)) return fromName;

	throw new BlogImageUploadError(
		'Unsupported image type. Use JPEG, PNG, GIF, WebP, or SVG.'
	);
}

export function blogImageFilePath(filename: string): string {
	return join(blogImagesDir(), filename);
}

export function isSafeBlogImageFilename(filename: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|png|gif|webp|svg)$/.test(filename);
}

export async function saveBlogImageUpload(file: File): Promise<SavedBlogImage> {
	if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) {
		throw new BlogImageUploadError('Choose an image file to upload.');
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		throw new BlogImageUploadError('Image must be 5 MB or smaller.');
	}

	const extension = resolveExtension(file);
	const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const unique = randomBytes(4).toString('hex');
	const base = sanitizeBaseName(file.name);
	const filename = `${stamp}-${unique}-${base}${extension}`;
	const bytes = Buffer.from(await file.arrayBuffer());
	const dir = ensureBlogImagesDir();
	writeFileSync(join(dir, filename), bytes);

	const url = `${BLOG_IMAGE_PUBLIC_PREFIX}/${filename}`;
	const alt = base.replace(/-/g, ' ');
	return {
		filename,
		url,
		markdown: `![${alt}](${url})`,
		html: `<img src="${url}" alt="${alt}" />`
	};
}
