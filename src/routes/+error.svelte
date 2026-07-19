<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Armen Deroian</title>
</svelte:head>

<div class="panel p-8 text-center">
	<p class="text-accent mb-2 font-mono text-sm">// {page.status}</p>
	<h1 class="text-text mb-3 text-2xl font-semibold">
		{page.error?.message ?? 'Something went wrong'}
	</h1>
	<p class="text-text-muted">
		<a href="/">Return home</a>
	</p>
</div>
