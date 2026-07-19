<script lang="ts">
	import type { Snippet } from 'svelte';

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
</script>

{#if href}
	<a {href} class="{variant === 'primary' ? 'btn-primary' : 'btn'} {className}">
		{@render children()}
	</a>
{:else}
	<button type="button" class="{variant === 'primary' ? 'btn-primary' : 'btn'} {className}">
		{@render children()}
	</button>
{/if}
