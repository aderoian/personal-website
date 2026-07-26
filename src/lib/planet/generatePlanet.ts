import {
	BufferAttribute,
	BufferGeometry,
	Color,
	Group,
	IcosahedronGeometry,
	Mesh,
	MeshLambertMaterial
} from 'three';
import { createAircraft, type AircraftBundle } from './aerialFeatures';
import {
	createAtmosphereMaterial,
	createInnerAtmosphereMaterial,
	type AtmosphereMaterialBundle
} from './atmosphereMaterial';
import { BIOME_COLORS, coastalBlendFactor, pickBiome, type BiomeKind } from './biomes';
import { createCloudMaterial, type CloudMaterialBundle } from './cloudMaterial';
import { createRng } from './noise';
import {
	emptyPlaceableCounts,
	placeObjects,
	type PlaceableBundle,
	type PlaceableCounts,
	type PlaceableDescriptor,
	type SurfacePoint
} from './placeableObjects';
import { planetConfig } from './planetConfig';
import {
	computeSlopes,
	createTerrainNoise,
	createTerrainParams,
	sampleTerrainElevation,
	sampleTerrainFields,
	shapedDisplacement
} from './terrain';
import {
	createLakeWaterMaterial,
	createRiverWaterMaterial,
	createWaterMaterial,
	type WaterMaterialBundle
} from './waterMaterial';

export type PlanetOptions = {
	seed?: number;
	detail?: number;
	radius?: number;
	maxDisplacement?: number;
	seaLevel?: number;
	/** Multiplier for automatic prop density. */
	objectDensity?: number;
	/** Explicit static placeables. */
	placeables?: PlaceableDescriptor[];
	/** Override aircraft count (0 disables). */
	aircraftCount?: number;
	/** Disable cloud shell when false. */
	clouds?: boolean;
};

export type GeneratedPlanet = {
	group: Group;
	seed: number;
	biomes: BiomeKind[];
	objectCounts: PlaceableCounts;
	aircraftCount: number;
	/** Terrain, water, atmosphere, cloud, and aircraft meshes for layer assertions. */
	layers: {
		terrain: Mesh;
		water: Mesh;
		/** Lake face overlay; null when no lakes. */
		lakes: Mesh | null;
		/** River face overlay; null when no rivers. */
		rivers: Mesh | null;
		atmosphere: Mesh;
		/** Front-face limb haze over the surface. */
		atmosphereInner: Mesh;
		/** Sparse procedural cloud shell; null when disabled. */
		clouds: Mesh | null;
		/** Aircraft group; null when count is 0. */
		aircraft: Group | null;
	};
	/** Drive animated water / atmosphere / clouds / aircraft uniforms each frame. */
	update: (elapsedSeconds: number, lightDir?: [number, number, number]) => void;
	dispose: () => void;
};

function hashSeed(): number {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return buf[0] >>> 0;
}

/** Quantize a unit direction to a packed integer key (≈1e-5 precision). */
function dirQuantKey(nx: number, ny: number, nz: number): number {
	const qx = Math.round(nx * 1e5) + 100000;
	const qy = Math.round(ny * 1e5) + 100000;
	const qz = Math.round(nz * 1e5) + 100000;
	return (qx * 200001 + qy) * 200001 + qz;
}

/** Weld duplicate face vertices so lakes/rivers can walk a real mesh graph. */
export function weldVertices(geometry: BufferGeometry): {
	uniqueCount: number;
	vertToUnique: Uint32Array;
	uniqueToVerts: number[][];
	neighbors: number[][];
	uniqueDirs: Float32Array;
} {
	const pos = geometry.getAttribute('position') as BufferAttribute;
	const vertCount = pos.count;
	const vertToUnique = new Uint32Array(vertCount);
	const uniqueToVerts: number[][] = [];
	const keyToUnique = new Map<number, number>();
	const uniqueDirs: number[] = [];

	for (let i = 0; i < vertCount; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const len = Math.hypot(x, y, z) || 1;
		const nx = x / len;
		const ny = y / len;
		const nz = z / len;
		const key = dirQuantKey(nx, ny, nz);
		let u = keyToUnique.get(key);
		if (u === undefined) {
			u = uniqueToVerts.length;
			keyToUnique.set(key, u);
			uniqueToVerts.push([]);
			uniqueDirs.push(nx, ny, nz);
		}
		vertToUnique[i] = u;
		uniqueToVerts[u].push(i);
	}

	const uniqueCount = uniqueToVerts.length;
	const neighborSets: Array<Set<number>> = Array.from({ length: uniqueCount }, () => new Set());
	const addEdge = (a: number, b: number) => {
		if (a === b) return;
		neighborSets[a].add(b);
		neighborSets[b].add(a);
	};

	for (let i = 0; i < vertCount; i += 3) {
		const a = vertToUnique[i];
		const b = vertToUnique[i + 1];
		const c = vertToUnique[i + 2];
		addEdge(a, b);
		addEdge(b, c);
		addEdge(c, a);
	}

	const neighbors: number[][] = neighborSets.map((s) => Array.from(s));

	return {
		uniqueCount,
		vertToUnique,
		uniqueToVerts,
		neighbors,
		uniqueDirs: new Float32Array(uniqueDirs)
	};
}

export function findLakes(
	heights: Float32Array,
	neighbors: number[][],
	seaLevel: number,
	rng: () => number,
	maxLakes: number = planetConfig.hydrology.lake.maxCount,
	maxBasin: number = planetConfig.hydrology.lake.basinBase,
	minBasin: number = planetConfig.hydrology.lake.minBasinBase
): Set<number> {
	const lake = new Set<number>();
	const minima: number[] = [];
	const lakeCfg = planetConfig.hydrology.lake;

	for (let i = 0; i < heights.length; i++) {
		if (heights[i] < seaLevel) continue;
		const h = heights[i];
		if (h >= seaLevel + lakeCfg.maxHeightAboveSea) continue;
		let isMin = true;
		for (const n of neighbors[i]) {
			if (heights[n] < h) {
				isMin = false;
				break;
			}
		}
		if (isMin) minima.push(i);
	}

	for (let i = minima.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[minima[i], minima[j]] = [minima[j], minima[i]];
	}

	let lakesMade = 0;
	const bfsCap = Math.max(maxBasin + 40, 140);
	for (const seed of minima) {
		if (lakesMade >= maxLakes) break;
		const floodLevel = heights[seed] + lakeCfg.floodAdd + rng() * lakeCfg.floodRange;
		if (floodLevel >= seaLevel + lakeCfg.maxFloodAboveSea) continue;

		const basin: number[] = [];
		const queue = [seed];
		let head = 0;
		const visited = new Set<number>([seed]);
		let spillsToOcean = false;

		while (head < queue.length) {
			const v = queue[head++];
			if (heights[v] < seaLevel) {
				spillsToOcean = true;
				break;
			}
			if (heights[v] > floodLevel) continue;
			basin.push(v);
			for (const n of neighbors[v]) {
				if (!visited.has(n)) {
					visited.add(n);
					queue.push(n);
				}
			}
			if (basin.length > bfsCap) break;
		}

		if (spillsToOcean || basin.length < minBasin || basin.length > maxBasin) continue;

		for (const v of basin) {
			lake.add(v);
			heights[v] = Math.min(heights[v], floodLevel - 0.002);
		}
		lakesMade++;
	}

	return lake;
}

export function carveRivers(
	heights: Float32Array,
	neighbors: number[][],
	seaLevel: number,
	lakeVerts: Set<number>,
	rng: () => number,
	riverCount: number = planetConfig.hydrology.river.maxCount,
	maxSteps: number = planetConfig.hydrology.river.stepsBase
): Set<number> {
	const river = new Set<number>();
	const riverCfg = planetConfig.hydrology.river;
	const candidates: number[] = [];
	for (let i = 0; i < heights.length; i++) {
		if (heights[i] > riverCfg.startMin && heights[i] < riverCfg.startMax) candidates.push(i);
	}
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
	}

	let made = 0;
	for (const start of candidates) {
		if (made >= riverCount) break;
		const path: number[] = [];
		let current = start;
		const seen = new Set<number>();
		let reachedWater = false;

		for (let step = 0; step < maxSteps; step++) {
			if (seen.has(current)) break;
			seen.add(current);
			path.push(current);
			if (heights[current] < seaLevel || lakeVerts.has(current)) {
				reachedWater = true;
				break;
			}
			let best = -1;
			let bestH = heights[current];
			for (const n of neighbors[current]) {
				if (heights[n] < bestH) {
					bestH = heights[n];
					best = n;
				}
			}
			if (best < 0) break;
			current = best;
		}

		if (!reachedWater || path.length < riverCfg.minPath) continue;
		for (const v of path) {
			if (heights[v] >= seaLevel && !lakeVerts.has(v)) {
				river.add(v);
				heights[v] = Math.max(seaLevel + 0.002, heights[v] - riverCfg.carve);
			}
		}
		made++;
	}

	return river;
}

/**
 * Shore proximity for a unique vertex: 1 at land / water contact, 0 deep interior.
 * Land corners on mixed faces count as full edge so foam seals the rim.
 */
export function inlandWaterEdgeFactor(
	uniqueIndex: number,
	waterVerts: Set<number>,
	neighbors: number[][] | undefined
): number {
	if (!waterVerts.has(uniqueIndex)) return 1;
	if (!neighbors) return 0;
	const nbs = neighbors[uniqueIndex];
	if (!nbs || nbs.length === 0) return 0;
	let landNeighbors = 0;
	for (const n of nbs) {
		if (!waterVerts.has(n)) landNeighbors++;
	}
	if (landNeighbors === 0) return 0;
	// Soft ramp: one land neighbor still reads as a clear foam rim.
	return Math.min(1, 0.55 + (landNeighbors / nbs.length) * 0.7);
}

/**
 * Soft ocean shore foam weight from elevation.
 * Peaks at the land/water line (depth 0) and falls off into deeper water; 0 on land.
 */
export function oceanShoreFactor(elevation: number, seaLevel: number, width: number): number {
	if (width <= 0) return 0;
	const depth = seaLevel - elevation;
	if (depth < 0 || depth >= width) return 0;
	const t = depth / width;
	return 1 - t * t * (3 - 2 * t);
}

/**
 * Coast factor on the terrain graph: elevation band + land-neighbor adjacency.
 * Used for tests and as the semantic source of truth for shoreline foam.
 */
export function terrainOceanCoastFactor(
	uniqueIndex: number,
	elevations: Float32Array,
	seaLevel: number,
	neighbors: number[][],
	width: number
): number {
	const elev = elevations[uniqueIndex];
	if (elev >= seaLevel) return 0;
	const shore = oceanShoreFactor(elev, seaLevel, width);
	const nbs = neighbors[uniqueIndex];
	if (!nbs || nbs.length === 0) return shore;
	let landNeighbors = 0;
	for (const n of nbs) {
		if (elevations[n] >= seaLevel) landNeighbors++;
	}
	if (landNeighbors === 0) return shore;
	const adjacency = Math.min(1, 0.5 + (landNeighbors / nbs.length) * 0.8);
	const deepBand = oceanShoreFactor(elev, seaLevel, width * 1.75);
	return Math.min(1, Math.max(shore, adjacency * Math.max(deepBand, 0.4)));
}

/**
 * Sample shoreline foam at a unit direction using terrain elevation + land probes.
 * Probes catch steep coasts where the depth band alone would be too thin.
 */
export function sampleOceanCoastAtDir(
	nx: number,
	ny: number,
	nz: number,
	sampleElevation: (x: number, y: number, z: number) => number,
	seaLevel: number,
	width: number,
	probeAngle: number
): number {
	const elev = sampleElevation(nx, ny, nz);
	if (elev >= seaLevel) return 0;
	let coast = oceanShoreFactor(elev, seaLevel, width);

	const useYUp = Math.abs(ny) < 0.9;
	const rx = useYUp ? 0 : 1;
	const ry = useYUp ? 1 : 0;
	const rz = 0;
	let tx = ry * nz - rz * ny;
	let ty = rz * nx - rx * nz;
	let tz = rx * ny - ry * nx;
	const tLen = Math.hypot(tx, ty, tz) || 1;
	tx /= tLen;
	ty /= tLen;
	tz /= tLen;
	let bx = ny * tz - nz * ty;
	let by = nz * tx - nx * tz;
	let bz = nx * ty - ny * tx;
	const bLen = Math.hypot(bx, by, bz) || 1;
	bx /= bLen;
	by /= bLen;
	bz /= bLen;

	let landHits = 0;
	const probeDirs = [tx, ty, tz, -tx, -ty, -tz, bx, by, bz, -bx, -by, -bz];
	for (let p = 0; p < 12; p += 3) {
		const sx = nx + probeDirs[p] * probeAngle;
		const sy = ny + probeDirs[p + 1] * probeAngle;
		const sz = nz + probeDirs[p + 2] * probeAngle;
		const sl = Math.hypot(sx, sy, sz) || 1;
		if (sampleElevation(sx / sl, sy / sl, sz / sl) >= seaLevel) landHits++;
	}

	if (landHits > 0) {
		const adjacency = Math.min(1, 0.48 + landHits * 0.18);
		const deepBand = oceanShoreFactor(elev, seaLevel, width * 1.75);
		coast = Math.min(1, Math.max(coast, adjacency * Math.max(deepBand, 0.38)));
	}

	return coast;
}

/**
 * Write `aCoast` on the ocean sphere from terrain elevation (shoreline mask).
 * Independent of camera facing / Fresnel.
 */
export function paintOceanCoastAttribute(
	geometry: BufferGeometry,
	sampleElevation: (nx: number, ny: number, nz: number) => number,
	seaLevel: number,
	width: number = planetConfig.water.foam.oceanCoastWidth,
	probeAngle: number = planetConfig.water.foam.oceanCoastProbe
): void {
	const pos = geometry.getAttribute('position') as BufferAttribute;
	const coasts = new Float32Array(pos.count);
	// Deduplicate by unit direction — non-indexed icosahedra repeat corners ~6×.
	const keyToCoast = new Map<number, number>();
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const len = Math.hypot(x, y, z) || 1;
		const nx = x / len;
		const ny = y / len;
		const nz = z / len;
		const key = dirQuantKey(nx, ny, nz);
		let coast = keyToCoast.get(key);
		if (coast === undefined) {
			coast = sampleOceanCoastAtDir(nx, ny, nz, sampleElevation, seaLevel, width, probeAngle);
			keyToCoast.set(key, coast);
		}
		coasts[i] = coast;
	}
	geometry.setAttribute('aCoast', new BufferAttribute(coasts, 1));
}

/**
 * Extract lake or river faces into a lifted overlay geometry for the water shader.
 * A face is included when at least 2 of 3 unique verts belong to the set (avoids hairline noise).
 * Writes `aEdge` so the water shader can foam along land contact.
 */
export function extractInlandWaterGeometry(
	posAttr: BufferAttribute,
	vertToUnique: Uint32Array,
	waterVerts: Set<number>,
	lift: number,
	neighbors?: number[][]
): BufferGeometry | null {
	const positions: number[] = [];
	const normals: number[] = [];
	const edges: number[] = [];
	const vertCount = posAttr.count;

	for (let i = 0; i < vertCount; i += 3) {
		const ua = vertToUnique[i];
		const ub = vertToUnique[i + 1];
		const uc = vertToUnique[i + 2];
		const hits =
			(waterVerts.has(ua) ? 1 : 0) + (waterVerts.has(ub) ? 1 : 0) + (waterVerts.has(uc) ? 1 : 0);
		if (hits < 2) continue;

		const faceEdgeBoost = hits === 2 ? 0.35 : 0;
		for (let k = 0; k < 3; k++) {
			const vi = i + k;
			const u = vertToUnique[vi];
			const x = posAttr.getX(vi);
			const y = posAttr.getY(vi);
			const z = posAttr.getZ(vi);
			const len = Math.hypot(x, y, z) || 1;
			const nx = x / len;
			const ny = y / len;
			const nz = z / len;
			const r = len + lift;
			positions.push(nx * r, ny * r, nz * r);
			normals.push(nx, ny, nz);
			edges.push(Math.min(1, inlandWaterEdgeFactor(u, waterVerts, neighbors) + faceEdgeBoost));
		}
	}

	if (positions.length === 0) return null;

	const geo = new BufferGeometry();
	geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
	geo.setAttribute('aEdge', new BufferAttribute(new Float32Array(edges), 1));
	return geo;
}

function defaultLightDir(): [number, number, number] {
	const [x, y, z] = planetConfig.scene.lights.key.position;
	const len = Math.hypot(x, y, z) || 1;
	return [x / len, y / len, z / len];
}

/**
 * Build a procedural planet group (terrain + water + atmosphere + placeables).
 * New seed each call → different world when seed omitted.
 */
export function generatePlanet(options: PlanetOptions = {}): GeneratedPlanet {
	const cfg = planetConfig;
	const seed = options.seed ?? hashSeed();
	const detail = options.detail ?? cfg.detail;
	const radius = options.radius ?? cfg.radius;
	const maxDisplacement = options.maxDisplacement ?? cfg.maxDisplacement;
	const seaLevel = options.seaLevel ?? cfg.seaLevel;
	const objectDensity = options.objectDensity ?? cfg.objectDensity;

	const rng = createRng(seed);
	const noise = createTerrainNoise(seed);
	const params = createTerrainParams(rng, seaLevel);

	const geometry = new IcosahedronGeometry(1, detail);
	const working = geometry.index ? geometry.toNonIndexed() : geometry;
	if (geometry.index) geometry.dispose();

	const { uniqueCount, vertToUnique, uniqueToVerts, neighbors, uniqueDirs } = weldVertices(working);

	const elevations = new Float32Array(uniqueCount);
	const moistures = new Float32Array(uniqueCount);
	const temperatures = new Float32Array(uniqueCount);
	const mountains = new Float32Array(uniqueCount);
	const slopes = new Float32Array(uniqueCount);

	for (let i = 0; i < uniqueCount; i++) {
		const nx = uniqueDirs[i * 3];
		const ny = uniqueDirs[i * 3 + 1];
		const nz = uniqueDirs[i * 3 + 2];
		const sample = sampleTerrainFields(nx, ny, nz, noise, params);
		elevations[i] = sample.elevation;
		mountains[i] = sample.mountain;
		moistures[i] = sample.moisture;
		temperatures[i] = sample.temperature;
	}

	computeSlopes(elevations, neighbors, slopes);

	const densityScale = Math.max(1, (detail * detail) / 100);
	const lakeCfg = cfg.hydrology.lake;
	const riverCfg = cfg.hydrology.river;
	const lakeVerts = findLakes(
		elevations,
		neighbors,
		seaLevel,
		rng,
		Math.min(lakeCfg.maxCount, Math.floor(lakeCfg.baseCount + densityScale * lakeCfg.countScale)),
		Math.min(400, Math.floor(lakeCfg.basinBase * Math.sqrt(densityScale))),
		Math.max(5, Math.floor(lakeCfg.minBasinBase * Math.sqrt(densityScale)))
	);
	const riverVerts = carveRivers(
		elevations,
		neighbors,
		seaLevel,
		lakeVerts,
		rng,
		Math.min(
			riverCfg.maxCount,
			Math.floor(riverCfg.baseCount + densityScale * riverCfg.countScale)
		),
		Math.min(400, Math.floor(riverCfg.stepsBase * Math.sqrt(densityScale)))
	);

	const radii = new Float32Array(uniqueCount);
	const posAttr = working.getAttribute('position') as BufferAttribute;
	const vertCount = posAttr.count;
	let peakRadius = radius;

	for (let u = 0; u < uniqueCount; u++) {
		let h = elevations[u];
		const isOcean = h < seaLevel;
		if (isOcean) h = seaLevel;
		if (lakeVerts.has(u)) h = Math.max(h, seaLevel + 0.004);

		const displacement = shapedDisplacement(
			elevations[u],
			mountains[u],
			seaLevel,
			maxDisplacement,
			isOcean
		);
		const r = radius + displacement;
		radii[u] = r;
		if (r > peakRadius) peakRadius = r;

		const nx = uniqueDirs[u * 3];
		const ny = uniqueDirs[u * 3 + 1];
		const nz = uniqueDirs[u * 3 + 2];
		const px = nx * r;
		const py = ny * r;
		const pz = nz * r;

		for (const vi of uniqueToVerts[u]) {
			posAttr.setXYZ(vi, px, py, pz);
		}
	}
	posAttr.needsUpdate = true;

	const colors = new Float32Array(vertCount * 3);
	const tmp = new Color();
	const landColor = new Color();
	const waterHint = new Color();
	const uniqueBiomes: BiomeKind[] = new Array(uniqueCount);
	const surfacePoints: SurfacePoint[] = [];
	const coastWidth = cfg.terrain.coastBlendWidth;

	for (let u = 0; u < uniqueCount; u++) {
		let kind: BiomeKind;
		if (lakeVerts.has(u)) kind = 'lake';
		else if (riverVerts.has(u)) kind = 'river';
		else {
			kind = pickBiome({
				height: elevations[u],
				moisture: moistures[u],
				temperature: temperatures[u],
				slope: slopes[u],
				mountain: mountains[u],
				seaLevel
			});
		}
		uniqueBiomes[u] = kind;

		const nx = uniqueDirs[u * 3];
		const ny = uniqueDirs[u * 3 + 1];
		const nz = uniqueDirs[u * 3 + 2];

		if (kind === 'deepOcean' || kind === 'shallow') {
			// Ocean candidates for ships / platforms — elevation stores depth below sea.
			surfacePoints.push({
				index: u,
				dirX: nx,
				dirY: ny,
				dirZ: nz,
				radius,
				biome: kind,
				elevation: Math.max(0, seaLevel - elevations[u]),
				slope: slopes[u],
				mountain: mountains[u],
				domain: 'ocean'
			});
		} else if (kind !== 'lake' && kind !== 'river') {
			const domain = kind === 'beach' ? 'coast' : 'land';
			surfacePoints.push({
				index: u,
				dirX: nx,
				dirY: ny,
				dirZ: nz,
				radius: radii[u],
				biome: kind,
				elevation: Math.max(0, elevations[u] - seaLevel),
				slope: slopes[u],
				mountain: mountains[u],
				domain
			});
		}
	}

	for (let i = 0; i < vertCount; i += 3) {
		const ua = vertToUnique[i];
		const ub = vertToUnique[i + 1];
		const uc = vertToUnique[i + 2];

		let kind: BiomeKind;
		const avgH = (elevations[ua] + elevations[ub] + elevations[uc]) / 3;
		const lakeHits =
			(lakeVerts.has(ua) ? 1 : 0) + (lakeVerts.has(ub) ? 1 : 0) + (lakeVerts.has(uc) ? 1 : 0);
		const riverHits =
			(riverVerts.has(ua) ? 1 : 0) + (riverVerts.has(ub) ? 1 : 0) + (riverVerts.has(uc) ? 1 : 0);
		// Match overlay extraction (hits ≥ 2). Faces with only one water vert stay land-colored
		// with a light wet tint — heavy dark underlay there was the black river outline.
		const inlandCovered = lakeHits >= 2 || riverHits >= 2;
		const inlandTouch = !inlandCovered && (lakeHits === 1 || riverHits === 1);

		if (inlandCovered) {
			kind = lakeHits >= 2 ? 'lake' : 'river';
		} else {
			const avgM = (moistures[ua] + moistures[ub] + moistures[uc]) / 3;
			const avgT = (temperatures[ua] + temperatures[ub] + temperatures[uc]) / 3;
			const avgS = (slopes[ua] + slopes[ub] + slopes[uc]) / 3;
			const avgMt = (mountains[ua] + mountains[ub] + mountains[uc]) / 3;
			kind = pickBiome({
				height: avgH,
				moisture: avgM,
				temperature: avgT,
				slope: avgS,
				mountain: avgMt,
				seaLevel
			});
		}

		tmp.copy(BIOME_COLORS[kind]);

		const underlay = cfg.water.inlandUnderlay;
		// Soften land↔ocean color boundary. Inland overlays get a wet-sand underlay
		// (not a near-black dim) so transparent edges don't ring dark.
		if (inlandCovered) {
			waterHint.copy(BIOME_COLORS[kind === 'lake' ? 'shallow' : 'river']);
			landColor.copy(BIOME_COLORS.beach);
			tmp.copy(waterHint).lerp(landColor, underlay.wetBlend);
			tmp.multiplyScalar(underlay.darken);
		} else if (inlandTouch) {
			landColor.copy(BIOME_COLORS.beach);
			tmp.lerp(landColor, underlay.edgeWetBlend);
		} else {
			const blend = coastalBlendFactor(avgH, seaLevel, coastWidth);
			if (kind === 'deepOcean' || kind === 'shallow') {
				waterHint.copy(BIOME_COLORS[kind]);
				landColor.copy(BIOME_COLORS.beach);
				tmp.copy(waterHint).lerp(landColor, (1 - blend) * 0.55);
				tmp.multiplyScalar(0.55 + 0.2 * (1 - blend));
			} else if (blend > 0.02) {
				landColor.copy(BIOME_COLORS[kind]);
				waterHint.copy(BIOME_COLORS.beach);
				tmp.copy(landColor).lerp(waterHint, blend * 0.7);
			}
		}

		const jitter = planetConfig.terrain.colorJitter;
		tmp.offsetHSL((rng() - 0.5) * jitter.h, (rng() - 0.5) * jitter.s, (rng() - 0.5) * jitter.l);

		for (let k = 0; k < 3; k++) {
			const vi = i + k;
			colors[vi * 3] = tmp.r;
			colors[vi * 3 + 1] = tmp.g;
			colors[vi * 3 + 2] = tmp.b;
		}
	}

	working.setAttribute('color', new BufferAttribute(colors, 3));
	working.deleteAttribute('normal');
	working.computeVertexNormals();

	const terrainMat = new MeshLambertMaterial({
		vertexColors: true,
		flatShading: true
	});
	const terrain = new Mesh(working, terrainMat);
	terrain.name = 'planet:terrain';
	terrain.renderOrder = 0;

	// Smooth ocean sphere at mean sea radius (land peaks stick through).
	const seaRadius = radius; // shapedDisplacement clamps ocean to seaLevel → radius
	const waterGeo = new IcosahedronGeometry(seaRadius, cfg.water.detail);
	const foamCfg = cfg.water.foam;
	paintOceanCoastAttribute(
		waterGeo,
		(nx, ny, nz) => sampleTerrainElevation(nx, ny, nz, noise, params).elevation,
		seaLevel,
		foamCfg.oceanCoastWidth,
		foamCfg.oceanCoastProbe
	);
	const waterBundle: WaterMaterialBundle = createWaterMaterial();
	const water = new Mesh(waterGeo, waterBundle.material);
	water.name = 'planet:water';
	water.renderOrder = 1;

	const inlandLift = cfg.water.inlandLift;
	const lakeGeo = extractInlandWaterGeometry(
		posAttr,
		vertToUnique,
		lakeVerts,
		inlandLift,
		neighbors
	);
	// Prefer lake overlay on shared edge faces — strip lake verts from river membership for extraction.
	const riverOnly = new Set<number>();
	for (const v of riverVerts) {
		if (!lakeVerts.has(v)) riverOnly.add(v);
	}
	const riverGeo = extractInlandWaterGeometry(
		posAttr,
		vertToUnique,
		riverOnly,
		inlandLift,
		neighbors
	);

	let lakeBundle: WaterMaterialBundle | null = null;
	let lakeMesh: Mesh | null = null;
	if (lakeGeo) {
		lakeBundle = createLakeWaterMaterial();
		lakeMesh = new Mesh(lakeGeo, lakeBundle.material);
		lakeMesh.name = 'planet:lakes';
		lakeMesh.renderOrder = 1;
	}

	let riverBundle: WaterMaterialBundle | null = null;
	let riverMesh: Mesh | null = null;
	if (riverGeo) {
		riverBundle = createRiverWaterMaterial();
		riverMesh = new Mesh(riverGeo, riverBundle.material);
		riverMesh.name = 'planet:rivers';
		riverMesh.renderOrder = 1;
	}

	const atm = cfg.atmosphere;
	const peakClear = Math.max(peakRadius * atm.peakClearanceFactor, radius * atm.minRadiusFactor);
	const atmRadius = peakClear + atm.thickness;
	const atmosphereGeo = new IcosahedronGeometry(atmRadius, atm.detail);
	const atmosphereBundle: AtmosphereMaterialBundle = createAtmosphereMaterial();
	const atmosphere = new Mesh(atmosphereGeo, atmosphereBundle.material);
	atmosphere.name = 'planet:atmosphere';

	const innerAtmRadius = peakClear + atm.innerThickness;
	const atmosphereInnerGeo = new IcosahedronGeometry(innerAtmRadius, atm.detail);
	const atmosphereInnerBundle: AtmosphereMaterialBundle = createInnerAtmosphereMaterial();
	const atmosphereInner = new Mesh(atmosphereInnerGeo, atmosphereInnerBundle.material);
	atmosphereInner.name = 'planet:atmosphereInner';
	// Draw inner haze after water, outer halo last so premultiplied layers composite in order.
	atmosphereInner.renderOrder = 2;
	atmosphere.renderOrder = 3;

	const enableClouds = options.clouds !== false;
	let cloudBundle: CloudMaterialBundle | null = null;
	let cloudMesh: Mesh | null = null;
	let cloudGeo: IcosahedronGeometry | null = null;
	if (enableClouds) {
		const cloudRadius = peakClear + cfg.clouds.altitude;
		cloudGeo = new IcosahedronGeometry(cloudRadius, cfg.clouds.detail);
		cloudBundle = createCloudMaterial(seed ^ cfg.clouds.seedXor);
		cloudMesh = new Mesh(cloudGeo, cloudBundle.material);
		cloudMesh.name = 'planet:clouds';
		// Between inner haze and outer halo so soft clouds sit in atmosphere.
		cloudMesh.renderOrder = 2;
	}

	const aircraftCountOpt = options.aircraftCount ?? cfg.aircraft.count;
	let aircraft: AircraftBundle = {
		group: new Group(),
		count: 0,
		update: () => {},
		dispose: () => {}
	};
	try {
		aircraft = createAircraft(radius, seed, aircraftCountOpt);
		aircraft.group.renderOrder = 1;
	} catch (err) {
		console.error('Aircraft generation failed:', err);
	}

	const group = new Group();
	group.name = 'planet';
	group.add(terrain);
	group.add(water);
	if (lakeMesh) group.add(lakeMesh);
	if (riverMesh) group.add(riverMesh);
	if (aircraft.count > 0) group.add(aircraft.group);
	group.add(atmosphereInner);
	if (cloudMesh) group.add(cloudMesh);
	group.add(atmosphere);

	const placeRng = createRng(seed ^ 0x27d4eb2d);
	let placeable: PlaceableBundle = {
		meshes: [],
		counts: emptyPlaceableCounts(),
		dispose: () => {}
	};

	try {
		placeable = placeObjects(group, surfacePoints, {
			rng: placeRng,
			density: objectDensity,
			explicit: options.placeables
		});
	} catch (err) {
		console.error('Placeable object generation failed:', err);
	}

	const waterBundles: WaterMaterialBundle[] = [waterBundle];
	if (lakeBundle) waterBundles.push(lakeBundle);
	if (riverBundle) waterBundles.push(riverBundle);

	const light0 = defaultLightDir();
	for (const bundle of waterBundles) bundle.update(0, light0);
	atmosphereBundle.update(light0);
	atmosphereInnerBundle.update(light0);
	if (cloudBundle) cloudBundle.update(0, light0);
	aircraft.update(0);

	const update = (elapsedSeconds: number, lightDir?: [number, number, number]) => {
		const dir = lightDir ?? defaultLightDir();
		for (const bundle of waterBundles) bundle.update(elapsedSeconds, dir);
		atmosphereBundle.update(dir);
		atmosphereInnerBundle.update(dir);
		if (cloudBundle) cloudBundle.update(elapsedSeconds, dir);
		aircraft.update(elapsedSeconds);
	};

	const dispose = () => {
		placeable.dispose();
		aircraft.dispose();
		working.dispose();
		terrainMat.dispose();
		waterGeo.dispose();
		waterBundle.dispose();
		if (lakeGeo) lakeGeo.dispose();
		if (lakeBundle) lakeBundle.dispose();
		if (riverGeo) riverGeo.dispose();
		if (riverBundle) riverBundle.dispose();
		atmosphereGeo.dispose();
		atmosphereBundle.dispose();
		atmosphereInnerGeo.dispose();
		atmosphereInnerBundle.dispose();
		if (cloudGeo) cloudGeo.dispose();
		if (cloudBundle) cloudBundle.dispose();
	};

	return {
		group,
		seed,
		biomes: uniqueBiomes,
		objectCounts: placeable.counts,
		aircraftCount: aircraft.count,
		layers: {
			terrain,
			water,
			lakes: lakeMesh,
			rivers: riverMesh,
			atmosphere,
			atmosphereInner,
			clouds: cloudMesh,
			aircraft: aircraft.count > 0 ? aircraft.group : null
		},
		update,
		dispose
	};
}

export { pickBiome, coastalBlendFactor } from './biomes';
export type {
	PlaceableDescriptor,
	PlaceableKind,
	PlaceableCounts,
	PlaceableDomain
} from './placeableObjects';
export {
	totalPlaceableCount,
	PLACEABLE_KINDS,
	emptyPlaceableCounts,
	getPlaceableDomain
} from './placeableObjects';
export {
	sampleTerrainElevation,
	sampleTerrainFields,
	shapedDisplacement,
	createTerrainNoise,
	createTerrainParams
} from './terrain';

export const PLANET_VISUAL_RADIUS =
	planetConfig.atmosphere.minRadiusFactor + planetConfig.atmosphere.thickness;
