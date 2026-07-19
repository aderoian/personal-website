import { describe, expect, it } from 'vitest';
import { isExternalHref } from '$lib/links';

describe('isExternalHref', () => {
	it('detects http(s) URLs', () => {
		expect(isExternalHref('https://example.com')).toBe(true);
		expect(isExternalHref('http://example.com/path')).toBe(true);
	});

	it('treats internal and special schemes as non-external', () => {
		expect(isExternalHref('/projects')).toBe(false);
		expect(isExternalHref('#section')).toBe(false);
		expect(isExternalHref('mailto:hi@example.com')).toBe(false);
		expect(isExternalHref(undefined)).toBe(false);
		expect(isExternalHref('')).toBe(false);
	});
});
