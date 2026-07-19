<script lang="ts">
	import { page } from '$app/state';
	import { navItems, site } from '$lib/config';

	let mobileOpen = $state(false);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(`${href}/`);
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<header class="border-border/80 bg-bg/90 sticky top-0 z-50 border-b backdrop-blur-md">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
		<a href="/" class="group text-text hover:text-accent flex items-center gap-2 no-underline">
			<span
				class="border-accent/40 bg-bg-elevated text-accent flex h-8 w-8 items-center justify-center rounded border font-mono text-xs"
				aria-hidden="true"
			>
				AD
			</span>
			<span class="font-semibold tracking-tight">{site.name}</span>
		</a>

		<nav class="hidden md:block" aria-label="Main">
			<ul class="flex items-center gap-1">
				{#each navItems as item (item.id)}
					<li>
						<a
							href={item.href}
							class="rounded px-3 py-2 text-sm transition-colors {isActive(item.href)
								? 'bg-accent/10 text-accent'
								: 'text-text-muted hover:text-text'}"
							aria-current={isActive(item.href) ? 'page' : undefined}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<button
			type="button"
			class="btn px-3 py-2 md:hidden"
			aria-expanded={mobileOpen}
			aria-controls="mobile-nav"
			onclick={() => (mobileOpen = !mobileOpen)}
		>
			<span class="sr-only">Toggle menu</span>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				aria-hidden="true"
			>
				{#if mobileOpen}
					<path stroke-linecap="round" stroke-width="2" d="M6 6l12 12M18 6L6 18" />
				{:else}
					<path stroke-linecap="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16" />
				{/if}
			</svg>
		</button>
	</div>

	{#if mobileOpen}
		<nav id="mobile-nav" class="border-border border-t md:hidden" aria-label="Mobile">
			<ul class="mx-auto max-w-6xl px-4 py-2">
				{#each navItems as item (item.id)}
					<li>
						<a
							href={item.href}
							class="block rounded px-3 py-3 text-sm {isActive(item.href)
								? 'bg-accent/10 text-accent'
								: 'text-text-muted'}"
							aria-current={isActive(item.href) ? 'page' : undefined}
							onclick={closeMobile}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>
