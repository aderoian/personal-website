<script lang="ts">
	import BlogCollectionForm from '$lib/components/admin/BlogCollectionForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h2 class="text-text text-xl font-semibold">Edit blog collection</h2>
		<p class="text-text-muted font-mono text-sm">{data.collection.slug}</p>
	</div>
	{#if data.collection.published}
		<a
			href="/blog/collections/{data.collection.slug}"
			class="btn text-sm"
			target="_blank"
			rel="noopener noreferrer"
		>
			View public page
		</a>
	{/if}
</div>

<BlogCollectionForm
	mode="edit"
	slug={data.collection.slug}
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
	availablePosts={data.availablePosts}
/>
