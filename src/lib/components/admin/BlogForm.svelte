<script lang="ts">
	import SourceEditor from '$lib/components/admin/SourceEditor.svelte';
	import type { BlogFormValues } from '$lib/admin-forms';

	let {
		values,
		errors = {},
		formError = '',
		mode,
		slug
	}: {
		values: BlogFormValues;
		errors?: Record<string, string>;
		formError?: string;
		mode: 'create' | 'edit';
		slug?: string;
	} = $props();

	let confirmDelete = $state(false);
	let uploading = $state(false);
	let uploadError = $state('');
	let uploaded: { url: string; markdown: string; html: string } | null = $state(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let copiedField = $state<'url' | 'markdown' | 'html' | null>(null);

	async function uploadImage() {
		uploadError = '';
		uploaded = null;
		copiedField = null;

		const file = fileInput?.files?.[0];
		if (!file) {
			uploadError = 'Choose an image file to upload.';
			return;
		}

		uploading = true;
		try {
			const body = new FormData();
			body.set('image', file);
			const response = await fetch('/admin/blog/upload', {
				method: 'POST',
				body,
				credentials: 'same-origin'
			});
			const payload = (await response.json()) as {
				error?: string;
				url?: string;
				markdown?: string;
				html?: string;
			};

			if (!response.ok || !payload.url || !payload.markdown || !payload.html) {
				uploadError = payload.error ?? 'Upload failed.';
				return;
			}

			uploaded = {
				url: payload.url,
				markdown: payload.markdown,
				html: payload.html
			};
			if (fileInput) fileInput.value = '';
		} catch {
			uploadError = 'Upload failed. Please try again.';
		} finally {
			uploading = false;
		}
	}

	async function copyText(field: 'url' | 'markdown' | 'html', text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedField = field;
		} catch {
			copiedField = null;
		}
	}
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

	{#key values.body}
		<SourceEditor value={values.body} error={errors.body ?? ''} />
	{/key}

	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label class="admin-label" for="published_at">Published date (YYYY-MM-DD)</label>
			<input
				id="published_at"
				name="published_at"
				class="admin-input font-mono"
				value={values.published_at}
				placeholder="Leave blank to use today on publish"
			/>
			{#if errors.published_at}<p class="admin-field-error">{errors.published_at}</p>{/if}
			<p class="text-text-muted mt-1 text-xs">
				Future dates stay hidden from the public site until that day (UTC).
			</p>
		</div>
		<div>
			<label class="admin-label" for="tags">Tags (comma-separated)</label>
			<input id="tags" name="tags" class="admin-input" value={values.tags} />
			{#if errors.tags}<p class="admin-field-error">{errors.tags}</p>{/if}
		</div>
	</div>

	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="published" checked={values.published} />
		<span>Published</span>
	</label>

	<div class="flex flex-wrap gap-3">
		<button type="submit" class="btn-primary">
			{mode === 'create' ? 'Create post' : 'Save changes'}
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
				Delete post
			</button>
		</form>
	</div>
{/if}

<div class="border-border mt-10 border-t pt-6">
	<h3 class="text-text mb-2 text-lg font-semibold">Upload image</h3>
	<p class="text-text-muted mb-4 text-sm">
		Upload an image, then paste the markdown or HTML reference into the post body.
	</p>

	<div class="space-y-3">
		<div>
			<label class="admin-label" for="blog-image-upload">Image file</label>
			<input
				id="blog-image-upload"
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
				class="admin-input"
			/>
		</div>
		<button type="button" class="btn-primary" disabled={uploading} onclick={uploadImage}>
			{uploading ? 'Uploading…' : 'Upload image'}
		</button>
	</div>

	{#if uploadError}
		<p
			class="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
			role="alert"
		>
			{uploadError}
		</p>
	{/if}

	{#if uploaded}
		{@const result = uploaded}
		<div class="mt-4 space-y-3">
			<p class="text-text text-sm font-medium">Image ready — copy a reference into the post:</p>
			<div>
				<label class="admin-label" for="upload-url">URL</label>
				<div class="flex flex-wrap gap-2">
					<input id="upload-url" class="admin-input font-mono flex-1" readonly value={result.url} />
					<button type="button" class="btn px-3 py-1 text-xs" onclick={() => copyText('url', result.url)}>
						{copiedField === 'url' ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>
			<div>
				<label class="admin-label" for="upload-markdown">Markdown</label>
				<div class="flex flex-wrap gap-2">
					<input
						id="upload-markdown"
						class="admin-input font-mono flex-1"
						readonly
						value={result.markdown}
					/>
					<button
						type="button"
						class="btn px-3 py-1 text-xs"
						onclick={() => copyText('markdown', result.markdown)}
					>
						{copiedField === 'markdown' ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>
			<div>
				<label class="admin-label" for="upload-html">HTML</label>
				<div class="flex flex-wrap gap-2">
					<input id="upload-html" class="admin-input font-mono flex-1" readonly value={result.html} />
					<button
						type="button"
						class="btn px-3 py-1 text-xs"
						onclick={() => copyText('html', result.html)}
					>
						{copiedField === 'html' ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
