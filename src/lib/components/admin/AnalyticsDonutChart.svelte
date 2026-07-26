<script lang="ts">
	export type DonutSlice = {
		label: string;
		value: number;
	};

	let {
		slices,
		emptyLabel = 'No views yet',
		size = 180
	}: {
		slices: DonutSlice[];
		emptyLabel?: string;
		size?: number;
	} = $props();

	const palette = [
		'var(--color-accent)',
		'var(--color-accent-secondary)',
		'var(--color-accent-dim)',
		'#7dd3a8',
		'#e0b35e',
		'#c98bb8',
		'#8ba3e0',
		'#e08b8b'
	];

	const total = $derived(slices.reduce((sum, slice) => sum + slice.value, 0));
	const hasData = $derived(total > 0);

	const radius = $derived(size / 2 - 8);
	const circumference = $derived(2 * Math.PI * radius);

	const arcs = $derived.by(() => {
		if (total <= 0) return [];
		let offset = 0;
		return slices
			.filter((slice) => slice.value > 0)
			.map((slice, index) => {
				const length = (slice.value / total) * circumference;
				const arc = {
					label: slice.label,
					value: slice.value,
					percent: (slice.value / total) * 100,
					dasharray: `${length} ${circumference - length}`,
					dashoffset: -offset,
					color: palette[index % palette.length]
				};
				offset += length;
				return arc;
			});
	});
</script>

{#if !hasData}
	<p class="text-text-muted py-8 text-center text-sm">{emptyLabel}</p>
{:else}
	<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
		<svg
			width={size}
			height={size}
			viewBox="0 0 {size} {size}"
			class="shrink-0"
			role="img"
			aria-label="Source share donut chart, {total} total views"
		>
			<g transform="rotate(-90 {size / 2} {size / 2})">
				{#each arcs as arc (arc.label)}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke={arc.color}
						stroke-width="22"
						stroke-dasharray={arc.dasharray}
						stroke-dashoffset={arc.dashoffset}
						stroke-linecap="butt"
					>
						<title>{arc.label}: {arc.value} ({arc.percent.toFixed(1)}%)</title>
					</circle>
				{/each}
			</g>
			<text
				x="50%"
				y="48%"
				text-anchor="middle"
				dominant-baseline="middle"
				class="fill-text text-2xl font-semibold"
				style="font-size: 1.5rem; fill: var(--color-text)"
			>
				{total}
			</text>
			<text
				x="50%"
				y="60%"
				text-anchor="middle"
				dominant-baseline="middle"
				style="font-size: 0.7rem; fill: var(--color-text-muted)"
			>
				views
			</text>
		</svg>

		<ul class="flex w-full min-w-0 flex-col gap-2" aria-label="Source legend">
			{#each arcs as arc (arc.label)}
				<li class="flex items-center gap-2 text-sm">
					<span
						class="size-2.5 shrink-0 rounded-full"
						style="background: {arc.color}"
						aria-hidden="true"
					></span>
					<span class="text-text min-w-0 flex-1 truncate font-mono text-xs">{arc.label}</span>
					<span class="text-text-muted font-mono text-xs tabular-nums">
						{arc.value}
						<span class="opacity-70">({arc.percent.toFixed(0)}%)</span>
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
