import { describe, expect, it } from 'vitest';
import {
	highlightCode,
	MAX_PREVIEW_CHARS,
	renderMarkdown,
	renderMarkdownPreview
} from '$lib/markdown';

describe('markdown rendering', () => {
	it('renders markdown headings and paragraphs', () => {
		const html = renderMarkdown('# Hello\n\nA paragraph.');
		expect(html).toContain('<h1');
		expect(html).toContain('Hello');
		expect(html).toContain('<p>A paragraph.</p>');
	});

	it('passes through embedded HTML and strips XSS', () => {
		const html = renderMarkdown('<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(1)>');
		expect(html).toContain('<p>Safe</p>');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('onerror');
	});

	it('renders mixed markdown and HTML', () => {
		const html = renderMarkdown('## Title\n\n<div class="note">Note</div>\n\n- item');
		expect(html).toContain('<h2');
		expect(html).toContain('<div');
		expect(html).toContain('<li>item</li>');
	});

	it('highlights known fenced languages', () => {
		const html = renderMarkdown('```ts\nconst x: number = 1;\n```');
		expect(html).toContain('data-language="ts"');
		expect(html).toContain('hljs');
		expect(html).toContain('hljs-keyword');
	});

	it('emits mermaid fences as diagram sources instead of highlighted code', () => {
		const html = renderMarkdown('```mermaid\nflowchart TD\n  A-->B\n```');
		expect(html).toContain('class="mermaid-source"');
		expect(html).toContain('data-language="mermaid"');
		expect(html).toContain('flowchart TD');
		expect(html).toContain('A--&gt;B');
		expect(html).not.toContain('code-block');
		expect(html).not.toContain('hljs');
	});

	it('escapes HTML inside mermaid fences', () => {
		const html = renderMarkdown('```mermaid\nflowchart TD\n  A["<script>alert(1)</script>"]\n```');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('<script>alert');
	});

	it('falls back safely for unknown languages', () => {
		const { html, language } = highlightCode('print("hi")', 'not-a-real-lang');
		expect(language).toBe('not-a-real-lang');
		expect(html).toContain('print');
		expect(html).not.toContain('<script');
	});

	it('escapes code content', () => {
		const html = renderMarkdown('```\n<script>alert(1)</script>\n```');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('<script>alert');
	});

	it('opens external markdown links in a new tab', () => {
		const html = renderMarkdown('[repo](https://github.com/example/repo) and [home](/)');
		expect(html).toContain('href="https://github.com/example/repo"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
		expect(html).toMatch(/href="\/"[^>]*>home/);
		expect(html).not.toMatch(/href="\/"[^>]*target="_blank"/);
	});

	it('wraps markdown tables in a scroll container', () => {
		const html = renderMarkdown('| Name | Value |\n| --- | --- |\n| alpha | 1 |');
		expect(html).toContain('class="table-scroll"');
		expect(html).toContain('<table>');
		expect(html).toContain('<th>Name</th>');
		expect(html).toContain('<td>alpha</td>');
	});

	it('rejects oversized preview input', () => {
		const result = renderMarkdownPreview('x'.repeat(MAX_PREVIEW_CHARS + 1));
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(/too large/i);
		}
	});
});
