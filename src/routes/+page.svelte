<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Button from '$lib/components/Button.svelte';
	import { site } from '$lib/config';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SeoHead
	meta={{
		title: 'Home',
		description:
			'Armen Deroian — systems and software engineer building efficient, scalable software from network servers and game engines to developer tooling.',
		path: '/'
	}}
/>

<section class="mb-16 grid items-start gap-10 md:grid-cols-[1fr_auto]">
	<div class="motion-stagger space-y-4">
		<p class="chip w-fit">{site.tagline}</p>
		<h1 class="text-text text-4xl font-semibold tracking-tight md:text-5xl">
			Hi, I’m {site.name}
		</h1>
		<p class="text-text-muted max-w-2xl text-lg">
			I’m a systems and software engineer focused on building efficient, scalable, and reliable
			software from network servers and game engines to developer tooling. I enjoy working on a wide
			range of projects, from small tools to large systems. My work emphasizes clean architecture,
			predictable behavior under load, and practical performance.
		</p>
		<p class="text-text-muted max-w-2xl">
			This site is a snapshot of what I’ve been building or have worked on. Explore featured work
			below or browse the <a href="/projects">full project list</a>. You can also view write-ups in
			the <a href="/blog">blog</a>. If you’re interested in a project, reach out via
			<a href="/contact">contact</a>.
		</p>
	</div>
	<ProfileAvatar />
</section>

<section
	class="panel-glow panel-glow-pulse motion-fade-up motion-delay-2 mb-16 overflow-hidden p-6 md:p-8"
	aria-labelledby="gildenkrieg-heading"
>
	<div class="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
		<div>
			<p class="text-accent-secondary mb-2 font-mono text-xs tracking-[0.2em] uppercase">
				Featured initiative
			</p>
			<h2 id="gildenkrieg-heading" class="text-text mb-3 text-2xl font-semibold">Gildenkrieg</h2>
			<p class="text-text-muted mb-4 max-w-xl">
				A strategic MMO experience taking place across the universe built around guild warfare, empire building,
				territory control, and emergent team tactics.
			</p>
			<ul class="text-text-muted mb-6 space-y-2 text-sm">
				<li class="flex items-start gap-2">
					<span class="bg-accent mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
					></span>
					Universal scale: single shared procedurally generated persistent universe
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-accent mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
					></span>
					Empire building: command every layer of their empire
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-accent mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
					></span>
					Tactical combat: first-person or RTS-style team-driven fleet combat
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-accent mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
					></span>
					Universe exploration: immense, uncharted universe with procedurally generated content
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-accent mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
					></span>
					Rogue enterprise: operate as an independent individual in a player-driven economy
				</li>
			</ul>
			<Button href="/gildenkrieg" variant="primary">Explore Gildenkrieg →</Button>
		</div>
		<div
			class="border-accent-secondary/30 bg-bg-elevated hidden h-40 w-40 rounded-lg border md:block"
			aria-hidden="true"
		>
			<div
				class="text-accent-secondary/60 flex h-full items-center justify-center font-mono text-5xl"
			>
				GK
			</div>
		</div>
	</div>
</section>

<section class="motion-fade-up motion-delay-3" aria-labelledby="featured-heading">
	<div class="border-border mb-6 flex items-end justify-between gap-4 border-b pb-4">
		<h2 id="featured-heading" class="text-text text-2xl font-semibold">Featured projects</h2>
		<a href="/projects" class="text-accent text-sm font-medium hover:text-white">View all →</a>
	</div>

	{#if data.featured.length === 0}
		<EmptyState message="No projects to show yet—check back soon." />
	{:else}
		<ul class="motion-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.featured as project (project.slug)}
				<li>
					<ProjectCard {project} />
				</li>
			{/each}
		</ul>
	{/if}
</section>
