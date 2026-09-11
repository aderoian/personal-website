<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	meta={{
		title: 'Planet',
		description: 'A procedural planet generated in the browser.',
		path: '/planet'
	}}
/>

<h1 class="sr-only">Planet</h1>

<a
	href="/"
	class="text-accent hover:text-text fixed top-4 left-4 z-50 font-mono text-sm no-underline"
>
	← Home
</a>
