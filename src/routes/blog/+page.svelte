<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
/>

{#if data.posts.length === 0}
	<EmptyState message="No posts yet." />
{:else}
	<ul class="motion-stagger grid gap-6 sm:grid-cols-2">
		{#each data.posts as post (post.slug)}
			<li>
				<BlogCard {post} />
			</li>
		{/each}
	</ul>
{/if}
