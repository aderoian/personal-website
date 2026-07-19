export const site = {
	name: 'Armen Deroian',
	tagline: 'Developer',
	topProjectsCount: 3,
	profileImage: '/assets/profile.png',
	contact: {
		email: 'armendero330@gmail.com',
		github: 'https://github.com/aderoian',
		linkedin: 'https://www.linkedin.com/in/armenderoian/'
	},
	url: 'https://www.armenderoian.dev'
} as const;

export const navItems = [
	{ href: '/', label: 'Home', id: 'home' },
	{ href: '/projects', label: 'Projects', id: 'projects' },
	{ href: '/gildenkrieg', label: 'Gildenkrieg', id: 'gildenkrieg' },
	{ href: '/blog', label: 'Blog', id: 'blog' },
	{ href: '/contact', label: 'Contact', id: 'contact' }
] as const;

export type NavId = (typeof navItems)[number]['id'];
