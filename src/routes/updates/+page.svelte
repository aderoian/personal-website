<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogSearchBar from '$lib/components/BlogSearchBar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { collectBlogTags, matchesBlogSearch } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let selectedTags = $state<string[]>([]);

	const availableTags = $derived(collectBlogTags(data.posts));

	const filteredPosts = $derived(
		data.posts.filter((post) => matchesBlogSearch(post, query, selectedTags))
	);

	const hasFilter = $derived(query.trim().length > 0 || selectedTags.length > 0);
	const noResults = $derived(filteredPosts.length === 0);
</script>

<SeoHead
	meta={{
		title: 'Updates',
		description: 'Short notes, site news, and project status updates.',
		path: '/updates'
	}}
/>

<PageHeader title="Updates" lede="Short notes, site news, and project status updates.">
	<BlogSearchBar bind:query bind:selectedTags tags={availableTags} />
</PageHeader>

{#if noResults}
	<EmptyState message={hasFilter ? 'No updates match your search.' : 'No updates yet.'} />
{:else}
	<section>
		<ul class="motion-stagger grid gap-6 sm:grid-cols-2">
			{#each filteredPosts as post (post.slug)}
				<li>
					<BlogCard {post} kind="update" />
				</li>
			{/each}
		</ul>
	</section>
{/if}
