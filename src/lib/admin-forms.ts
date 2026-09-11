import type { Project } from '$lib/schemas/project';
import type { BlogPost } from '$lib/schemas/blog-post';
import type { BlogCollection } from '$lib/schemas/blog-collection';

export type ProjectFormValues = {
	slug: string;
	title: string;
	short_description: string;
	summary: string;
	body: string;
	image: string;
	featured_order: string;
	year: string;
	tags: string;
	repo_url: string;
	demo_url: string;
	demo_embed_src: string;
	published: boolean;
};

export type BlogFormValues = {
	slug: string;
	title: string;
	summary: string;
	body: string;
	published: boolean;
	published_at: string;
	tags: string;
	continued_reading: string;
	featured_order: string;
};

export type BlogCollectionFormValues = {
	slug: string;
	title: string;
	summary: string;
	tags: string;
	posts: string[];
	published: boolean;
};

export const emptyProjectFormValues = (): ProjectFormValues => ({
	slug: '',
	title: '',
	short_description: '',
	summary: '',
	body: '',
	image: '',
	featured_order: '1',
	year: '',
	tags: '',
	repo_url: '',
	demo_url: '',
	demo_embed_src: '',
	published: false
});

export const emptyBlogFormValues = (): BlogFormValues => ({
	slug: '',
	title: '',
	summary: '',
	body: '',
	published: false,
	published_at: '',
	tags: '',
	continued_reading: '',
	featured_order: ''
});

export const emptyBlogCollectionFormValues = (): BlogCollectionFormValues => ({
	slug: '',
	title: '',
	summary: '',
	tags: '',
	posts: [],
	published: false
});

export function projectToFormValues(project: Project): ProjectFormValues {
	return {
		slug: project.slug,
		title: project.title,
		short_description: project.short_description,
		summary: project.summary,
		body: project.body,
		image: project.image ?? '',
		featured_order: String(project.featured_order),
		year: project.year != null ? String(project.year) : '',
		tags: project.tags?.join(', ') ?? '',
		repo_url: project.repo_url ?? '',
		demo_url: project.demo_url ?? '',
		demo_embed_src: project.demo_embed_src ?? '',
		published: project.published
	};
}

export function blogToFormValues(post: BlogPost): BlogFormValues {
	return {
		slug: post.slug,
		title: post.title,
		summary: post.summary,
		body: post.body,
		published: post.published,
		published_at: post.published_at,
		tags: post.tags?.join(', ') ?? '',
		continued_reading: post.continued_reading ?? '',
		featured_order: post.featured_order != null ? String(post.featured_order) : ''
	};
}

export function blogCollectionToFormValues(collection: BlogCollection): BlogCollectionFormValues {
	return {
		slug: collection.slug,
		title: collection.title,
		summary: collection.summary,
		tags: collection.tags?.join(', ') ?? '',
		posts: [...collection.posts],
		published: collection.published
	};
}
