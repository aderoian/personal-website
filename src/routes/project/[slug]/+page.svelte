<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import Button from '$lib/components/Button.svelte';
	import ProseContent from '$lib/components/ProseContent.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const project = $derived(data.project);
	const demoEmbedSrc = $derived(project.demo_embed_src?.trim() || undefined);
</script>

<SeoHead
	meta={{
		title: project.title,
		description: project.summary,
		path: `/project/${project.slug}`
	}}
/>

<article class="motion-fade-up">
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

	{#if demoEmbedSrc}
		<section class="panel mb-8 overflow-hidden" aria-labelledby="demo-heading">
			<div class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
				<h2 id="demo-heading" class="text-text text-sm font-semibold">Live demo</h2>
				{#if project.demo_url}
					<a
						href={project.demo_url}
	target="_blank"
						rel="noopener noreferrer"
						class="text-accent font-mono text-xs"
					>
						Open in new tab ↗
					</a>
				{/if}
			</div>
			<iframe
				src={demoEmbedSrc}
				title="Demo: {project.title}"
				class="bg-bg-elevated aspect-video w-full"
				loading="lazy"
				referrerpolicy="strict-origin-when-cross-origin"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gamepad; gyroscope; web-share"
				allowfullscreen
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
			></iframe>
		</section>
	{/if}

	<ProseContent html={data.bodyHtml} />
</article>
