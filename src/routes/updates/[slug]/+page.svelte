<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import ProseContent from '$lib/components/ProseContent.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import { formatUpdateDate } from '$lib/schemas/update-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const post = $derived(data.post);
</script>

<SeoHead
	meta={{
		title: post.title,
		description: post.summary,
		path: `/updates/${post.slug}`
	}}
/>

<article class="panel motion-fade-up mx-auto max-w-4xl !bg-bg-elevated p-6 backdrop-blur-none md:p-10">
	<header class="border-border mb-8 border-b pb-8">
		<p class="mb-2 text-sm">
			<a href="/updates" class="text-accent font-mono">← Updates</a>
		</p>
		<h1 class="text-text mb-2 text-3xl font-semibold md:text-4xl">{post.title}</h1>
		<p class="text-accent mb-4 font-mono text-sm">{formatUpdateDate(post.published_at)}</p>
		{#if post.tags}
			<TagList tags={post.tags} />
		{/if}
	</header>

	<ProseContent html={data.bodyHtml} />

	{#if data.continuedReading}
		<footer class="border-border mt-10 border-t pt-8">
			<p class="text-accent mb-3 font-mono text-xs tracking-[0.2em] uppercase">
				Continue reading
			</p>
			<BlogCard post={data.continuedReading} kind="update" utmSource="continued_reading" />
		</footer>
	{/if}
</article>
