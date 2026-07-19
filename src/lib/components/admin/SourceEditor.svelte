<script lang="ts">
	import ProseContent from '$lib/components/ProseContent.svelte';

	let {
		name = 'body',
		value = '',
		label = 'Body',
		error = '',
		id = 'body'
	}: {
		name?: string;
		value?: string;
		label?: string;
		error?: string;
		id?: string;
	} = $props();

	// Parent remounts via {#key} when server-provided value changes after validation errors.
	// svelte-ignore state_referenced_locally
	let source = $state(value);
	let previewHtml = $state('');
	let previewError = $state('');
	let previewPending = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const current = source;
		previewPending = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			void fetchPreview(current);
		}, 350);

		return () => clearTimeout(debounceTimer);
	});

	async function fetchPreview(previewSource: string) {
		if (!previewSource.trim()) {
			previewHtml = '';
			previewError = '';
			previewPending = false;
			return;
		}

		try {
			const response = await fetch('/admin/preview', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ source: previewSource })
			});
			const data = (await response.json()) as { html?: string; error?: string };
			if (!response.ok || data.error) {
				previewHtml = '';
				previewError = data.error ?? 'Preview failed.';
			} else {
				previewHtml = data.html ?? '';
				previewError = '';
			}
		} catch {
			previewHtml = '';
			previewError = 'Preview request failed.';
		} finally {
			previewPending = false;
		}
	}
</script>

<div class="admin-editor">
	<div class="admin-editor-pane">
		<label class="admin-label" for={id}>{label}</label>
		<textarea
			{id}
			{name}
			class="admin-input admin-textarea font-mono"
			bind:value={source}
			rows="18"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
		></textarea>
		{#if error}
			<p id="{id}-error" class="admin-field-error">{error}</p>
		{/if}
	</div>

	<div class="admin-editor-pane">
		<div class="admin-label flex items-center justify-between gap-2">
			<span>Preview</span>
			{#if previewPending}
				<span class="text-text-muted font-mono text-xs tracking-normal normal-case">Updating…</span>
			{/if}
		</div>
		<div class="admin-preview panel">
			{#if previewError}
				<p class="text-sm text-red-300">{previewError}</p>
			{:else if previewHtml}
				<ProseContent html={previewHtml} />
			{:else}
				<p class="text-text-muted text-sm">Start typing to see a live preview.</p>
			{/if}
		</div>
	</div>
</div>
