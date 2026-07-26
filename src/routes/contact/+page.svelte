<script lang="ts">
	import { page } from '$app/state';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { emptyContactFormValues } from '$lib/contact-form';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const sent = $derived(page.url.searchParams.get('sent') === '1');
	const formValues = $derived(form?.values ?? emptyContactFormValues);
</script>

<SeoHead
	meta={{
		title: 'Contact',
		description:
			'Get in touch with Armen Deroian about projects, collaboration, or engineering questions.',
		path: '/contact'
	}}
/>

<PageHeader
	title="Contact"
	lede="Questions about a project, collaboration, or something else? I’d be glad to hear from you."
/>

<div class="prose-content motion-fade-up motion-delay-1 mb-8 max-w-2xl">
	<p>
		The fastest way to reach me is through the links below. If you’re writing about a specific
		project, mentioning its name in your message helps me respond with useful context.
	</p>
</div>

<section class="panel motion-fade-up motion-delay-2 mb-8 p-6" aria-labelledby="contact-links-heading">
	<h2
		id="contact-links-heading"
		class="text-accent mb-4 font-mono text-sm tracking-wider uppercase"
	>
		Where to find me
	</h2>
	<ul class="space-y-4">
		<li>
			<span class="text-text-muted mb-1 block text-xs">Email</span>
			<a href="mailto:{data.contact.email}" class="text-text inline-flex items-center gap-2">
				{data.contact.email}
			</a>
		</li>
		<li>
			<span class="text-text-muted mb-1 block text-xs">GitHub</span>
			<a
				href={data.contact.github}
				class="text-text inline-flex items-center gap-2"
				target="_blank"
				rel="noopener noreferrer"
			>
				{data.contact.github}
			</a>
		</li>
		<li>
			<span class="text-text-muted mb-1 block text-xs">LinkedIn</span>
			<a
				href={data.contact.linkedin}
				class="text-text inline-flex items-center gap-2"
				target="_blank"
				rel="noopener noreferrer"
			>
				{data.contact.linkedin}
			</a>
		</li>
	</ul>
</section>

<section class="panel motion-fade-up motion-delay-3 p-6" aria-labelledby="contact-form-heading">
	<h2 id="contact-form-heading" class="text-accent mb-4 font-mono text-sm tracking-wider uppercase">
		Contact me
	</h2>

	{#if sent}
		<p class="border-accent/30 bg-accent/10 text-accent mb-4 rounded border px-4 py-3 text-sm">
			Thanks — your message was sent.
		</p>
	{:else if form?.error}
		<p class="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{form.error}
		</p>
	{/if}

	{#if !data.formEnabled}
		<p class="text-text-muted mb-4 text-sm">
			Email delivery is not configured yet, but the form is shown for preview.
		</p>
	{/if}

	<form method="POST" class="space-y-4" novalidate>
		<div>
			<label for="contact-name" class="text-text-muted mb-1 block text-sm">Name</label>
			<input
				id="contact-name"
				name="name"
				type="text"
				autocomplete="name"
				required
				maxlength="120"
				value={formValues.name}
				class="border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent w-full rounded border px-3 py-2 focus:ring-1 focus:outline-none"
			/>
		</div>

		<div>
			<label for="contact-email" class="text-text-muted mb-1 block text-sm">Email</label>
			<input
				id="contact-email"
				name="email"
				type="email"
				autocomplete="email"
				required
				maxlength="254"
				value={formValues.email}
				class="border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent w-full rounded border px-3 py-2 focus:ring-1 focus:outline-none"
			/>
		</div>

		<div>
			<label for="contact-message" class="text-text-muted mb-1 block text-sm">Message</label>
			<textarea
				id="contact-message"
				name="message"
				rows="6"
				required
				maxlength="8000"
				class="border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent w-full rounded border px-3 py-2 focus:ring-1 focus:outline-none"
				>{formValues.message}</textarea
			>
		</div>

		<div class="hidden" aria-hidden="true">
			<label for="contact-website">Website</label>
			<input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off" />
		</div>

		<button
			type="submit"
			class="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
			disabled={!data.formEnabled}
			aria-disabled={!data.formEnabled}
		>
			Send message
		</button>
	</form>
</section>
