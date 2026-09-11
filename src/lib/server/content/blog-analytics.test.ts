import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_UTM_SOURCE,
	emptyAnalyticsFile,
	incrementPostView,
	mergeOverall,
	normalizeUtmSource
} from '$lib/schemas/blog-analytics';
import {
	getOverallAnalytics,
	getPostAnalytics,
	recordBlogView
} from '$lib/server/content/blog-analytics';
import {
	getOverallUpdateAnalytics,
	getUpdateAnalytics,
	recordUpdateView
} from '$lib/server/content/update-analytics';

describe('normalizeUtmSource', () => {
	it('defaults missing, empty, and whitespace to worldwide-web', () => {
		expect(normalizeUtmSource(null)).toBe(DEFAULT_UTM_SOURCE);
		expect(normalizeUtmSource(undefined)).toBe(DEFAULT_UTM_SOURCE);
		expect(normalizeUtmSource('')).toBe(DEFAULT_UTM_SOURCE);
		expect(normalizeUtmSource('   ')).toBe(DEFAULT_UTM_SOURCE);
	});

	it('lowercases and accepts valid sources', () => {
		expect(normalizeUtmSource('LinkedIn')).toBe('linkedin');
		expect(normalizeUtmSource('discord')).toBe('discord');
		expect(normalizeUtmSource('my_campaign-1')).toBe('my_campaign-1');
	});

	it('rejects invalid characters and overlong values', () => {
		expect(normalizeUtmSource('hello world')).toBe(DEFAULT_UTM_SOURCE);
		expect(normalizeUtmSource('evil<script>')).toBe(DEFAULT_UTM_SOURCE);
		expect(normalizeUtmSource('a'.repeat(65))).toBe(DEFAULT_UTM_SOURCE);
	});
});

describe('incrementPostView and mergeOverall', () => {
	it('increments totals and sources for a slug', () => {
		let file = emptyAnalyticsFile();
		file = incrementPostView(file, 'alpha', 'linkedin');
		file = incrementPostView(file, 'alpha', 'linkedin');
		file = incrementPostView(file, 'alpha', DEFAULT_UTM_SOURCE);
		file = incrementPostView(file, 'beta', 'discord');

		expect(file.posts.alpha).toEqual({
			total: 3,
			sources: { linkedin: 2, [DEFAULT_UTM_SOURCE]: 1 }
		});
		expect(file.posts.beta).toEqual({
			total: 1,
			sources: { discord: 1 }
		});
	});

	it('merges overall totals and sorts posts by views', () => {
		let file = emptyAnalyticsFile();
		file = incrementPostView(file, 'low', 'discord');
		file = incrementPostView(file, 'high', 'linkedin');
		file = incrementPostView(file, 'high', 'linkedin');
		file = incrementPostView(file, 'high', DEFAULT_UTM_SOURCE);

		const overall = mergeOverall(file);
		expect(overall.total).toBe(4);
		expect(overall.sources).toEqual({
			linkedin: 2,
			[DEFAULT_UTM_SOURCE]: 1,
			discord: 1
		});
		expect(overall.posts.map((post) => post.slug)).toEqual(['high', 'low']);
		expect(overall.sourcesList[0]?.source).toBe('linkedin');
	});
});

describe('blog-analytics store (temp DATA_DIR)', () => {
	const previousDataDir = process.env.DATA_DIR;
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'pw-analytics-'));
		process.env.DATA_DIR = tempDir;
		writeFileSync(join(tempDir, 'blog-analytics.json'), '{"posts":{}}\n', 'utf8');
	});

	afterEach(() => {
		if (previousDataDir === undefined) delete process.env.DATA_DIR;
		else process.env.DATA_DIR = previousDataDir;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it('records views and returns overall and per-post summaries', async () => {
		await recordBlogView('alpha', 'LinkedIn');
		await recordBlogView('alpha', null);
		await recordBlogView('beta', 'discord');

		const overall = getOverallAnalytics();
		expect(overall.total).toBe(3);
		expect(getPostAnalytics('alpha')).toMatchObject({
			slug: 'alpha',
			total: 2,
			sources: { linkedin: 1, [DEFAULT_UTM_SOURCE]: 1 }
		});
		expect(getPostAnalytics('missing').total).toBe(0);

		const persisted = JSON.parse(readFileSync(join(tempDir, 'blog-analytics.json'), 'utf8'));
		expect(persisted.posts.alpha.total).toBe(2);
	});
});

describe('update-analytics store (temp DATA_DIR)', () => {
	const previousDataDir = process.env.DATA_DIR;
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'pw-update-analytics-'));
		process.env.DATA_DIR = tempDir;
		writeFileSync(join(tempDir, 'update-analytics.json'), '{"posts":{}}\n', 'utf8');
	});

	afterEach(() => {
		if (previousDataDir === undefined) delete process.env.DATA_DIR;
		else process.env.DATA_DIR = previousDataDir;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it('records update views separately from blog analytics', async () => {
		await recordUpdateView('shipped', 'home');
		await recordUpdateView('shipped', null);

		const overall = getOverallUpdateAnalytics();
		expect(overall.total).toBe(2);
		expect(getUpdateAnalytics('shipped')).toMatchObject({
			slug: 'shipped',
			total: 2,
			sources: { home: 1, [DEFAULT_UTM_SOURCE]: 1 }
		});
		expect(getOverallAnalytics().total).toBe(0);

		const persisted = JSON.parse(readFileSync(join(tempDir, 'update-analytics.json'), 'utf8'));
		expect(persisted.posts.shipped.total).toBe(2);
	});
});
