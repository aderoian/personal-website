<script lang="ts">
	import { formatBlogDate, type BlogPost } from '$lib/schemas/blog-post';

	let {
		post,
		utmSource = 'blog'
	}: {
		post: BlogPost;
		utmSource?: string;
	} = $props();

	const href = $derived(`/blog/${post.slug}?utm_source=${encodeURIComponent(utmSource)}`);
</script>

<article class="panel card-lift group flex h-full flex-col p-5">
	<p class="text-accent mb-2 font-mono text-xs">{formatBlogDate(post.published_at)}</p>
	<h2 class="text-text mb-2 text-lg font-semibold">
		<a {href} class="hover:text-accent">{post.title}</a>
	</h2>
	<p class="text-text-muted mb-4 flex-1 text-sm">{post.summary}</p>
	<a {href} class="text-accent text-sm font-medium hover:text-white">Read post →</a>
</article>
