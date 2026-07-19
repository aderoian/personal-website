import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';

let writeChain: Promise<unknown> = Promise.resolve();

export function getDataDir(): string {
	return process.env.DATA_DIR ?? join(process.cwd(), 'data');
}

export function dataPath(...segments: string[]): string {
	return join(getDataDir(), ...segments);
}

export function readJsonFile(path: string): unknown {
	const raw = readFileSync(path, 'utf8');
	return JSON.parse(raw) as unknown;
}

export function atomicWriteJson(path: string, data: unknown): void {
	const dir = dirname(path);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const contents = `${JSON.stringify(data, null, '\t')}\n`;
	const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(tempPath, contents, 'utf8');

	try {
		renameSync(tempPath, path);
	} catch {
		// Windows cannot rename over an existing destination.
		if (existsSync(path)) {
			unlinkSync(path);
		}
		renameSync(tempPath, path);
	}
}

/** Serialize mutations in-process so concurrent saves cannot interleave. */
export function withWriteLock<T>(fn: () => T): Promise<T> {
	const run = writeChain.then(
		() => fn(),
		() => fn()
	);
	writeChain = run.then(
		() => undefined,
		() => undefined
	);
	return run;
}
