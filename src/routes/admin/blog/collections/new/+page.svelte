<script lang="ts">
	import BlogCollectionForm from '$lib/components/admin/BlogCollectionForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h2 class="text-text mb-6 text-xl font-semibold">New blog collection</h2>

<BlogCollectionForm
	mode="create"
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
	availablePosts={data.availablePosts}
/>
