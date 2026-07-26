/** Seeded 32-bit PRNG (mulberry32). */
export function createRng(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function fade(t: number): number {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function grad3(hash: number, x: number, y: number, z: number): number {
	const h = hash & 15;
	const u = h < 8 ? x : y;
	const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
	return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Classic Perlin-style 3D value noise with a permutation table built from a seed. */
export function createNoise3D(seed: number): (x: number, y: number, z: number) => number {
	const rng = createRng(seed);
	const perm = new Uint8Array(512);
	const p = new Uint8Array(256);
	for (let i = 0; i < 256; i++) p[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = p[i];
		p[i] = p[j];
		p[j] = tmp;
	}
	for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

	return (x: number, y: number, z: number) => {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		const Z = Math.floor(z) & 255;

		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);
		const zf = z - Math.floor(z);

		const u = fade(xf);
		const v = fade(yf);
		const w = fade(zf);

		const A = perm[X] + Y;
		const AA = perm[A] + Z;
		const AB = perm[A + 1] + Z;
		const B = perm[X + 1] + Y;
		const BA = perm[B] + Z;
		const BB = perm[B + 1] + Z;

		return lerp(
			lerp(
				lerp(grad3(perm[AA], xf, yf, zf), grad3(perm[BA], xf - 1, yf, zf), u),
				lerp(grad3(perm[AB], xf, yf - 1, zf), grad3(perm[BB], xf - 1, yf - 1, zf), u),
				v
			),
			lerp(
				lerp(grad3(perm[AA + 1], xf, yf, zf - 1), grad3(perm[BA + 1], xf - 1, yf, zf - 1), u),
				lerp(
					grad3(perm[AB + 1], xf, yf - 1, zf - 1),
					grad3(perm[BB + 1], xf - 1, yf - 1, zf - 1),
					u
				),
				v
			),
			w
		);
	};
}

export function fbm3(
	noise: (x: number, y: number, z: number) => number,
	x: number,
	y: number,
	z: number,
	octaves = 5,
	lacunarity = 2,
	gain = 0.5
): number {
	let amp = 1;
	let freq = 1;
	let sum = 0;
	let norm = 0;
	for (let i = 0; i < octaves; i++) {
		sum += amp * noise(x * freq, y * freq, z * freq);
		norm += amp;
		amp *= gain;
		freq *= lacunarity;
	}
	return sum / norm;
}

/** Ridged multifractal: sharp peaks and valleys from absolute noise. Returns roughly 0–1. */
export function ridgedFbm3(
	noise: (x: number, y: number, z: number) => number,
	x: number,
	y: number,
	z: number,
	octaves = 5,
	lacunarity = 2.2,
	gain = 0.55
): number {
	let amp = 0.5;
	let freq = 1;
	let sum = 0;
	let weight = 1;
	for (let i = 0; i < octaves; i++) {
		let n = noise(x * freq, y * freq, z * freq);
		n = 1 - Math.abs(n);
		n *= n;
		n *= weight;
		weight = Math.min(1, Math.max(0, n * 2));
		sum += n * amp;
		freq *= lacunarity;
		amp *= gain;
	}
	return Math.min(1, Math.max(0, sum));
}
