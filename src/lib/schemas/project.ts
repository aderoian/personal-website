import { z } from 'zod';

export const slugSchema = z
	.string()
	.trim()
	.min(1)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

const assetPathSchema = z
	.string()
	.trim()
	.refine((path) => !path.includes('..') && !path.includes('\0'), 'Invalid asset path')
	.refine((path) => path.startsWith('assets/'), 'Asset path must start with assets/')
	.refine((path) => /^assets\/[a-zA-Z0-9._/-]+$/.test(path), 'Invalid asset path characters');

const optionalUrlSchema = z.preprocess((value) => {
	if (value === '' || value === null || value === undefined) return undefined;
	return value;
}, z.string().trim().url().optional());

export const projectSchema = z.object({
	slug: slugSchema,
	title: z.string().trim().min(1),
	short_description: z.string().trim().min(1),
	summary: z.string().trim().min(1),
	body: z.string().min(1),
	image: z
		.string()
		.trim()
		.optional()
		.default('')
		.refine((path) => path === '' || assetPathSchema.safeParse(path).success, 'Invalid image path'),
	featured_order: z.number().int(),
	year: z.number().int().optional(),
	tags: z.array(z.string().trim().min(1)).optional(),
	repo_url: optionalUrlSchema,
	demo_url: optionalUrlSchema,
	demo_embed_src: optionalUrlSchema,
	published: z.boolean().optional().default(true)
});

export const projectsFileSchema = z.array(projectSchema).superRefine((projects, ctx) => {
	const slugs = new Set<string>();
	for (const [index, project] of projects.entries()) {
		if (slugs.has(project.slug)) {
			ctx.addIssue({
				code: 'custom',
				message: `Duplicate slug: ${project.slug}`,
				path: [index, 'slug']
			});
		}
		slugs.add(project.slug);
	}
});

export type Project = z.infer<typeof projectSchema>;

export const PLACEHOLDER_IMAGES = [
	'assets/projects/placeholders/abstract-panels.svg',
	'assets/projects/placeholders/grid-flow.svg',
	'assets/projects/placeholders/pipeline.svg',
	'assets/projects/placeholders/node-graph.svg',
	'assets/projects/placeholders/layers.svg'
] as const;

export function projectEffectiveImage(project: Project): string {
	const image = project.image?.trim() ?? '';
	if (image) return image;

	const hash = [...project.slug].reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length];
}

export function toAssetUrl(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

export function sortProjects(projects: Project[]): Project[] {
	return [...projects].sort(
		(a, b) => a.featured_order - b.featured_order || a.slug.localeCompare(b.slug)
	);
}

export function publishedProjects(projects: Project[]): Project[] {
	return sortProjects(projects.filter((project) => project.published));
}

export function featuredProjects(projects: Project[], count: number): Project[] {
	return publishedProjects(projects).slice(0, Math.max(0, count));
}
