<script lang="ts">
	import PostPicker from '$lib/components/admin/PostPicker.svelte';
	import type { BlogCollectionFormValues } from '$lib/admin-forms';

	let {
		values,
		errors = {},
		formError = '',
		mode,
		slug,
		availablePosts
	}: {
		values: BlogCollectionFormValues;
		errors?: Record<string, string>;
		formError?: string;
		mode: 'create' | 'edit';
		slug?: string;
		availablePosts: { slug: string; title: string; published: boolean }[];
	} = $props();

	let confirmDelete = $state(false);
	let selectedPosts = $state<string[]>([]);

	$effect(() => {
		selectedPosts = [...values.posts];
	});
</script>

{#if formError}
	<p
		class="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
		role="alert"
	>
		{formError}
	</p>
{/if}

<form method="POST" action="?/save" class="space-y-5">
	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label class="admin-label" for="title">Title</label>
			<input id="title" name="title" class="admin-input" value={values.title} required />
			{#if errors.title}<p class="admin-field-error">{errors.title}</p>{/if}
		</div>
		<div>
			<label class="admin-label" for="slug">Slug</label>
			<input id="slug" name="slug" class="admin-input font-mono" value={values.slug} required />
			{#if errors.slug}<p class="admin-field-error">{errors.slug}</p>{/if}
		</div>
	</div>

	<div>
		<label class="admin-label" for="summary">Summary</label>
		<textarea id="summary" name="summary" class="admin-input admin-textarea" rows="3" required
			>{values.summary}</textarea
		>
		{#if errors.summary}<p class="admin-field-error">{errors.summary}</p>{/if}
	</div>

	<div>
		<label class="admin-label" for="tags">Tags (comma-separated)</label>
		<input id="tags" name="tags" class="admin-input" value={values.tags} />
		{#if errors.tags}<p class="admin-field-error">{errors.tags}</p>{/if}
	</div>

	<PostPicker
		posts={availablePosts}
		bind:selected={selectedPosts}
		error={errors.posts ?? errors['posts.0'] ?? ''}
	/>

	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="published" checked={values.published} />
		<span>Published</span>
	</label>

	<div class="flex flex-wrap gap-3">
		<button type="submit" class="btn-primary">
			{mode === 'create' ? 'Create collection' : 'Save changes'}
		</button>
		<a href="/admin" class="btn">Cancel</a>
	</div>
</form>

{#if mode === 'edit' && slug}
	<div class="border-border mt-10 border-t pt-6">
		<h3 class="text-text mb-2 text-lg font-semibold">Danger zone</h3>
		<form method="POST" action="?/delete" class="space-y-3">
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="confirm" bind:checked={confirmDelete} required />
				<span>I understand this permanently deletes <code class="font-mono">{slug}</code></span>
			</label>
			<button type="submit" class="btn border-red-500/50 text-red-300" disabled={!confirmDelete}>
				Delete collection
			</button>
		</form>
	</div>
{/if}
