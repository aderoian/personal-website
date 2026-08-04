<script lang="ts">
	const TAG_COLLAPSE_LIMIT = 8;

	let {
		query = $bindable(''),
		selectedTags = $bindable([] as string[]),
		tags = [] as string[],
		placeholder = 'Search by title…'
	}: {
		query?: string;
		selectedTags?: string[];
		tags?: string[];
		placeholder?: string;
	} = $props();

	let showAllTags = $state(false);

	const selectedSet = $derived(new Set(selectedTags));
	const hasOverflow = $derived(tags.length > TAG_COLLAPSE_LIMIT);
	const visibleTags = $derived(
		showAllTags || !hasOverflow ? tags : tags.slice(0, TAG_COLLAPSE_LIMIT)
	);
	const hiddenCount = $derived(Math.max(0, tags.length - TAG_COLLAPSE_LIMIT));

	function toggleTag(tag: string) {
		if (selectedSet.has(tag)) {
			selectedTags = selectedTags.filter((entry) => entry !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}
</script>

<div class="space-y-3">
	<div class="blog-search">
		<label class="sr-only" for="blog-search-query">Search posts</label>
		<input
			id="blog-search-query"
			type="search"
			class="blog-search__input"
			{placeholder}
			autocomplete="off"
			bind:value={query}
		/>
	</div>

	{#if tags.length > 0}
		<div>
			<p class="sr-only" id="blog-tag-filter-label">Filter by tag</p>
			<ul class="flex flex-wrap gap-2" aria-labelledby="blog-tag-filter-label">
				{#each visibleTags as tag (tag)}
					<li>
						<button
							type="button"
							class="chip transition-opacity"
							class:opacity-40={!selectedSet.has(tag)}
							aria-pressed={selectedSet.has(tag)}
							onclick={() => toggleTag(tag)}
						>
							{tag}
						</button>
					</li>
				{/each}
			</ul>
			{#if hasOverflow || selectedTags.length > 0}
				<div class="mt-2 flex flex-wrap items-center gap-3">
					{#if hasOverflow}
						<button
							type="button"
							class="text-accent font-mono text-xs hover:underline"
							onclick={() => {
								showAllTags = !showAllTags;
							}}
						>
							{showAllTags ? 'Show fewer tags' : `Show all tags (${hiddenCount} more)`}
						</button>
					{/if}
					{#if selectedTags.length > 0}
						<button
							type="button"
							class="text-accent font-mono text-xs hover:underline"
							onclick={() => {
								selectedTags = [];
							}}
						>
							Clear selected tags
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
