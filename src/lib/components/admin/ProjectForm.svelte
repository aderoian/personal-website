<script lang="ts">
	import SourceEditor from '$lib/components/admin/SourceEditor.svelte';
	import type { ProjectFormValues } from '$lib/admin-forms';

	let {
		values,
		errors = {},
		formError = '',
		mode,
		slug
	}: {
		values: ProjectFormValues;
		errors?: Record<string, string>;
		formError?: string;
		mode: 'create' | 'edit';
		slug?: string;
	} = $props();

	let confirmDelete = $state(false);
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
		<label class="admin-label" for="short_description">Short description</label>
		<input
			id="short_description"
			name="short_description"
			class="admin-input"
			value={values.short_description}
			required
		/>
		{#if errors.short_description}<p class="admin-field-error">{errors.short_description}</p>{/if}
	</div>

	<div>
		<label class="admin-label" for="summary">Summary</label>
		<textarea id="summary" name="summary" class="admin-input admin-textarea" rows="3" required
			>{values.summary}</textarea
		>
		{#if errors.summary}<p class="admin-field-error">{errors.summary}</p>{/if}
	</div>

	{#key values.body}
		<SourceEditor value={values.body} error={errors.body ?? ''} />
	{/key}

	<div class="grid gap-4 md:grid-cols-3">
		<div>
			<label class="admin-label" for="featured_order">Featured order</label>
			<input
				id="featured_order"
				name="featured_order"
				type="number"
				class="admin-input"
				value={values.featured_order}
				required
			/>
			{#if errors.featured_order}<p class="admin-field-error">{errors.featured_order}</p>{/if}
		</div>
		<div>
			<label class="admin-label" for="year">Year</label>
			<input id="year" name="year" type="number" class="admin-input" value={values.year} />
			{#if errors.year}<p class="admin-field-error">{errors.year}</p>{/if}
		</div>
		<div>
			<label class="admin-label" for="image">Image path</label>
			<input
				id="image"
				name="image"
				class="admin-input font-mono"
				value={values.image}
				placeholder="assets/projects/..."
			/>
			{#if errors.image}<p class="admin-field-error">{errors.image}</p>{/if}
		</div>
	</div>

	<div>
		<label class="admin-label" for="tags">Tags (comma-separated)</label>
		<input id="tags" name="tags" class="admin-input" value={values.tags} />
		{#if errors.tags}<p class="admin-field-error">{errors.tags}</p>{/if}
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<div>
			<label class="admin-label" for="repo_url">Repository URL</label>
			<input id="repo_url" name="repo_url" type="url" class="admin-input" value={values.repo_url} />
			{#if errors.repo_url}<p class="admin-field-error">{errors.repo_url}</p>{/if}
		</div>
		<div>
			<label class="admin-label" for="demo_url">Demo URL</label>
			<input id="demo_url" name="demo_url" type="url" class="admin-input" value={values.demo_url} />
			{#if errors.demo_url}<p class="admin-field-error">{errors.demo_url}</p>{/if}
		</div>
		<div>
			<label class="admin-label" for="demo_embed_src">Demo embed URL</label>
			<input
				id="demo_embed_src"
				name="demo_embed_src"
				type="url"
				class="admin-input"
				value={values.demo_embed_src}
			/>
			{#if errors.demo_embed_src}<p class="admin-field-error">{errors.demo_embed_src}</p>{/if}
		</div>
	</div>

	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="published" checked={values.published} />
		<span>Published</span>
	</label>

	<div class="flex flex-wrap gap-3">
		<button type="submit" class="btn-primary">
			{mode === 'create' ? 'Create project' : 'Save changes'}
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
				Delete project
			</button>
		</form>
	</div>
{/if}
