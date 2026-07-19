export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

export function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function readThemePreference(): ThemePreference {
	if (typeof window === 'undefined') return 'system';
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	return preference === 'system' ? getSystemTheme() : preference;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
	const resolved = resolveTheme(preference);
	document.documentElement.dataset.theme = resolved;
	document.documentElement.style.colorScheme = resolved;
	return resolved;
}

export function persistThemePreference(preference: ThemePreference): ResolvedTheme {
	localStorage.setItem(THEME_STORAGE_KEY, preference);
	return applyTheme(preference);
}

export function cycleThemePreference(current: ThemePreference): ThemePreference {
	if (current === 'system') return 'light';
	if (current === 'light') return 'dark';
	return 'system';
}
