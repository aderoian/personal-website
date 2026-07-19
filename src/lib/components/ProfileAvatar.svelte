<script lang="ts">
	import { site } from '$lib/config';

	let {
		class: className = ''
	}: {
		class?: string;
	} = $props();
</script>

<div
	class="border-accent/30 bg-bg-elevated shadow-glow relative mx-auto aspect-square w-44 shrink-0 overflow-hidden rounded-lg border sm:w-56 md:mx-0 md:w-72 lg:w-80 {className}"
>
	<img
		src={site.profileImage}
		alt={site.name}
		width="320"
		height="320"
		class="h-full w-full object-cover"
		decoding="async"
	/>
	<div
		class="via-accent/60 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
	></div>
</div>
