<script lang="ts">
	type PostOption = {
		slug: string;
		title: string;
		published: boolean;
	};

	let {
		posts,
		selected = $bindable([] as string[]),
		error = ''
	}: {
		posts: PostOption[];
		selected?: string[];
		error?: string;
	} = $props();

	let query = $state('');
	let open = $state(false);

	const selectedSet = $derived(new Set(selected));

	const available = $derived(
		posts.filter((post) => {
			if (selectedSet.has(post.slug)) return false;
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return (
				post.title.toLowerCase().includes(q) || post.slug.toLowerCase().includes(q)
			);
		})
	);

	const selectedPosts = $derived(
		selected
			.map((slug) => posts.find((post) => post.slug === slug) ?? { slug, title: slug, published: false })
	);

	function addPost(slug: string) {
		if (selectedSet.has(slug)) return;
		selected = [...selected, slug];
		query = '';
		open = false;
	}

	function removePost(slug: string) {
		selected = selected.filter((s) => s !== slug);
	}

	function movePost(index: number, delta: number) {
		const nextIndex = index + delta;
		if (nextIndex < 0 || nextIndex >= selected.length) return;
		const next = [...selected];
		const [item] = next.splice(index, 1);
		next.splice(nextIndex, 0, item);
		selected = next;
	}

	function onSearchFocus() {
		open = true;
	}

	function onSearchBlur() {
		// Delay so click on a result still registers.
		setTimeout(() => {
			open = false;
		}, 150);
	}

	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			(event.target as HTMLInputElement).blur();
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const first = available[0];
			if (first) addPost(first.slug);
		}
	}
</script>

<div>
	<label class="admin-label" for="post-picker-search">Posts</label>
	<p class="text-text-muted mb-2 text-xs">
		Search and add posts. Drag order with Up/Down. At least one post is required.
	</p>

	{#each selected as slug (slug)}
		<input type="hidden" name="posts" value={slug} />
	{/each}

	{#if selectedPosts.length > 0}
		<ul class="divide-border border-border mb-3 divide-y overflow-hidden rounded border">
			{#each selectedPosts as post, index (post.slug)}
				<li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
					<div class="min-w-0">
						<p class="text-text truncate text-sm font-medium">{post.title}</p>
						<p class="text-text-muted font-mono text-xs">
							{post.slug}
							{#if !post.published}
								· Draft
							{/if}
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-1">
						<button
							type="button"
							class="btn px-2 py-1 text-xs"
							disabled={index === 0}
							onclick={() => movePost(index, -1)}
							aria-label="Move {post.title} up"
						>
							Up
						</button>
						<button
							type="button"
							class="btn px-2 py-1 text-xs"
							disabled={index === selectedPosts.length - 1}
							onclick={() => movePost(index, 1)}
							aria-label="Move {post.title} down"
						>
							Down
						</button>
						<button
							type="button"
							class="btn border-red-500/40 px-2 py-1 text-xs text-red-300"
							onclick={() => removePost(post.slug)}
							aria-label="Remove {post.title}"
						>
							Remove
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-text-muted border-border mb-3 rounded border border-dashed px-3 py-3 text-sm">
			No posts selected yet.
		</p>
	{/if}

	<div class="relative">
		<input
			id="post-picker-search"
			type="search"
			class="admin-input"
			placeholder="Search posts by title or slug…"
			autocomplete="off"
			bind:value={query}
			onfocus={onSearchFocus}
			onblur={onSearchBlur}
			onkeydown={onSearchKeydown}
			oninput={() => {
				open = true;
			}}
		/>

		{#if open && available.length > 0}
			<ul
				class="border-border bg-bg-elevated absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border shadow-lg"
				role="listbox"
			>
				{#each available.slice(0, 12) as post (post.slug)}
					<li>
						<button
							type="button"
							class="hover:bg-accent/10 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
							onclick={() => addPost(post.slug)}
							role="option"
							aria-selected="false"
						>
							<span class="text-text text-sm font-medium">{post.title}</span>
							<span class="text-text-muted font-mono text-xs">
								{post.slug}{#if !post.published} · Draft{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if open && query.trim() && available.length === 0}
			<p
				class="border-border bg-bg-elevated text-text-muted absolute z-20 mt-1 w-full rounded border px-3 py-2 text-sm shadow-lg"
			>
				No matching posts.
			</p>
		{/if}
	</div>

	{#if error}
		<p class="admin-field-error">{error}</p>
	{/if}
</div>
