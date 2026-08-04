<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogSearchBar from '$lib/components/BlogSearchBar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { collectBlogTags, matchesBlogSearch } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const collection = $derived(data.collection);

	let query = $state('');
	let selectedTags = $state<string[]>([]);

	const availableTags = $derived(collectBlogTags(data.posts));
	const filteredPosts = $derived(
		data.posts.filter((post) => matchesBlogSearch(post, query, selectedTags))
	);
	const hasFilter = $derived(query.trim().length > 0 || selectedTags.length > 0);
</script>

<SeoHead
	meta={{
		title: collection.title,
		description: collection.summary,
		path: `/blog/collections/${collection.slug}`
	}}
/>

<article class="mx-auto max-w-4xl">
	<header class="panel motion-fade-up mb-8 !bg-bg-elevated p-6 backdrop-blur-none md:p-10">
		<p class="mb-2 text-sm">
			<a href="/blog" class="text-accent font-mono">← Blog</a>
		</p>
		<h1 class="text-text mb-3 text-3xl font-semibold md:text-4xl">{collection.title}</h1>
		<p class="text-text-muted mb-4 text-base md:text-lg">{collection.summary}</p>
		{#if collection.tags}
			<div class="mb-6">
				<TagList tags={collection.tags} />
			</div>
		{/if}
		<BlogSearchBar bind:query bind:selectedTags tags={availableTags} />
	</header>

	{#if data.posts.length === 0}
		<EmptyState message="No published posts in this collection yet." />
	{:else if filteredPosts.length === 0}
		<EmptyState message={hasFilter ? 'No articles match your search.' : 'No posts yet.'} />
	{:else}
		<ul class="motion-stagger grid gap-6 sm:grid-cols-2">
			{#each filteredPosts as post (post.slug)}
				<li>
					<BlogCard {post} utmSource="collection" />
				</li>
			{/each}
		</ul>
	{/if}
</article>
