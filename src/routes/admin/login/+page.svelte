<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="mx-auto max-w-md">
	<h2 class="text-text mb-2 text-xl font-semibold">Sign in</h2>
	<p class="text-text-muted mb-6 text-sm">
		Enter the admin password to manage projects and blog posts.
	</p>

	{#if !data.configured}
		<p
			class="border-border bg-bg-elevated mb-4 rounded border border-amber-500/40 p-3 text-sm text-amber-200"
		>
			Admin credentials are not configured on this server.
		</p>
	{/if}

	{#if form?.error}
		<p
			class="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
			role="alert"
		>
			{form.error}
		</p>
	{/if}

	<form method="POST" class="panel space-y-4 p-5">
		<div>
			<label class="admin-label" for="password">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="admin-input"
				disabled={!data.configured}
			/>
		</div>
		<button type="submit" class="btn-primary w-full" disabled={!data.configured}>Sign in</button>
	</form>
</div>
