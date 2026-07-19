import DOMPurify from 'isomorphic-dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked, type Tokens } from 'marked';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c++', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('go', go);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('svg', xml);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

marked.setOptions({
	gfm: true,
	breaks: false
});

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function normalizeLanguage(lang: string | undefined): string {
	return (lang ?? '').trim().toLowerCase().split(/\s+/)[0] ?? '';
}

export function highlightCode(code: string, language?: string): { html: string; language: string } {
	const normalized = normalizeLanguage(language);
	if (normalized && hljs.getLanguage(normalized)) {
		try {
			return {
				html: hljs.highlight(code, { language: normalized }).value,
				language: normalized
			};
		} catch {
			// Fall through to escaped plaintext.
		}
	}

	return {
		html: escapeHtml(code),
		language: normalized || 'text'
	};
}

function renderFencedCode(token: Tokens.Code): string {
	const { html, language } = highlightCode(token.text, token.lang);
	const langAttr = escapeHtml(language);
	return `<pre class="code-block" data-language="${langAttr}"><code class="language-${langAttr} hljs">${html}</code></pre>\n`;
}

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: Tokens.Code) =>
	renderFencedCode({ type: 'code', raw: '', text, lang });

marked.use({ renderer });

const MAX_PREVIEW_CHARS = 200_000;

export function renderMarkdown(source: string): string {
	const html = marked.parse(source, { async: false }) as string;
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		ADD_ATTR: ['data-language', 'class']
	});
}

export function renderMarkdownPreview(
	source: string
): { ok: true; html: string } | { ok: false; error: string } {
	if (source.length > MAX_PREVIEW_CHARS) {
		return { ok: false, error: 'Content is too large to preview.' };
	}

	try {
		return { ok: true, html: renderMarkdown(source) };
	} catch {
		return { ok: false, error: 'Unable to render preview.' };
	}
}

export { MAX_PREVIEW_CHARS };
