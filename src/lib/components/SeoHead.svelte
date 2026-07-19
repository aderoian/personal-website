<script lang="ts">
	import type { SeoMeta } from '$lib/seo';
	import { buildSeo } from '$lib/seo';

	let { meta }: { meta: SeoMeta } = $props();

	const seo = $derived(buildSeo(meta));
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<link rel="canonical" href={seo.url} />
	<meta property="og:title" content={seo.og.title} />
	<meta property="og:description" content={seo.og.description} />
	<meta property="og:url" content={seo.og.url} />
	<meta property="og:type" content={seo.og.type} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={seo.og.title} />
	<meta name="twitter:description" content={seo.og.description} />
</svelte:head>
