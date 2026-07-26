import { createNoise3D, fbm3, ridgedFbm3 } from './noise';
import { planetConfig } from './planetConfig';

export type TerrainFields = {
	continentalness: number;
	elevation: number;
	mountain: number;
	moisture: number;
	temperature: number;
	slope: number;
};

export type TerrainNoiseSet = {
	height: (x: number, y: number, z: number) => number;
	moisture: (x: number, y: number, z: number) => number;
	temperature: (x: number, y: number, z: number) => number;
	mountain: (x: number, y: number, z: number) => number;
};

export type TerrainParams = {
	freq: number;
	moistureFreq: number;
	tempFreq: number;
	mountainFreq: number;
	warp: number;
	seaLevel: number;
};

export function createTerrainNoise(seed: number): TerrainNoiseSet {
	return {
		height: createNoise3D(seed),
		moisture: createNoise3D(seed ^ 0x9e3779b9),
		temperature: createNoise3D(seed ^ 0x85ebca6b),
		mountain: createNoise3D(seed ^ 0xc2b2ae35)
	};
}

export function createTerrainParams(rng: () => number, seaLevel: number): TerrainParams {
	const t = planetConfig.terrain;
	return {
		freq: t.freq.base + rng() * t.freq.range,
		moistureFreq: t.moistureFreq.base + rng() * t.moistureFreq.range,
		tempFreq: t.tempFreq.base + rng() * t.tempFreq.range,
		mountainFreq: t.mountainFreq.base + rng() * t.mountainFreq.range,
		warp: t.warp.base + rng() * t.warp.range,
		seaLevel
	};
}

/**
 * Elevation + mountain fields only — same math as `sampleTerrainFields` for those
 * channels, without moisture/temperature (used by coastline foam baking).
 */
export function sampleTerrainElevation(
	nx: number,
	ny: number,
	nz: number,
	noise: TerrainNoiseSet,
	params: TerrainParams
): { continentalness: number; elevation: number; mountain: number } {
	const { freq, mountainFreq, warp } = params;
	const land = planetConfig.land;
	const t = planetConfig.terrain;
	const mt = t.mountain;
	const ws = t.warpSampleScale;

	const wx = nx + fbm3(noise.height, nx * ws, ny * ws, nz * ws, t.warpOctaves) * warp;
	const wy = ny + fbm3(noise.height, nx * ws + 20, ny * ws, nz * ws, t.warpOctaves) * warp;
	const wz = nz + fbm3(noise.height, nx * ws, ny * ws + 20, nz * ws, t.warpOctaves) * warp;

	// Broad continents / ocean basins
	const continentRaw = fbm3(
		noise.height,
		nx * land.continentFreq + 40,
		ny * land.continentFreq,
		nz * land.continentFreq,
		land.continentOctaves,
		2.05,
		0.5
	);
	const continentalness = Math.pow(Math.max(0, continentRaw * 0.5 + land.landBias), land.landPower);

	let base = fbm3(noise.height, wx * freq, wy * freq, wz * freq, t.baseOctaves, 2.05, 0.5);
	base = base * 0.5 + 0.5;

	const rangeMaskRaw = fbm3(
		noise.mountain,
		nx * mountainFreq * mt.rangeMaskScale + 70,
		ny * mountainFreq * mt.rangeMaskScale,
		nz * mountainFreq * mt.rangeMaskScale,
		4,
		2.1,
		0.52
	);
	const rangeMask =
		Math.pow(Math.max(0, rangeMaskRaw * 0.5 + mt.rangeMaskBias), mt.rangeMaskPower) *
		continentalness;

	const ridges = ridgedFbm3(
		noise.mountain,
		wx * mountainFreq * mt.ridgeScale + 120,
		wy * mountainFreq * mt.ridgeScale,
		wz * mountainFreq * mt.ridgeScale,
		5,
		2.15,
		0.55
	);

	const foothills = ridgedFbm3(
		noise.mountain,
		wx * mountainFreq * mt.foothillScale + 200,
		wy * mountainFreq * mt.foothillScale,
		wz * mountainFreq * mt.foothillScale,
		3,
		2.3,
		0.5
	);

	const mountain = Math.min(
		1,
		rangeMask * (mt.ridgeWeight + ridges * mt.ridgeMix) +
			foothills * mt.foothillWeight * continentalness
	);

	const valley = Math.pow(1 - ridges, mt.valleyPower) * rangeMask * land.valleyCarve;
	const w = land.elevationWeights;
	let elevation =
		base * w.base + continentalness * w.continentalness + mountain * w.mountain - valley;
	elevation = Math.min(1, Math.max(0, elevation));

	return { continentalness, elevation, mountain };
}

/**
 * Sample continentalness, elevation, mountain strength, moisture, and temperature
 * for a unit-sphere direction. Slope is filled later from neighbors.
 */
export function sampleTerrainFields(
	nx: number,
	ny: number,
	nz: number,
	noise: TerrainNoiseSet,
	params: TerrainParams
): Omit<TerrainFields, 'slope'> {
	const { moistureFreq, tempFreq } = params;
	const t = planetConfig.terrain;

	const { continentalness, elevation, mountain } = sampleTerrainElevation(
		nx,
		ny,
		nz,
		noise,
		params
	);

	const moistureRaw = fbm3(
		noise.moisture,
		nx * moistureFreq + 90,
		ny * moistureFreq,
		nz * moistureFreq,
		4
	);
	let moisture = moistureRaw * 0.5 + 0.5;
	moisture = Math.min(
		1,
		Math.max(
			0,
			moisture -
				mountain * t.moisture.mountainDryness +
				continentalness * t.moisture.continentWetness
		)
	);

	const latitude = Math.abs(ny);
	const tempNoise = fbm3(noise.temperature, nx * tempFreq + 150, ny * tempFreq, nz * tempFreq, 3);
	let temperature =
		1 -
		latitude * t.temperature.latitudeWeight +
		(tempNoise * 0.5 + 0.5) * t.temperature.noiseWeight;
	temperature -= elevation * t.temperature.lapseRate;
	temperature = Math.min(1, Math.max(0, temperature));

	return { continentalness, elevation, mountain, moisture, temperature };
}

export function computeSlopes(
	elevations: Float32Array,
	neighbors: number[][],
	out: Float32Array
): void {
	const slopeScale = planetConfig.terrain.slopeScale;
	for (let i = 0; i < elevations.length; i++) {
		const h = elevations[i];
		let maxDelta = 0;
		for (const n of neighbors[i]) {
			const d = Math.abs(elevations[n] - h);
			if (d > maxDelta) maxDelta = d;
		}
		out[i] = Math.min(1, maxDelta * slopeScale);
	}
}

export function shapedDisplacement(
	elevation: number,
	mountain: number,
	seaLevel: number,
	maxDisplacement: number,
	isOcean: boolean
): number {
	const d = planetConfig.terrain.displacement;
	if (isOcean) return -maxDisplacement * d.oceanInset;

	const aboveSea = (elevation - seaLevel) / Math.max(1e-6, 1 - seaLevel);
	const shaped = Math.pow(Math.max(0, aboveSea), d.landExponent);
	const peakBoost = 1 + mountain * d.peakBoost * Math.pow(Math.max(0, aboveSea), d.peakExponent);
	return shaped * maxDisplacement * peakBoost;
}
