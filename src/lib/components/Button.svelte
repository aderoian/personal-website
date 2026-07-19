<script lang="ts">
	import type { Snippet } from 'svelte';
	import { EXTERNAL_LINK_REL, isExternalHref } from '$lib/links';

	let {
		href,
		variant = 'default',
		class: className = '',
		children
	}: {
		href?: string;
		variant?: 'default' | 'primary';
		class?: string;
		children: Snippet;
	} = $props();

	const external = $derived(isExternalHref(href));
</script>

{#if href}
	<a
		{href}
		class="{variant === 'primary' ? 'btn-primary' : 'btn'} {className}"
		target={external ? '_blank' : undefined}
		rel={external ? EXTERNAL_LINK_REL : undefined}
	>
		{@render children()}
	</a>
{:else}
	<button type="button" class="{variant === 'primary' ? 'btn-primary' : 'btn'} {className}">
		{@render children()}
	</button>
{/if}
