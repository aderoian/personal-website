<script lang="ts">
	import BlogForm from '$lib/components/admin/BlogForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h2 class="text-text text-xl font-semibold">Edit blog post</h2>
		<p class="text-text-muted font-mono text-sm">{data.post.slug}</p>
	</div>
	{#if data.post.published}
		<a href="/blog/{data.post.slug}" class="btn text-sm" target="_blank" rel="noopener noreferrer">
			View public page
		</a>
	{/if}
</div>

<BlogForm
	mode="edit"
	slug={data.post.slug}
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
	postOptions={data.postOptions}
/>
