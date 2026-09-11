<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const links = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/projects/new', label: 'New project' },
		{ href: '/admin/blog/new', label: 'New post' },
		{ href: '/admin/blog/collections/new', label: 'New collection' },
		{ href: '/admin/updates/new', label: 'New update' }
	] as const;

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/admin') return path === '/admin';
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<div class="admin-shell mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
	<header
		class="border-border mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-4"
	>
		<div>
			<p class="text-accent font-mono text-xs tracking-wide uppercase">Admin</p>
			<h1 class="text-text text-2xl font-semibold">Content management</h1>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<ThemeToggle />
			{#if data.adminAuthenticated}
				<nav class="flex flex-wrap items-center gap-2" aria-label="Admin">
					{#each links as link (link.href)}
						<a
							href={link.href}
							class="btn px-3 py-1.5 text-sm {isActive(link.href)
								? 'border-accent text-accent'
								: ''}"
							aria-current={isActive(link.href) ? 'page' : undefined}
						>
							{link.label}
						</a>
					{/each}
					<form method="POST" action="/admin?/logout">
						<button type="submit" class="btn px-3 py-1.5 text-sm">Log out</button>
					</form>
				</nav>
			{/if}
		</div>
	</header>

	{@render children()}
</div>
