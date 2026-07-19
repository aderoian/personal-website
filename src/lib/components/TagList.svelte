<script lang="ts">
	let { tags }: { tags: string[] } = $props();
</script>

{#if tags.length > 0}
	<ul class="flex flex-wrap gap-2" aria-label="Tags">
		{#each tags as tag (tag)}
			<li class="chip">{tag}</li>
		{/each}
	</ul>
{/if}
