import {
	BufferAttribute,
	BufferGeometry,
	Color,
	Group,
	IcosahedronGeometry,
	Mesh,
	MeshLambertMaterial
} from 'three';
import { createAtmosphereMaterial, type AtmosphereMaterialBundle } from './atmosphereMaterial';
import { BIOME_COLORS, coastalBlendFactor, pickBiome, type BiomeKind } from './biomes';
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
};

export type GeneratedPlanet = {
	group: Group;
	seed: number;
	biomes: BiomeKind[];
	objectCounts: PlaceableCounts;
	/** Terrain, water, and atmosphere meshes for layer assertions. */
	layers: {
		terrain: Mesh;
		water: Mesh;
		/** Lake face overlay; null when no lakes. */
		lakes: Mesh | null;
		/** River face overlay; null when no rivers. */
		rivers: Mesh | null;
		atmosphere: Mesh;
	};
	/** Drive animated water / atmosphere uniforms each frame. */
	update: (elapsedSeconds: number, lightDir?: [number, number, number]) => void;
	dispose: () => void;
};

function hashSeed(): number {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return buf[0] >>> 0;
}

function posKey(x: number, y: number, z: number): string {
	return `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
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
	const keyToUnique = new Map<string, number>();
	const uniqueDirs: number[] = [];

	for (let i = 0; i < vertCount; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const len = Math.hypot(x, y, z) || 1;
		const key = posKey(x / len, y / len, z / len);
		let u = keyToUnique.get(key);
		if (u === undefined) {
			u = uniqueToVerts.length;
			keyToUnique.set(key, u);
			uniqueToVerts.push([]);
			uniqueDirs.push(x / len, y / len, z / len);
		}
		vertToUnique[i] = u;
		uniqueToVerts[u].push(i);
	}

	const uniqueCount = uniqueToVerts.length;
	const neighbors: number[][] = Array.from({ length: uniqueCount }, () => []);
	const addEdge = (a: number, b: number) => {
		if (a === b) return;
		if (!neighbors[a].includes(b)) neighbors[a].push(b);
		if (!neighbors[b].includes(a)) neighbors[b].push(a);
	};

	for (let i = 0; i < vertCount; i += 3) {
		const a = vertToUnique[i];
		const b = vertToUnique[i + 1];
		const c = vertToUnique[i + 2];
		addEdge(a, b);
		addEdge(b, c);
		addEdge(c, a);
	}

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
		const visited = new Set<number>([seed]);
		let spillsToOcean = false;

		while (queue.length) {
			const v = queue.shift()!;
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
 * Extract lake or river faces into a lifted overlay geometry for the water shader.
 * A face is included when at least 2 of 3 unique verts belong to the set (avoids hairline noise).
 */
export function extractInlandWaterGeometry(
	posAttr: BufferAttribute,
	vertToUnique: Uint32Array,
	waterVerts: Set<number>,
	lift: number
): BufferGeometry | null {
	const positions: number[] = [];
	const normals: number[] = [];
	const vertCount = posAttr.count;

	for (let i = 0; i < vertCount; i += 3) {
		const ua = vertToUnique[i];
		const ub = vertToUnique[i + 1];
		const uc = vertToUnique[i + 2];
		const hits =
			(waterVerts.has(ua) ? 1 : 0) + (waterVerts.has(ub) ? 1 : 0) + (waterVerts.has(uc) ? 1 : 0);
		if (hits < 2) continue;

		for (let k = 0; k < 3; k++) {
			const vi = i + k;
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
		}
	}

	if (positions.length === 0) return null;

	const geo = new BufferGeometry();
	geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
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

		if (kind !== 'deepOcean' && kind !== 'shallow' && kind !== 'lake' && kind !== 'river') {
			surfacePoints.push({
				index: u,
				dirX: uniqueDirs[u * 3],
				dirY: uniqueDirs[u * 3 + 1],
				dirZ: uniqueDirs[u * 3 + 2],
				radius: radii[u],
				biome: kind,
				elevation: Math.max(0, elevations[u] - seaLevel),
				slope: slopes[u],
				mountain: mountains[u]
			});
		}
	}

	for (let i = 0; i < vertCount; i += 3) {
		const ua = vertToUnique[i];
		const ub = vertToUnique[i + 1];
		const uc = vertToUnique[i + 2];

		let kind: BiomeKind;
		const avgH = (elevations[ua] + elevations[ub] + elevations[uc]) / 3;

		if (lakeVerts.has(ua) || lakeVerts.has(ub) || lakeVerts.has(uc)) {
			kind = 'lake';
		} else if (riverVerts.has(ua) || riverVerts.has(ub) || riverVerts.has(uc)) {
			kind = 'river';
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

		// Soften land↔ocean color boundary. Submerged / inland water faces are dimmed
		// under the water shader overlays so seams stay soft.
		if (kind === 'lake' || kind === 'river') {
			tmp.multiplyScalar(0.45);
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
	const waterBundle: WaterMaterialBundle = createWaterMaterial();
	const water = new Mesh(waterGeo, waterBundle.material);
	water.name = 'planet:water';
	water.renderOrder = 1;

	const inlandLift = cfg.water.inlandLift;
	const lakeGeo = extractInlandWaterGeometry(posAttr, vertToUnique, lakeVerts, inlandLift);
	// Prefer lake overlay on shared edge faces — strip lake verts from river membership for extraction.
	const riverOnly = new Set<number>();
	for (const v of riverVerts) {
		if (!lakeVerts.has(v)) riverOnly.add(v);
	}
	const riverGeo = extractInlandWaterGeometry(posAttr, vertToUnique, riverOnly, inlandLift);

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
	const atmRadius =
		Math.max(peakRadius * atm.peakClearanceFactor, radius * atm.minRadiusFactor) + atm.thickness;
	const atmosphereGeo = new IcosahedronGeometry(atmRadius, atm.detail);
	const atmosphereBundle: AtmosphereMaterialBundle = createAtmosphereMaterial();
	const atmosphere = new Mesh(atmosphereGeo, atmosphereBundle.material);
	atmosphere.name = 'planet:atmosphere';
	atmosphere.renderOrder = 2;

	const group = new Group();
	group.name = 'planet';
	group.add(terrain);
	group.add(water);
	if (lakeMesh) group.add(lakeMesh);
	if (riverMesh) group.add(riverMesh);
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

	const update = (elapsedSeconds: number, lightDir?: [number, number, number]) => {
		const dir = lightDir ?? defaultLightDir();
		for (const bundle of waterBundles) bundle.update(elapsedSeconds, dir);
		atmosphereBundle.update(dir);
	};

	const dispose = () => {
		placeable.dispose();
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
	};

	return {
		group,
		seed,
		biomes: uniqueBiomes,
		objectCounts: placeable.counts,
		layers: { terrain, water, lakes: lakeMesh, rivers: riverMesh, atmosphere },
		update,
		dispose
	};
}

export { pickBiome, coastalBlendFactor } from './biomes';
export type { PlaceableDescriptor, PlaceableKind, PlaceableCounts } from './placeableObjects';
export { totalPlaceableCount, PLACEABLE_KINDS, emptyPlaceableCounts } from './placeableObjects';
export {
	sampleTerrainFields,
	shapedDisplacement,
	createTerrainNoise,
	createTerrainParams
} from './terrain';

export const PLANET_VISUAL_RADIUS =
	planetConfig.atmosphere.minRadiusFactor + planetConfig.atmosphere.thickness;
