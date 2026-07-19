import { describe, expect, it } from 'vitest';
import { cycleThemePreference, resolveTheme } from '$lib/theme';

describe('theme helpers', () => {
	it('cycles system → light → dark → system', () => {
		expect(cycleThemePreference('system')).toBe('light');
		expect(cycleThemePreference('light')).toBe('dark');
		expect(cycleThemePreference('dark')).toBe('system');
	});

	it('resolves explicit preferences without reading the system', () => {
		expect(resolveTheme('light')).toBe('light');
		expect(resolveTheme('dark')).toBe('dark');
	});
});
