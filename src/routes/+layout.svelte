<script lang="ts">
	import '../app.css';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	const isAdmin = $derived(
		page.url.pathname === '/admin' || page.url.pathname.startsWith('/admin/')
	);

	onNavigate((navigation) => {
		if (
			typeof document === 'undefined' ||
			!document.startViewTransition ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			return;
		}

		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{#if isAdmin}
	{@render children()}
{:else}
	<a
		href="#main-content"
		class="focus:bg-accent focus:text-bg sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:px-4 focus:py-2"
	>
		Skip to main content
	</a>

	<div class="flex min-h-screen flex-col">
		<SiteHeader />
		<main
			id="main-content"
			class="motion-fade-up relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6 md:py-14"
		>
			{@render children()}
		</main>
		<SiteFooter />
	</div>
{/if}

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
