import {
	featuredProjects,
	projectSchema,
	projectsFileSchema,
	publishedProjects,
	sortProjects,
	type Project
} from '$lib/schemas/project';
import { ContentConflictError, ContentNotFoundError } from './errors';
import { atomicWriteJson, dataPath, readJsonFile, withWriteLock } from './json-store';

export { ContentConflictError, ContentNotFoundError };

function projectsFilePath(): string {
	return dataPath('projects.json');
}

function readAllProjects(): Project[] {
	const parsed = projectsFileSchema.parse(readJsonFile(projectsFilePath()));
	return sortProjects(parsed);
}

async function saveProjects(projects: Project[]): Promise<Project[]> {
	const validated = projectsFileSchema.parse(projects);
	const sorted = sortProjects(validated);
	await withWriteLock(() => {
		atomicWriteJson(projectsFilePath(), sorted);
	});
	return sorted;
}

export function loadProjects(): Project[] {
	return readAllProjects();
}

export function getPublishedProjects(): Project[] {
	return publishedProjects(loadProjects());
}

export function getProjectBySlug(slug: string): Project | undefined {
	return getPublishedProjects().find((project) => project.slug === slug);
}

export function findProjectBySlug(slug: string): Project | undefined {
	return loadProjects().find((project) => project.slug === slug);
}

export function getFeaturedProjects(count: number): Project[] {
	return featuredProjects(loadProjects(), count);
}

export function validateProject(project: unknown): Project {
	return projectSchema.parse(project);
}

export async function createProject(input: unknown): Promise<Project> {
	const project = projectSchema.parse(input);
	const projects = loadProjects();
	if (projects.some((existing) => existing.slug === project.slug)) {
		throw new ContentConflictError(`A project with slug "${project.slug}" already exists.`);
	}
	await saveProjects([...projects, project]);
	return project;
}

export async function updateProject(slug: string, input: unknown): Promise<Project> {
	const project = projectSchema.parse(input);
	const projects = loadProjects();
	const index = projects.findIndex((existing) => existing.slug === slug);
	if (index === -1) {
		throw new ContentNotFoundError(`Project "${slug}" was not found.`);
	}
	if (project.slug !== slug && projects.some((existing) => existing.slug === project.slug)) {
		throw new ContentConflictError(`A project with slug "${project.slug}" already exists.`);
	}
	const next = [...projects];
	next[index] = project;
	await saveProjects(next);
	return project;
}

export async function deleteProject(slug: string): Promise<void> {
	const projects = loadProjects();
	const next = projects.filter((project) => project.slug !== slug);
	if (next.length === projects.length) {
		throw new ContentNotFoundError(`Project "${slug}" was not found.`);
	}
	await saveProjects(next);
}

export async function setProjectPublished(slug: string, published: boolean): Promise<Project> {
	const project = findProjectBySlug(slug);
	if (!project) {
		throw new ContentNotFoundError(`Project "${slug}" was not found.`);
	}
	return updateProject(slug, { ...project, published });
}
