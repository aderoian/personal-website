<script lang="ts">
	import { site } from '$lib/config';

	let { size = 256 }: { size?: number } = $props();
</script>

<div
	class="border-accent/30 bg-bg-elevated shadow-glow relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border"
	style:width="{size}px"
	style:height="{size}px"
	role="img"
	aria-label={site.name}
>
	<div
		class="absolute inset-0 opacity-30"
		style="background: radial-gradient(circle at 30% 30%, #22d3ee44, transparent 60%), radial-gradient(circle at 70% 70%, #a78bfa33, transparent 60%);"
	></div>
	<span
		class="text-accent relative font-mono text-4xl font-medium tracking-wider"
		style:font-size="{size * 0.22}px"
	>
		AD
	</span>
	<div
		class="via-accent/60 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
	></div>
</div>
