import type { ZodError, ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

export function fieldErrorsFromZod(error: ZodError): FieldErrors {
	const fields: FieldErrors = {};
	for (const issue of error.issues) {
		const key = issue.path.map(String).join('.') || '_form';
		if (!fields[key]) {
			fields[key] = issue.message;
		}
	}
	return fields;
}

export function parseTagsInput(raw: FormDataEntryValue | null): string[] | undefined {
	if (typeof raw !== 'string') return undefined;
	const tags = raw
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
	return tags.length > 0 ? tags : undefined;
}

/** Ordered post slugs from repeated `posts` form fields. Drops empties; keeps first-seen order. */
export function parsePostsFromForm(formData: FormData): string[] {
	const seen = new Set<string>();
	const posts: string[] = [];
	for (const raw of formData.getAll('posts')) {
		if (typeof raw !== 'string') continue;
		const slug = raw.trim();
		if (!slug || seen.has(slug)) continue;
		seen.add(slug);
		posts.push(slug);
	}
	return posts;
}

export function optionalNumber(raw: FormDataEntryValue | null): number | undefined {
	if (typeof raw !== 'string' || raw.trim() === '') return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : Number.NaN;
}

export function optionalInt(raw: FormDataEntryValue | null): number | undefined {
	const value = optionalNumber(raw);
	if (value === undefined) return undefined;
	return Number.isInteger(value) ? value : Number.NaN;
}

export function checkboxChecked(raw: FormDataEntryValue | null): boolean {
	return raw === 'on' || raw === 'true' || raw === '1';
}

export function safeParseFields<T>(
	schema: ZodType<T>,
	input: unknown
): { success: true; data: T } | { success: false; fields: FieldErrors } {
	const result = schema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, fields: fieldErrorsFromZod(result.error) };
}
