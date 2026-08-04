<script lang="ts">
	import type { BlogCollection } from '$lib/schemas/blog-collection';

	let {
		collection
	}: {
		collection: BlogCollection;
	} = $props();

	const href = $derived(`/blog/collections/${collection.slug}`);
</script>

<article class="panel card-lift group flex h-full flex-col p-5">
	<p class="text-accent mb-2 font-mono text-xs">
		{collection.posts.length}
		{collection.posts.length === 1 ? 'post' : 'posts'}
	</p>
	<h2 class="text-text mb-2 text-lg font-semibold">
		<a {href} class="hover:text-accent">{collection.title}</a>
	</h2>
	<p class="text-text-muted mb-4 flex-1 text-sm">{collection.summary}</p>
	<a {href} class="text-accent text-sm font-medium hover:text-white">View collection →</a>
</article>
