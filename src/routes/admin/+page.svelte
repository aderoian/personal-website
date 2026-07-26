<script lang="ts">
	import AnalyticsBarChart from '$lib/components/admin/AnalyticsBarChart.svelte';
	import AnalyticsDonutChart from '$lib/components/admin/AnalyticsDonutChart.svelte';
	import { formatBlogDate } from '$lib/schemas/blog-post';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const postBars = $derived(
		data.analytics.posts.map((post) => ({
			label: post.title,
			value: post.total,
			href: `/admin/analytics/${post.slug}`
		}))
	);

	const sourceSlices = $derived(
		data.analytics.sourcesList.map((entry) => ({
			label: entry.source,
			value: entry.count
		}))
	);

	const viewsBySlug = $derived(
		new Map(data.analytics.posts.map((post) => [post.slug, post.total]))
	);
</script>

<section class="mb-10">
	<div class="mb-4">
		<h2 class="text-text text-xl font-semibold">Blog analytics</h2>
		<p class="text-text-muted text-sm">
			{data.analytics.total}
			{data.analytics.total === 1 ? 'view' : 'views'} across all posts
		</p>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<div class="panel p-4 sm:p-5">
			<h3 class="text-text mb-4 text-sm font-semibold tracking-wide uppercase">Views by post</h3>
			<AnalyticsBarChart items={postBars} emptyLabel="No blog views recorded yet." />
		</div>
		<div class="panel p-4 sm:p-5">
			<h3 class="text-text mb-4 text-sm font-semibold tracking-wide uppercase">Traffic by source</h3>
			<AnalyticsDonutChart slices={sourceSlices} emptyLabel="No blog views recorded yet." />
		</div>
	</div>
</section>

<section class="mb-10">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-text text-xl font-semibold">Projects</h2>
			<p class="text-text-muted text-sm">{data.projects.length} total</p>
		</div>
		<a href="/admin/projects/new" class="btn-primary">New project</a>
	</div>

	{#if data.projects.length === 0}
		<p class="text-text-muted panel p-4 text-sm">No projects yet.</p>
	{:else}
		<ul class="divide-border panel divide-y overflow-hidden">
			{#each data.projects as project (project.slug)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<a href="/admin/projects/{project.slug}" class="text-text font-medium hover:underline">
							{project.title}
						</a>
						<p class="text-text-muted font-mono text-xs">{project.slug}</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="chip {project.published ? '' : 'opacity-60'}">
							{project.published ? 'Published' : 'Draft'}
						</span>
						<form method="POST" action="/admin/projects/{project.slug}?/togglePublish">
							<button type="submit" class="btn px-3 py-1 text-xs">
								{project.published ? 'Unpublish' : 'Publish'}
							</button>
						</form>
						<a href="/admin/projects/{project.slug}" class="btn px-3 py-1 text-xs">Edit</a>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-text text-xl font-semibold">Blog posts</h2>
			<p class="text-text-muted text-sm">{data.posts.length} total</p>
		</div>
		<a href="/admin/blog/new" class="btn-primary">New post</a>
	</div>

	{#if data.posts.length === 0}
		<p class="text-text-muted panel p-4 text-sm">No blog posts yet.</p>
	{:else}
		<ul class="divide-border panel divide-y overflow-hidden">
			{#each data.posts as post (post.slug)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<a href="/admin/blog/{post.slug}" class="text-text font-medium hover:underline">
							{post.title}
						</a>
						<p class="text-text-muted font-mono text-xs">
							{post.slug} · {formatBlogDate(post.published_at)} ·
							{viewsBySlug.get(post.slug) ?? 0}
							{(viewsBySlug.get(post.slug) ?? 0) === 1 ? 'view' : 'views'}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="chip {post.published ? '' : 'opacity-60'}">
							{post.published ? 'Published' : 'Draft'}
						</span>
						<form method="POST" action="/admin/blog/{post.slug}?/togglePublish">
							<button type="submit" class="btn px-3 py-1 text-xs">
								{post.published ? 'Unpublish' : 'Publish'}
							</button>
						</form>
						<a href="/admin/analytics/{post.slug}" class="btn px-3 py-1 text-xs">Analytics</a>
						<a href="/admin/blog/{post.slug}" class="btn px-3 py-1 text-xs">Edit</a>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
