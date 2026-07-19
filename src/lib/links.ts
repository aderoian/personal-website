/** True for absolute http(s) URLs that should open off-site. */
export function isExternalHref(href: string | undefined | null): boolean {
	if (!href) return false;
	const trimmed = href.trim();
	return /^https?:\/\//i.test(trimmed);
}

export const EXTERNAL_LINK_REL = 'noopener noreferrer';
