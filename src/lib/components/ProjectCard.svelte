<script lang="ts">
	import { projectEffectiveImage, toAssetUrl, type Project } from '$lib/schemas/project';

	let {
		project,
		headingLevel = 3
	}: {
		project: Project;
		headingLevel?: 2 | 3;
	} = $props();

	const image = $derived(toAssetUrl(projectEffectiveImage(project)));
</script>

<article class="panel-glow card-lift group flex h-full flex-col overflow-hidden">
	<a
		href="/project/{project.slug}"
		class="border-border bg-bg-elevated relative block aspect-video overflow-hidden border-b"
	>
		<img
			src={image}
			alt=""
			width="640"
			height="360"
			loading="lazy"
			class="h-full w-full object-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
		/>
		<div
			class="from-bg-panel/80 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
		></div>
	</a>
	<div class="flex flex-1 flex-col gap-3 p-5">
		{#if headingLevel === 2}
			<h2 class="text-text text-lg font-semibold">
				<a href="/project/{project.slug}" class="hover:text-accent">{project.title}</a>
			</h2>
		{:else}
			<h3 class="text-text text-lg font-semibold">
				<a href="/project/{project.slug}" class="hover:text-accent">{project.title}</a>
			</h3>
		{/if}
		{#if project.year}
			<p class="text-text-muted font-mono text-xs">{project.year}</p>
		{/if}
		<p class="text-text-muted flex-1 text-sm">
			{project.summary ?? project.short_description}
		</p>
		<a href="/project/{project.slug}" class="text-accent text-sm font-medium hover:text-white">
			{headingLevel === 2 ? 'Full project →' : 'Details →'}
		</a>
	</div>
</article>
