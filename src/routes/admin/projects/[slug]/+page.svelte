<script lang="ts">
	import ProjectForm from '$lib/components/admin/ProjectForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h2 class="text-text text-xl font-semibold">Edit project</h2>
		<p class="text-text-muted font-mono text-sm">{data.project.slug}</p>
	</div>
	{#if data.project.published}
		<a
			href="/project/{data.project.slug}"
			class="btn text-sm"
			target="_blank"
			rel="noopener noreferrer"
		>
			View public page
		</a>
	{/if}
</div>

<ProjectForm
	mode="edit"
	slug={data.project.slug}
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
/>
