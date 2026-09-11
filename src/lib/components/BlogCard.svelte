<script lang="ts">
	import { formatBlogDate, type BlogPost } from '$lib/schemas/blog-post';

	let {
		post,
		utmSource,
		kind = 'blog',
		showKind = false
	}: {
		post: BlogPost;
		utmSource?: string;
		kind?: 'blog' | 'update';
		showKind?: boolean;
	} = $props();

	const hrefBase = $derived(kind === 'update' ? '/updates' : '/blog');
	const source = $derived(utmSource ?? (kind === 'update' ? 'updates' : 'blog'));
	const href = $derived(`${hrefBase}/${post.slug}?utm_source=${encodeURIComponent(source)}`);
	const kindLabel = $derived(kind === 'update' ? 'Update' : 'Blog');
	const readLabel = $derived(kind === 'update' ? 'Read update →' : 'Read post →');
</script>

<article class="panel card-lift group flex h-full flex-col p-5">
	<div class="mb-2 flex items-center justify-between gap-2">
		<p class="text-accent font-mono text-xs">{formatBlogDate(post.published_at)}</p>
		{#if showKind}
			<span class="chip">{kindLabel}</span>
		{/if}
	</div>
	<h2 class="text-text mb-2 text-lg font-semibold">
		<a {href} class="hover:text-accent">{post.title}</a>
	</h2>
	<p class="text-text-muted mb-4 flex-1 text-sm">{post.summary}</p>
	<a {href} class="text-accent text-sm font-medium hover:text-white">{readLabel}</a>
</article>
