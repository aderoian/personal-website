<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Button from '$lib/components/Button.svelte';
</script>

<SeoHead
	meta={{
		title: 'Gildenkrieg',
		description:
			'Gildenkrieg — a strategic multiplayer experience built around guild warfare, territory control, and emergent team tactics.',
		path: '/gildenkrieg'
	}}
/>

<PageHeader
	title="Gildenkrieg"
	lede="A strategic multiplayer experience built around guild warfare, territory control, and emergent team tactics. This page uses placeholder content you can replace with real project details."
/>

<section class="mb-10 grid gap-6 md:grid-cols-3">
	<article class="panel p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Guild campaigns</h2>
		<p class="text-text-muted text-sm">
			Persistent world state where guilds claim territory, forge alliances, and compete across
			seasons. Replace this with your actual campaign loop and progression systems.
		</p>
	</article>
	<article class="panel p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Tactical combat</h2>
		<p class="text-text-muted text-sm">
			Combat designed for coordinated team play — roles, positioning, and timing matter. Add
			screenshots, gameplay clips, or design notes here.
		</p>
	</article>
	<article class="panel p-6">
		<h2 class="text-text mb-2 text-lg font-semibold">Live operations</h2>
		<p class="text-text-muted text-sm">
			Modular backend architecture to support matchmaking, analytics, and live content updates.
			Document your stack and deployment approach when ready.
		</p>
	</article>
</section>

<section class="panel-glow p-6 md:p-8">
	<h2 class="text-text mb-3 text-xl font-semibold">Status</h2>
	<p class="text-text-muted mb-6 max-w-2xl">
		Gildenkrieg is currently in active development. This section will be updated with alpha/beta
		details, media, and links to repositories or community channels as they become available.
	</p>
	<div class="flex flex-wrap gap-3">
		<Button href="/contact" variant="primary">Get in touch</Button>
		<Button href="/projects">View other projects</Button>
	</div>
</section>
