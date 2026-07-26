<script lang="ts">
	import AnalyticsBarChart from '$lib/components/admin/AnalyticsBarChart.svelte';
	import AnalyticsDonutChart from '$lib/components/admin/AnalyticsDonutChart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const sourceSlices = $derived(
		data.analytics.sourcesList.map((entry) => ({
			label: entry.source,
			value: entry.count
		}))
	);

	const sourceBars = $derived(
		data.analytics.sourcesList.map((entry) => ({
			label: entry.source,
			value: entry.count
		}))
	);

	function percent(count: number): string {
		if (data.analytics.total <= 0) return '0%';
		return `${((count / data.analytics.total) * 100).toFixed(1)}%`;
	}
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<p class="text-accent mb-1 font-mono text-xs tracking-wide uppercase">
			<a href="/admin" class="hover:underline">← Dashboard</a>
		</p>
		<h2 class="text-text text-xl font-semibold">{data.post.title}</h2>
		<p class="text-text-muted font-mono text-sm">
			{data.post.slug} · {data.analytics.total}
			{data.analytics.total === 1 ? 'view' : 'views'}
		</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#if data.post.published}
			<a
				href="/blog/{data.post.slug}"
				class="btn text-sm"
				target="_blank"
				rel="noopener noreferrer"
			>
				View public page
			</a>
		{/if}
		<a href="/admin/blog/{data.post.slug}" class="btn text-sm">Edit post</a>
	</div>
</div>

<div class="mb-6 grid gap-4 lg:grid-cols-2">
	<div class="panel p-4 sm:p-5">
		<h3 class="text-text mb-4 text-sm font-semibold tracking-wide uppercase">Traffic by source</h3>
		<AnalyticsDonutChart slices={sourceSlices} emptyLabel="No views for this post yet." />
	</div>
	<div class="panel p-4 sm:p-5">
		<h3 class="text-text mb-4 text-sm font-semibold tracking-wide uppercase">Source comparison</h3>
		<AnalyticsBarChart items={sourceBars} emptyLabel="No views for this post yet." />
	</div>
</div>

<section class="panel overflow-hidden">
	<div class="border-border border-b px-4 py-3">
		<h3 class="text-text text-sm font-semibold tracking-wide uppercase">Source breakdown</h3>
	</div>
	{#if data.analytics.sourcesList.length === 0}
		<p class="text-text-muted p-4 text-sm">No views recorded for this post yet.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[20rem] text-left text-sm">
				<thead>
					<tr class="border-border text-text-muted border-b font-mono text-xs tracking-wide uppercase">
						<th class="px-4 py-2.5 font-medium">Source</th>
						<th class="px-4 py-2.5 font-medium">Views</th>
						<th class="px-4 py-2.5 font-medium">Share</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.analytics.sourcesList as entry (entry.source)}
						<tr>
							<td class="text-text px-4 py-2.5 font-mono text-xs">{entry.source}</td>
							<td class="text-text px-4 py-2.5 font-mono text-xs tabular-nums">{entry.count}</td>
							<td class="text-text-muted px-4 py-2.5 font-mono text-xs tabular-nums">
								{percent(entry.count)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
