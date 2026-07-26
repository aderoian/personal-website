<script lang="ts">
	export type BarChartItem = {
		label: string;
		value: number;
		href?: string;
	};

	let {
		items,
		emptyLabel = 'No views yet'
	}: {
		items: BarChartItem[];
		emptyLabel?: string;
	} = $props();

	const max = $derived(Math.max(0, ...items.map((item) => item.value)));
	const hasData = $derived(items.some((item) => item.value > 0));
</script>

{#if !hasData}
	<p class="text-text-muted py-8 text-center text-sm">{emptyLabel}</p>
{:else}
	<ul class="flex flex-col gap-3" aria-label="Bar chart">
		{#each items as item (item.label)}
			<li class="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
				{#if item.href}
					<a
						href={item.href}
						class="text-text truncate font-mono text-xs hover:underline"
						title={item.label}
					>
						{item.label}
					</a>
				{:else}
					<span class="text-text truncate font-mono text-xs" title={item.label}>{item.label}</span>
				{/if}
				<div
					class="bg-bg-elevated border-border h-3 overflow-hidden rounded-full border"
					role="presentation"
				>
					<div
						class="bg-accent h-full rounded-full transition-[width] duration-500 ease-out"
						style="width: {max > 0 ? (item.value / max) * 100 : 0}%"
					></div>
				</div>
				<span class="text-text-muted w-10 text-right font-mono text-xs tabular-nums">
					{item.value}
				</span>
			</li>
		{/each}
	</ul>
{/if}
