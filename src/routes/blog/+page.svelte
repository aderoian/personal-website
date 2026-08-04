<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogCollectionCard from '$lib/components/BlogCollectionCard.svelte';
	import BlogSearchBar from '$lib/components/BlogSearchBar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { collectBlogTags, matchesBlogSearch } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let selectedTags = $state<string[]>([]);

	const availableTags = $derived(collectBlogTags([...data.collections, ...data.posts]));

	const filteredCollections = $derived(
		data.collections.filter((collection) => matchesBlogSearch(collection, query, selectedTags))
	);
	const filteredPosts = $derived(
		data.posts.filter((post) => matchesBlogSearch(post, query, selectedTags))
	);

	const hasFilter = $derived(query.trim().length > 0 || selectedTags.length > 0);
	const noResults = $derived(filteredCollections.length === 0 && filteredPosts.length === 0);
</script>

<SeoHead
	meta={{
		title: 'Blog',
		description: 'Writing about projects, engineering notes, and things I’m learning.',
		path: '/blog'
	}}
/>

<PageHeader
	title="Blog"
	lede="Writing about projects, engineering notes, and things I’m learning."
>
	<BlogSearchBar bind:query bind:selectedTags tags={availableTags} />
</PageHeader>

{#if noResults}
	<EmptyState
		message={hasFilter ? 'No collections or articles match your search.' : 'No posts yet.'}
	/>
{:else}
	{#if filteredCollections.length > 0}
		<section class="mb-12">
			<div class="mb-4">
				<h2 class="text-text text-xl font-semibold">Collections</h2>
				<p class="text-text-muted text-sm">Curated groups of related posts.</p>
			</div>
			<ul class="motion-stagger grid gap-6 sm:grid-cols-2">
				{#each filteredCollections as collection (collection.slug)}
					<li>
						<BlogCollectionCard {collection} />
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section>
		{#if data.collections.length > 0}
			<div class="mb-4">
				<h2 class="text-text text-xl font-semibold">Articles</h2>
				<p class="text-text-muted text-sm">All published posts.</p>
			</div>
		{/if}

		{#if filteredPosts.length === 0}
			<EmptyState
				message={hasFilter ? 'No articles match your search.' : 'No posts yet.'}
			/>
		{:else}
			<ul class="motion-stagger grid gap-6 sm:grid-cols-2">
				{#each filteredPosts as post (post.slug)}
					<li>
						<BlogCard {post} />
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
