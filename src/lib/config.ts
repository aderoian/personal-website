export const site = {
	name: 'Armen Deroian',
	tagline: 'Developer',
	topProjectsCount: 3,
	topBlogsCount: 3,
	profileImage: '/assets/profile.png',
	contact: {
		email: 'armendero330@gmail.com',
		github: 'https://github.com/aderoian',
		instagram: 'https://www.instagram.com/armenderoian/',
		linkedin: 'https://www.linkedin.com/in/armenderoian/',
		youtube: 'https://www.youtube.com/@armenderoian'
	},
	url: 'https://www.armenderoian.dev'
} as const;

export const navItems = [
	{ href: '/', label: 'Home', id: 'home' },
	{ href: '/projects', label: 'Projects', id: 'projects' },
	{ href: '/gildenkrieg', label: 'Gildenkrieg', id: 'gildenkrieg' },
	{ href: '/blog', label: 'Blog', id: 'blog' },
	{ href: '/updates', label: 'Updates', id: 'updates' },
	{ href: '/contact', label: 'Contact', id: 'contact' }
] as const;

/** Header uses `navItems` only. Footer includes this extra Planet link. */
export const footerNavItems = [
	...navItems,
	{ href: '/planet', label: 'Planet', id: 'planet' }
] as const;

export const socialLinks = [
	{ id: 'github', label: 'GitHub', href: site.contact.github },
	{ id: 'instagram', label: 'Instagram', href: site.contact.instagram },
	{ id: 'email', label: 'Email', href: `mailto:${site.contact.email}` },
	{ id: 'linkedin', label: 'LinkedIn', href: site.contact.linkedin },
	{ id: 'youtube', label: 'YouTube', href: site.contact.youtube }
] as const;

export type NavId = (typeof navItems)[number]['id'];
export type FooterNavId = (typeof footerNavItems)[number]['id'];
export type SocialLinkId = (typeof socialLinks)[number]['id'];
