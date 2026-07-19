<script lang="ts">
	import { onMount } from 'svelte';
	import {
		applyTheme,
		cycleThemePreference,
		persistThemePreference,
		readThemePreference,
		type ResolvedTheme,
		type ThemePreference
	} from '$lib/theme';

	let preference = $state<ThemePreference>('system');
	let resolved = $state<ResolvedTheme>('dark');
	let ready = $state(false);

	onMount(() => {
		preference = readThemePreference();
		resolved = applyTheme(preference);
		ready = true;

		const media = window.matchMedia('(prefers-color-scheme: light)');
		const onChange = () => {
			if (preference === 'system') {
				resolved = applyTheme('system');
			}
		};
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	});

	function toggle() {
		preference = cycleThemePreference(preference);
		resolved = persistThemePreference(preference);
	}

	const label = $derived(
		preference === 'system'
			? `Theme: system (${resolved}). Click for light.`
			: preference === 'light'
				? 'Theme: light. Click for dark.'
				: 'Theme: dark. Click for system.'
	);
</script>

<button
	type="button"
	class="btn px-3 py-2"
	onclick={toggle}
	aria-label={label}
	title={label}
	disabled={!ready}
>
	{#if resolved === 'light'}
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" stroke-width="2" />
			<path
				stroke-linecap="round"
				stroke-width="2"
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
	{:else}
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z"
			/>
		</svg>
	{/if}
	{#if preference === 'system'}
		<span class="text-text-muted hidden font-mono text-[10px] tracking-wide uppercase sm:inline"
			>Auto</span
		>
	{/if}
</button>
