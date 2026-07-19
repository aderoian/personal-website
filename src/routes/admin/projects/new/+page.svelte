<script lang="ts">
	import ProjectForm from '$lib/components/admin/ProjectForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h2 class="text-text mb-6 text-xl font-semibold">New project</h2>

<ProjectForm
	mode="create"
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	formError={form?.formError ?? ''}
/>
