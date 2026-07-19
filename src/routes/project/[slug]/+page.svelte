<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import Button from '$lib/components/Button.svelte';
	import ProseContent from '$lib/components/ProseContent.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const project = $derived(data.project);
</script>

<SeoHead
	meta={{
		title: project.title,
		description: project.summary,
		path: `/project/${project.slug}`
	}}
/>

<article>
	<header class="border-border mb-8 border-b pb-8">
		<p class="mb-2 text-sm">
			<a href="/projects" class="text-accent font-mono">← Projects</a>
		</p>
		<h1 class="text-text mb-2 text-3xl font-semibold md:text-4xl">{project.title}</h1>
		{#if project.year}
			<p class="text-text-muted mb-4 font-mono text-sm">{project.year}</p>
		{/if}
		{#if project.tags}
			<div class="mb-4">
				<TagList tags={project.tags} />
			</div>
		{/if}
		<ul class="flex flex-wrap gap-3">
			{#if project.demo_url}
				<li>
					<Button href={project.demo_url} variant="primary">Live demo</Button>
				</li>
			{/if}
			{#if project.repo_url}
				<li>
					<Button href={project.repo_url}>Repository</Button>
				</li>
			{/if}
		</ul>
	</header>

	<figure class="panel mb-8 overflow-hidden">
		<img
			src={data.image}
			alt=""
			width="960"
			height="540"
			loading="lazy"
			class="w-full object-cover"
		/>
	</figure>

	<ProseContent html={data.bodyHtml} />

	{#if project.demo_embed_src}
		<section class="panel mt-10 p-6" aria-labelledby="demo-heading">
			<h2 id="demo-heading" class="text-text mb-2 text-xl font-semibold">Embedded demo</h2>
			<p class="text-text-muted mb-4 text-sm">
				External content shown in a restricted frame.
				{#if project.demo_url}
					Prefer <a href={project.demo_url} target="_blank" rel="noopener noreferrer"
						>opening the demo in a new tab</a
					>.
				{/if}
			</p>
			<div class="border-border overflow-hidden rounded border">
				<iframe
					src={project.demo_embed_src}
					title="Demo: {project.title}"
					class="bg-bg-elevated aspect-video w-full"
					loading="lazy"
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
				></iframe>
			</div>
		</section>
	{/if}
</article>
