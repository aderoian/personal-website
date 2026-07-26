<script lang="ts">
	import { onMount } from 'svelte';
	import { EXTERNAL_LINK_REL, isExternalHref } from '$lib/links';
	import type { Mermaid } from 'mermaid';

	let {
		html,
		class: className = ''
	}: {
		html: string;
		class?: string;
	} = $props();

	let root: HTMLElement | undefined = $state();
	let mermaidModule: Promise<Mermaid> | undefined;
	let renderGeneration = 0;

	onMount(() => {
		enhanceContent();
	});

	$effect(() => {
		void html;
		if (root) {
			queueMicrotask(() => enhanceContent());
		}
	});

	function enhanceContent() {
		if (!root) return;
		enhanceExternalLinks();
		enhanceCodeBlocks();
		void enhanceMermaidDiagrams();
	}

	function enhanceExternalLinks() {
		if (!root) return;

		for (const anchor of root.querySelectorAll('a[href]')) {
			const href = anchor.getAttribute('href');
			if (!isExternalHref(href)) continue;
			anchor.setAttribute('target', '_blank');
			anchor.setAttribute('rel', EXTERNAL_LINK_REL);
		}
	}

	function enhanceCodeBlocks() {
		if (!root) return;

		const blocks = root.querySelectorAll('pre.code-block');
		for (const pre of blocks) {
			if (pre.parentElement?.classList.contains('code-block-shell')) continue;

			const language = pre.getAttribute('data-language') || 'text';
			const code = pre.querySelector('code');
			const text = code?.textContent ?? '';

			const shell = document.createElement('div');
			shell.className = 'code-block-shell';

			const toolbar = document.createElement('div');
			toolbar.className = 'code-block-toolbar';

			const label = document.createElement('span');
			label.className = 'code-block-lang';
			label.textContent = language;

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'code-block-copy';
			button.textContent = 'Copy';
			button.setAttribute('aria-label', `Copy ${language} code`);

			const status = document.createElement('span');
			status.className = 'code-block-status';
			status.setAttribute('aria-live', 'polite');

			button.addEventListener('click', async () => {
				try {
					await navigator.clipboard.writeText(text);
					status.textContent = 'Copied';
					button.textContent = 'Copied';
					button.classList.add('is-success');
					button.classList.remove('is-error');
				} catch {
					status.textContent = 'Copy failed';
					button.textContent = 'Failed';
					button.classList.add('is-error');
					button.classList.remove('is-success');
				}

				window.setTimeout(() => {
					button.textContent = 'Copy';
					button.classList.remove('is-success', 'is-error');
					status.textContent = '';
				}, 2000);
			});

			toolbar.append(label, button, status);
			pre.replaceWith(shell);
			shell.append(toolbar, pre);
		}
	}

	function siteMermaidTheme(): 'dark' | 'default' {
		return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
	}

	function loadMermaid(): Promise<Mermaid> {
		if (!mermaidModule) {
			mermaidModule = import('mermaid').then(({ default: mermaid }) => {
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: 'strict',
					theme: siteMermaidTheme()
				});
				return mermaid;
			});
		}
		return mermaidModule;
	}

	async function enhanceMermaidDiagrams() {
		if (!root) return;

		const sources = [...root.querySelectorAll('pre.mermaid-source')];
		if (sources.length === 0) return;

		const generation = ++renderGeneration;
		const mermaid = await loadMermaid();
		if (generation !== renderGeneration || !root) return;

		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			theme: siteMermaidTheme()
		});

		for (const pre of sources) {
			if (!root.contains(pre)) continue;

			const definition = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
			const figure = document.createElement('figure');
			figure.className = 'mermaid-diagram';
			figure.setAttribute('role', 'img');
			figure.setAttribute('aria-label', 'Diagram');

			try {
				const id = `mermaid-${crypto.randomUUID()}`;
				const { svg } = await mermaid.render(id, definition);
				if (generation !== renderGeneration || !root.contains(pre)) continue;
				figure.innerHTML = svg;
			} catch {
				if (generation !== renderGeneration || !root.contains(pre)) continue;
				figure.classList.add('is-error');
				figure.textContent = 'Unable to render diagram.';
			}

			pre.replaceWith(figure);
		}
	}
</script>

<div class="prose-content {className}" bind:this={root}>
	{@html html}
</div>
