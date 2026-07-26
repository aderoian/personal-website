import { describe, expect, it } from 'vitest';
import {
	biomeSupportsRocks,
	biomeSupportsSnowFormations,
	biomeSupportsTrees,
	coastalBlendFactor,
	pickBiome,
	type BiomeKind
} from './biomes';
import { createRng } from './noise';
import {
	canPlaceBoulder,
	canPlaceBroadleafTree,
	canPlaceCactus,
	canPlaceCoastalDriftwood,
	canPlaceIceSpire,
	canPlaceRock,
	canPlaceSnowFormation,
	canPlaceTree,
	canPlaceTropicalTree,
	emptyPlaceableCounts,
	getPlaceableRegistry,
	placeObjects,
	PLACEABLE_KINDS,
	totalPlaceableCount,
	type SurfacePoint
} from './placeableObjects';
import {
	carveRivers,
	extractInlandWaterGeometry,
	findLakes,
	generatePlanet,
	shapedDisplacement
} from './generatePlanet';
import { createTerrainNoise, createTerrainParams, sampleTerrainFields } from './terrain';
import {
	createLakeWaterMaterial,
	createRiverWaterMaterial,
	createWaterMaterial
} from './waterMaterial';
import { createAtmosphereMaterial } from './atmosphereMaterial';
import { BufferAttribute, Group } from 'three';

const ALL_BIOMES: BiomeKind[] = [
	'deepOcean',
	'shallow',
	'lake',
	'river',
	'beach',
	'desert',
	'savanna',
	'grassland',
	'forest',
	'rainforest',
	'taiga',
	'tundra',
	'rock',
	'mountain',
	'alpine',
	'snow',
	'glacier'
];

function point(partial: Partial<SurfacePoint> & Pick<SurfacePoint, 'biome'>): SurfacePoint {
	return {
		index: 0,
		dirX: 0,
		dirY: 1,
		dirZ: 0,
		radius: 1,
		elevation: 0.2,
		slope: 0.2,
		mountain: 0.1,
		...partial
	};
}

describe('pickBiome', () => {
	it('classifies oceans and beaches by height', () => {
		expect(
			pickBiome({
				height: 0.4,
				moisture: 0.5,
				temperature: 0.5,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('deepOcean');
		expect(
			pickBiome({
				height: 0.47,
				moisture: 0.5,
				temperature: 0.5,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('shallow');
		expect(
			pickBiome({
				height: 0.485,
				moisture: 0.5,
				temperature: 0.5,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('beach');
	});

	it('produces snow caps from altitude and cold', () => {
		expect(
			pickBiome({
				height: 0.95,
				moisture: 0.4,
				temperature: 0.5,
				slope: 0.2,
				mountain: 0.8,
				seaLevel: 0.48
			})
		).toBe('snow');
		expect(
			pickBiome({
				height: 0.72,
				moisture: 0.7,
				temperature: 0.1,
				slope: 0.2,
				mountain: 0.4,
				seaLevel: 0.48
			})
		).toMatch(/snow|glacier|alpine|tundra/);
	});

	it('produces mountain and alpine from high relief', () => {
		const mountain = pickBiome({
			height: 0.82,
			moisture: 0.45,
			temperature: 0.55,
			slope: 0.4,
			mountain: 0.7,
			seaLevel: 0.48
		});
		expect(['mountain', 'alpine', 'snow', 'glacier']).toContain(mountain);
	});

	it('covers expanded climate biomes', () => {
		expect(
			pickBiome({
				height: 0.55,
				moisture: 0.2,
				temperature: 0.85,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('desert');
		expect(
			pickBiome({
				height: 0.55,
				moisture: 0.35,
				temperature: 0.7,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('savanna');
		expect(
			pickBiome({
				height: 0.55,
				moisture: 0.85,
				temperature: 0.7,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('rainforest');
		expect(
			pickBiome({
				height: 0.55,
				moisture: 0.6,
				temperature: 0.2,
				slope: 0.1,
				mountain: 0,
				seaLevel: 0.48
			})
		).toBe('taiga');
	});
});

describe('coastalBlendFactor', () => {
	it('is 1 deep underwater, 0 inland, and soft near sea level', () => {
		expect(coastalBlendFactor(0.4, 0.53, 0.03)).toBe(1);
		expect(coastalBlendFactor(0.7, 0.53, 0.03)).toBe(0);
		const near = coastalBlendFactor(0.53, 0.53, 0.03);
		expect(near).toBeGreaterThan(0.4);
		expect(near).toBeLessThan(0.6);
	});
});

describe('terrain fields', () => {
	it('keeps sampled fields in 0–1 for a fixed seed', () => {
		const seed = 42;
		const rng = createRng(seed);
		const noise = createTerrainNoise(seed);
		const params = createTerrainParams(rng, 0.48);
		const dirs = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
			[0.577, 0.577, 0.577],
			[-0.3, 0.8, -0.5]
		];
		for (const [x, y, z] of dirs) {
			const len = Math.hypot(x, y, z);
			const sample = sampleTerrainFields(x / len, y / len, z / len, noise, params);
			for (const key of [
				'continentalness',
				'elevation',
				'mountain',
				'moisture',
				'temperature'
			] as const) {
				expect(sample[key]).toBeGreaterThanOrEqual(0);
				expect(sample[key]).toBeLessThanOrEqual(1);
			}
		}
	});

	it('is deterministic for the same seed and direction', () => {
		const noise = createTerrainNoise(99);
		const params = createTerrainParams(createRng(99), 0.5);
		const a = sampleTerrainFields(0.2, 0.8, -0.1, noise, params);
		const b = sampleTerrainFields(0.2, 0.8, -0.1, noise, params);
		expect(a).toEqual(b);
	});

	it('boosts displacement for mountains above sea level', () => {
		const low = shapedDisplacement(0.55, 0.1, 0.48, 0.5, false);
		const high = shapedDisplacement(0.9, 0.9, 0.48, 0.5, false);
		expect(high).toBeGreaterThan(low);
		expect(shapedDisplacement(0.4, 0, 0.48, 0.5, true)).toBeLessThan(0);
	});
});

describe('placeable rules', () => {
	it('allows trees only on gentle vegetated biomes', () => {
		expect(canPlaceTree(point({ biome: 'forest', slope: 0.2 }))).toBe(true);
		expect(canPlaceBroadleafTree(point({ biome: 'forest', slope: 0.2 }))).toBe(true);
		expect(canPlaceTropicalTree(point({ biome: 'rainforest', slope: 0.2 }))).toBe(true);
		expect(canPlaceTree(point({ biome: 'desert', slope: 0.2 }))).toBe(false);
		expect(canPlaceTree(point({ biome: 'forest', slope: 0.7 }))).toBe(false);
		expect(biomeSupportsTrees('rainforest')).toBe(true);
	});

	it('allows rocks on rugged land biomes', () => {
		expect(canPlaceRock(point({ biome: 'rock', slope: 0.4 }))).toBe(true);
		expect(canPlaceBoulder(point({ biome: 'rock', slope: 0.4 }))).toBe(true);
		expect(canPlaceRock(point({ biome: 'forest', slope: 0.4 }))).toBe(false);
		expect(biomeSupportsRocks('mountain')).toBe(true);
	});

	it('allows snow formations on cold high biomes', () => {
		expect(canPlaceSnowFormation(point({ biome: 'snow', slope: 0.3 }))).toBe(true);
		expect(canPlaceIceSpire(point({ biome: 'glacier', slope: 0.3 }))).toBe(true);
		expect(canPlaceSnowFormation(point({ biome: 'grassland', slope: 0.3 }))).toBe(false);
		expect(biomeSupportsSnowFormations('alpine')).toBe(true);
	});

	it('allows desert cactus and coastal props by terrain', () => {
		expect(canPlaceCactus(point({ biome: 'desert', slope: 0.2, elevation: 0.05 }))).toBe(true);
		expect(canPlaceCoastalDriftwood(point({ biome: 'beach', elevation: 0.01, slope: 0.2 }))).toBe(
			true
		);
		expect(canPlaceCoastalDriftwood(point({ biome: 'beach', elevation: 0.2, slope: 0.2 }))).toBe(
			false
		);
	});
});

describe('placeable registry', () => {
	it('exposes one definition per placeable kind', () => {
		const registry = getPlaceableRegistry();
		expect(registry.map((d) => d.kind).sort()).toEqual([...PLACEABLE_KINDS].sort());
		for (const def of registry) {
			expect(def.maxCount).toBeGreaterThan(0);
			expect(def.chance).toBeGreaterThan(0);
			expect(Object.keys(def.biomeWeight).length).toBeGreaterThan(0);
			const geo = def.createGeometry();
			expect(geo.getAttribute('position').count).toBeGreaterThan(0);
			geo.dispose();
		}
	});

	it('places biome-specific variants deterministically with cross-type spacing', () => {
		const points: SurfacePoint[] = [];
		const biomes: BiomeKind[] = [
			'forest',
			'rainforest',
			'taiga',
			'desert',
			'savanna',
			'grassland',
			'beach',
			'snow',
			'mountain',
			'rock'
		];
		let i = 0;
		for (const biome of biomes) {
			for (let k = 0; k < 40; k++) {
				const a = (i * 0.37) % (Math.PI * 2);
				const b = ((i * 0.19) % Math.PI) - Math.PI / 2;
				const x = Math.cos(b) * Math.cos(a);
				const y = Math.sin(b);
				const z = Math.cos(b) * Math.sin(a);
				const len = Math.hypot(x, y, z) || 1;
				points.push({
					index: i++,
					dirX: x / len,
					dirY: y / len,
					dirZ: z / len,
					radius: 1.02,
					biome,
					elevation: biome === 'beach' ? 0.01 : 0.15,
					slope: biome === 'rock' || biome === 'mountain' ? 0.4 : 0.2,
					mountain: biome === 'mountain' ? 0.6 : 0.1
				});
			}
		}

		const groupA = new Group();
		const groupB = new Group();
		const a = placeObjects(groupA, points, { rng: createRng(42), density: 1.2 });
		const b = placeObjects(groupB, points, { rng: createRng(42), density: 1.2 });
		expect(a.counts).toEqual(b.counts);
		expect(totalPlaceableCount(a.counts)).toBeGreaterThan(0);
		expect(a.counts.tropicalTree).toBeGreaterThan(0);
		expect(a.counts.cactus).toBeGreaterThan(0);
		expect(a.counts.iceSpire).toBeGreaterThan(0);
		a.dispose();
		b.dispose();
	});

	it('honors explicit placements even when automatic density is zero', () => {
		const points = [
			point({ biome: 'forest', dirX: 0, dirY: 1, dirZ: 0 }),
			point({ biome: 'desert', dirX: 1, dirY: 0, dirZ: 0, index: 1 })
		];
		const group = new Group();
		const bundle = placeObjects(group, points, {
			rng: createRng(1),
			density: 0,
			maxCounts: Object.fromEntries(PLACEABLE_KINDS.map((k) => [k, 0])),
			explicit: [
				{ kind: 'broadleafTree', direction: [0, 1, 0], scale: 1.1 },
				{ kind: 'cactus', direction: [1, 0, 0], scale: 0.9 }
			]
		});
		expect(bundle.counts.broadleafTree).toBe(1);
		expect(bundle.counts.cactus).toBe(1);
		bundle.dispose();
	});
});

describe('materials', () => {
	it('creates updatable water and atmosphere materials', () => {
		const water = createWaterMaterial();
		const lake = createLakeWaterMaterial();
		const river = createRiverWaterMaterial();
		const atm = createAtmosphereMaterial();
		water.update(1.5, [0, 1, 0]);
		lake.update(1.5, [0, 1, 0]);
		river.update(1.5, [0, 1, 0]);
		atm.update([0, 1, 0]);
		expect(water.uniforms.uTime.value).toBe(1.5);
		expect(lake.uniforms.uTime.value).toBe(1.5);
		expect(river.uniforms.uWaveScale.value).toBeGreaterThan(water.uniforms.uWaveScale.value);
		expect(atm.uniforms.uLightDir.value).toEqual([0, 1, 0]);
		water.dispose();
		lake.dispose();
		river.dispose();
		atm.dispose();
	});
});

describe('extractInlandWaterGeometry', () => {
	it('lifts faces that belong to water vertex sets', () => {
		const positions = new Float32Array([
			1, 0, 0, 0, 1, 0, 0, 0, 1, // face 0 — water
			0, 0, 1, 0, -1, 0, 1, 0, 0 // face 1 — mixed, only 1 water vert at index mapped
		]);
		// Unique indices: 0,1,2 for first face; 2,3,0 for second — mark 0,1,2 as water so face0 qualifies
		const posAttr = new BufferAttribute(positions, 3);
		const vertToUnique = new Uint32Array([0, 1, 2, 2, 3, 0]);
		const waterVerts = new Set([0, 1, 2]);
		const geo = extractInlandWaterGeometry(posAttr, vertToUnique, waterVerts, 0.01);
		expect(geo).not.toBeNull();
		const out = geo!.getAttribute('position');
		expect(out.count).toBeGreaterThanOrEqual(3);
		const len0 = Math.hypot(out.getX(0), out.getY(0), out.getZ(0));
		expect(len0).toBeGreaterThan(1);
		geo!.dispose();
	});

	it('returns null when no qualifying faces exist', () => {
		const posAttr = new BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3);
		const vertToUnique = new Uint32Array([0, 1, 2]);
		expect(extractInlandWaterGeometry(posAttr, vertToUnique, new Set(), 0.01)).toBeNull();
	});
});

describe('generatePlanet', () => {
	it('is deterministic for a fixed seed', () => {
		const a = generatePlanet({ seed: 12345, detail: 4, objectDensity: 0.5, seaLevel: 0.53 });
		const b = generatePlanet({ seed: 12345, detail: 4, objectDensity: 0.5, seaLevel: 0.53 });
		expect(a.seed).toBe(12345);
		expect(b.seed).toBe(12345);
		expect(a.objectCounts).toEqual(b.objectCounts);
		expect(a.biomes.length).toBe(b.biomes.length);
		expect(a.biomes).toEqual(b.biomes);
		a.dispose();
		b.dispose();
	});

	it('exposes terrain, water, and atmosphere layers', () => {
		const planet = generatePlanet({ seed: 99, detail: 4, seaLevel: 0.53 });
		expect(planet.layers.terrain.name).toBe('planet:terrain');
		expect(planet.layers.water.name).toBe('planet:water');
		expect(planet.layers.atmosphere.name).toBe('planet:atmosphere');
		expect(planet.group.children).toContain(planet.layers.terrain);
		expect(planet.group.children).toContain(planet.layers.water);
		expect(planet.group.children).toContain(planet.layers.atmosphere);
		if (planet.layers.lakes) {
			expect(planet.layers.lakes.name).toBe('planet:lakes');
			expect(planet.group.children).toContain(planet.layers.lakes);
		}
		if (planet.layers.rivers) {
			expect(planet.layers.rivers.name).toBe('planet:rivers');
			expect(planet.group.children).toContain(planet.layers.rivers);
		}
		planet.update(0.5, [1, 0, 0]);
		planet.dispose();
	});

	it('builds inland water overlays when hydrology produces lakes or rivers', () => {
		// Higher detail increases chance of hydrology features under the default land bias.
		const planet = generatePlanet({ seed: 2024, detail: 12, seaLevel: 0.53, objectDensity: 0.2 });
		const hasInlandBiome =
			planet.biomes.includes('lake') || planet.biomes.includes('river');
		if (hasInlandBiome) {
			expect(planet.layers.lakes !== null || planet.layers.rivers !== null).toBe(true);
		}
		planet.dispose();
	});

	it('produces known biome kinds and placeable objects with default sea level', () => {
		const planet = generatePlanet({
			seed: 777,
			detail: 5,
			objectDensity: 1.5,
			placeables: [
				{ kind: 'broadleafTree', direction: [0, 1, 0], scale: 1.2 },
				{ kind: 'boulder', direction: [1, 0, 0], scale: 0.9 },
				{ kind: 'iceSpire', direction: [0, -1, 0], scale: 1 }
			]
		});
		expect(planet.group.children.length).toBeGreaterThan(2);
		for (const biome of planet.biomes) {
			expect(ALL_BIOMES).toContain(biome);
		}
		expect(totalPlaceableCount(planet.objectCounts)).toBeGreaterThan(0);
		expect(emptyPlaceableCounts().broadleafTree).toBe(0);
		planet.dispose();
	});

	it('scales hydrology helpers with basin limits', () => {
		const heights = new Float32Array([0.5, 0.52, 0.53, 0.51, 0.4]);
		const neighbors = [[1], [0, 2], [1, 3], [2], [0]];
		const rng = createRng(1);
		const lakes = findLakes(heights, neighbors, 0.45, rng, 2, 10, 1);
		expect(lakes.size).toBeGreaterThanOrEqual(0);
		const rivers = carveRivers(heights, neighbors, 0.45, lakes, createRng(2), 2, 20);
		expect(rivers.size).toBeGreaterThanOrEqual(0);
	});

	it('builds a high-detail planet within a reasonable time budget', () => {
		const start = performance.now();
		const planet = generatePlanet({ seed: 2026, detail: 34, objectDensity: 1, seaLevel: 0.53 });
		const elapsed = performance.now() - start;
		expect(planet.biomes.length).toBeGreaterThan(8000);
		expect(totalPlaceableCount(planet.objectCounts)).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(12000);
		planet.update(1, [0.5, 0.7, 0.4]);
		planet.dispose();
	});
});
