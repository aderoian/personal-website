<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import ProseContent from '$lib/components/ProseContent.svelte';
	import { formatBlogDate } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const post = $derived(data.post);
</script>

<SeoHead
	meta={{
		title: post.title,
		description: post.summary,
		path: `/blog/${post.slug}`
	}}
/>

<article class="panel mx-auto max-w-4xl !bg-bg-elevated p-6 md:p-10 backdrop-blur-none">
	<header class="border-border mb-8 border-b pb-8">
		<p class="mb-2 text-sm">
			<a href="/blog" class="text-accent font-mono">← Blog</a>
		</p>
		<h1 class="text-text mb-2 text-3xl font-semibold md:text-4xl">{post.title}</h1>
		<p class="text-accent mb-4 font-mono text-sm">{formatBlogDate(post.published_at)}</p>
		{#if post.tags}
			<TagList tags={post.tags} />
		{/if}
	</header>

	<ProseContent html={data.bodyHtml} />
</article>
