<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SeoHead
	meta={{
		title: 'Projects',
		description:
			'Open source and personal projects by Armen Deroian — from game servers and physics engines to developer tooling.',
		path: '/projects'
	}}
/>

<PageHeader
	title="Projects"
	lede="Below is a full list of projects I am currently working on or have worked on in the past. Most of them are open source and available on GitHub. Click on a project to learn more about it. If you are interested in a project, feel free to reach out to me."
/>

{#if data.projects.length === 0}
	<EmptyState message="No projects yet." />
{:else}
	<ul class="grid gap-6 sm:grid-cols-2">
		{#each data.projects as project (project.slug)}
			<li>
				<ProjectCard {project} headingLevel={2} />
			</li>
		{/each}
	</ul>
{/if}
