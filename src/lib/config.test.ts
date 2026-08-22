import { describe, expect, it } from 'vitest';
import { site, socialLinks } from '$lib/config';

describe('socialLinks', () => {
	it('lists profiles in the home-page order', () => {
		expect(socialLinks.map((link) => link.id)).toEqual([
			'github',
			'instagram',
			'email',
			'linkedin',
			'youtube'
		]);
	});

	it('points each icon at the configured contact URL', () => {
		expect(socialLinks).toEqual([
			{ id: 'github', label: 'GitHub', href: site.contact.github },
			{ id: 'instagram', label: 'Instagram', href: site.contact.instagram },
			{ id: 'email', label: 'Email', href: `mailto:${site.contact.email}` },
			{ id: 'linkedin', label: 'LinkedIn', href: site.contact.linkedin },
			{ id: 'youtube', label: 'YouTube', href: site.contact.youtube }
		]);
	});
});
