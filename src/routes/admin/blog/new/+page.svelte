<script lang="ts">
	import BlogForm from '$lib/components/admin/BlogForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h2 class="text-text mb-6 text-xl font-semibold">New blog post</h2>

<BlogForm
	mode="create"
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
	postOptions={data.postOptions}
/>
