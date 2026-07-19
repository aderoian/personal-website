export type SeoMeta = {
	title: string;
	description: string;
	path?: string;
};

export function pageTitle(title?: string): string {
	return title ? `${title} · Armen Deroian` : 'Armen Deroian';
}

export function canonicalUrl(path = '/', origin = 'https://www.armenderoian.dev'): string {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return `${origin}${normalized === '/' ? '' : normalized}`;
}

export function buildSeo(meta: SeoMeta, origin = 'https://www.armenderoian.dev') {
	const title = pageTitle(meta.title === 'Home' ? undefined : meta.title);
	const url = canonicalUrl(meta.path ?? '/', origin);

	return {
		title,
		description: meta.description,
		url,
		og: {
			title,
			description: meta.description,
			url,
			type: 'website' as const
		}
	};
}
