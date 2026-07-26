<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		lede,
		children
	}: {
		title: string;
		lede?: string;
		children?: Snippet;
	} = $props();
</script>

<header class="panel motion-fade-up mb-10 p-6 md:p-8">
	<p class="text-accent mb-2 font-mono text-xs tracking-[0.2em] uppercase">// {title}</p>
	<h1 class="text-text mb-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
	{#if lede}
		<p class="motion-fade-up motion-delay-1 text-text-muted max-w-2xl text-lg">{lede}</p>
	{/if}
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</header>
