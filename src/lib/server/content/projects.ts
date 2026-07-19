import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	featuredProjects,
	projectSchema,
	projectsFileSchema,
	sortProjects,
	type Project
} from '$lib/schemas/project';

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');

function readJson(path: string): unknown {
	const raw = readFileSync(path, 'utf8');
	return JSON.parse(raw) as unknown;
}

export function loadProjects(): Project[] {
	const path = join(DATA_DIR, 'projects.json');
	const parsed = projectsFileSchema.parse(readJson(path));
	return sortProjects(parsed);
}

export function getProjectBySlug(slug: string): Project | undefined {
	return loadProjects().find((project) => project.slug === slug);
}

export function getFeaturedProjects(count: number): Project[] {
	return featuredProjects(loadProjects(), count);
}

export function validateProject(project: unknown): Project {
	return projectSchema.parse(project);
}
