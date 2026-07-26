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
	canPlaceCommsTower,
	canPlaceIceSpire,
	canPlaceLighthouse,
	canPlaceOffshorePlatform,
	canPlaceRock,
	canPlaceSettlement,
	canPlaceShip,
	canPlaceSnowFormation,
	canPlaceTree,
	canPlaceTropicalTree,
	emptyPlaceableCounts,
	getPlaceableDomain,
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
	inlandWaterEdgeFactor,
	oceanShoreFactor,
	paintOceanCoastAttribute,
	sampleOceanCoastAtDir,
	shapedDisplacement,
	terrainOceanCoastFactor
} from './generatePlanet';
import { createTerrainNoise, createTerrainParams, sampleTerrainFields } from './terrain';
import {
	createLakeWaterMaterial,
	createRiverWaterMaterial,
	createWaterMaterial
} from './waterMaterial';
import { createAtmosphereMaterial, createInnerAtmosphereMaterial } from './atmosphereMaterial';
import { createCloudMaterial } from './cloudMaterial';
import { createAircraft, createPlaneGeometry } from './aerialFeatures';
import { planetConfig } from './planetConfig';
import { BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4 } from 'three';

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
	const biome = partial.biome;
	const domain =
		partial.domain ??
		(biome === 'deepOcean' || biome === 'shallow' ? 'ocean' : biome === 'beach' ? 'coast' : 'land');
	return {
		index: 0,
		dirX: 0,
		dirY: 1,
		dirZ: 0,
		radius: 1,
		elevation: 0.2,
		slope: 0.2,
		mountain: 0.1,
		domain,
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

	it('allows man-made land and sea structures by domain terrain', () => {
		expect(canPlaceSettlement(point({ biome: 'grassland', slope: 0.2, elevation: 0.05 }))).toBe(
			true
		);
		expect(canPlaceSettlement(point({ biome: 'grassland', slope: 0.6, elevation: 0.05 }))).toBe(
			false
		);
		expect(canPlaceCommsTower(point({ biome: 'rock', slope: 0.15, elevation: 0.08 }))).toBe(true);
		expect(canPlaceLighthouse(point({ biome: 'beach', elevation: 0.02, slope: 0.2 }))).toBe(true);
		expect(
			canPlaceOffshorePlatform(point({ biome: 'shallow', domain: 'ocean', elevation: 0.04 }))
		).toBe(true);
		expect(canPlaceShip(point({ biome: 'shallow', domain: 'ocean', elevation: 0.03 }))).toBe(true);
		expect(canPlaceShip(point({ biome: 'shallow', domain: 'ocean', elevation: 0.5 }))).toBe(false);
	});
});

describe('placeable registry', () => {
	it('exposes one definition per placeable kind with a domain', () => {
		const registry = getPlaceableRegistry();
		expect(registry.map((d) => d.kind).sort()).toEqual([...PLACEABLE_KINDS].sort());
		for (const def of registry) {
			expect(def.maxCount).toBeGreaterThan(0);
			expect(def.chance).toBeGreaterThan(0);
			expect(['land', 'coast', 'ocean']).toContain(def.domain);
			expect(Object.keys(def.biomeWeight).length).toBeGreaterThan(0);
			const geo = def.createGeometry();
			expect(geo.getAttribute('position').count).toBeGreaterThan(0);
			geo.dispose();
		}
		expect(getPlaceableDomain('settlement')).toBe('land');
		expect(getPlaceableDomain('lighthouse')).toBe('coast');
		expect(getPlaceableDomain('ship')).toBe('ocean');
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
			'rock',
			'shallow',
			'deepOcean'
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
				const domain =
					biome === 'shallow' || biome === 'deepOcean'
						? 'ocean'
						: biome === 'beach'
							? 'coast'
							: 'land';
				points.push({
					index: i++,
					dirX: x / len,
					dirY: y / len,
					dirZ: z / len,
					radius: domain === 'ocean' ? 1 : 1.02,
					biome,
					elevation: domain === 'ocean' ? 0.03 : biome === 'beach' ? 0.01 : 0.15,
					slope: biome === 'rock' || biome === 'mountain' ? 0.4 : 0.2,
					mountain: biome === 'mountain' ? 0.6 : 0.1,
					domain
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

	it('honors explicit land and sea placements even when automatic density is zero', () => {
		const points = [
			point({ biome: 'forest', dirX: 0, dirY: 1, dirZ: 0 }),
			point({ biome: 'desert', dirX: 1, dirY: 0, dirZ: 0, index: 1 }),
			point({
				biome: 'shallow',
				domain: 'ocean',
				dirX: 0,
				dirY: 0,
				dirZ: 1,
				index: 2,
				elevation: 0.02
			}),
			point({
				biome: 'beach',
				domain: 'coast',
				dirX: -1,
				dirY: 0,
				dirZ: 0,
				index: 3,
				elevation: 0.01
			})
		];
		const group = new Group();
		const bundle = placeObjects(group, points, {
			rng: createRng(1),
			density: 0,
			maxCounts: Object.fromEntries(PLACEABLE_KINDS.map((k) => [k, 0])),
			explicit: [
				{ kind: 'broadleafTree', direction: [0, 1, 0], scale: 1.1 },
				{ kind: 'cactus', direction: [1, 0, 0], scale: 0.9 },
				{ kind: 'ship', direction: [0, 0, 1], scale: 1 },
				{ kind: 'lighthouse', direction: [-1, 0, 0], scale: 1.05 },
				{ kind: 'settlement', direction: [0, 1, 0], scale: 1.2 }
			]
		});
		expect(bundle.counts.broadleafTree).toBe(1);
		expect(bundle.counts.cactus).toBe(1);
		expect(bundle.counts.ship).toBe(1);
		expect(bundle.counts.lighthouse).toBe(1);
		expect(bundle.counts.settlement).toBe(1);
		bundle.dispose();
	});
});

describe('materials', () => {
	it('creates updatable water and atmosphere materials', () => {
		const water = createWaterMaterial();
		const lake = createLakeWaterMaterial();
		const river = createRiverWaterMaterial();
		const atm = createAtmosphereMaterial();
		const atmInner = createInnerAtmosphereMaterial();
		water.update(1.5, [0, 1, 0]);
		lake.update(1.5, [0, 1, 0]);
		river.update(1.5, [0, 1, 0]);
		atm.update([0, 1, 0]);
		atmInner.update([0, 1, 0]);
		expect(water.uniforms.uTime.value).toBe(1.5);
		expect(lake.uniforms.uTime.value).toBe(1.5);
		expect(river.uniforms.uWaveScale.value).toBeGreaterThan(water.uniforms.uWaveScale.value);
		expect(water.uniforms.uFoamStrength.value).toBeGreaterThan(0);
		expect(lake.uniforms.uOceanFoam.value).toBe(0);
		expect(river.uniforms.uOceanFoam.value).toBe(0);
		expect(water.uniforms.uOceanFoam.value).toBeGreaterThan(0);
		// Inland water is matte / low-glare relative to ocean.
		expect(lake.uniforms.uSpecularStrength.value).toBeLessThan(
			water.uniforms.uSpecularStrength.value
		);
		expect(river.uniforms.uSpecularStrength.value).toBeLessThan(
			water.uniforms.uSpecularStrength.value
		);
		expect(lake.uniforms.uSpecularStrength.value).toBeLessThan(0.15);
		expect(river.uniforms.uSpecularStrength.value).toBeLessThan(0.2);
		expect(lake.uniforms.uFresnelBias.value).toBeLessThan(water.uniforms.uFresnelBias.value);
		expect(river.uniforms.uWaveStrength.value).toBeGreaterThan(lake.uniforms.uWaveStrength.value);
		expect(atm.uniforms.uLightDir.value).toEqual([0, 1, 0]);
		expect(atm.uniforms.uHazeStrength.value).toBeGreaterThan(0);
		expect(atm.uniforms.uBlendEnd.value).toBeGreaterThan(atm.uniforms.uBlendStart.value);
		expect(atmInner.uniforms.uHazeStrength.value).toBeGreaterThan(0);
		expect(atmInner.uniforms.uBlendStart.value).toBe(atm.uniforms.uBlendStart.value);
		water.dispose();
		lake.dispose();
		river.dispose();
		atm.dispose();
		atmInner.dispose();
	});

	it('matches lake/river specular presets from planetConfig', () => {
		const lake = createLakeWaterMaterial();
		const river = createRiverWaterMaterial();
		const ocean = createWaterMaterial();
		expect(lake.uniforms.uSpecularStrength.value).toBe(planetConfig.water.lake.specularStrength);
		expect(lake.uniforms.uSpecularPower.value).toBe(planetConfig.water.lake.specularPower);
		expect(river.uniforms.uSpecularStrength.value).toBe(planetConfig.water.river.specularStrength);
		expect(ocean.uniforms.uOceanFoam.value).toBe(planetConfig.water.foam.oceanCoast);
		lake.dispose();
		river.dispose();
		ocean.dispose();
	});

	it('creates sparse fluffy cloud material with patch thresholds', () => {
		const clouds = createCloudMaterial(99);
		clouds.update(2.5, [0.2, 0.8, 0.1]);
		expect(clouds.uniforms.uTime.value).toBe(2.5);
		expect(clouds.uniforms.uRotation.value).toBe(2.5 * planetConfig.clouds.rotationSpeed);
		expect(clouds.uniforms.uLightDir.value).toEqual([0.2, 0.8, 0.1]);
		expect(clouds.uniforms.uOpacity.value).toBe(planetConfig.clouds.opacity);
		// Localized patches can be denser; veil-like low opacity is no longer the goal.
		expect(clouds.uniforms.uCoverage.value).toBeGreaterThan(0.5);
		expect(clouds.uniforms.uFluffiness.value).toBeGreaterThan(0);
		expect(clouds.uniforms.uPatchScale.value).toBeGreaterThan(0);
		expect(clouds.uniforms.uFaceDensity.value).toBeLessThanOrEqual(1);
		expect(clouds.material.depthWrite).toBe(false);
		expect(clouds.material.transparent).toBe(true);
		clouds.dispose();
	});
});

describe('aircraft', () => {
	it('builds deterministic seeded planes on great-circle routes', () => {
		const geo = createPlaneGeometry();
		expect(geo.getAttribute('position').count).toBeGreaterThan(0);
		geo.dispose();

		const a = createAircraft(1, 4242, 4);
		const b = createAircraft(1, 4242, 4);
		expect(a.count).toBe(4);
		expect(b.count).toBe(4);
		a.update(1.25);
		b.update(1.25);
		const meshA = a.group.children[0] as InstancedMesh;
		const meshB = b.group.children[0] as InstancedMesh;
		const ma = new Matrix4();
		const mb = new Matrix4();
		meshA.getMatrixAt(0, ma);
		meshB.getMatrixAt(0, mb);
		expect([...ma.elements]).toEqual([...mb.elements]);
		a.update(0);
		b.dispose();
		a.dispose();
	});

	it('returns an empty fleet when count is zero', () => {
		const fleet = createAircraft(1, 1, 0);
		expect(fleet.count).toBe(0);
		fleet.update(10);
		fleet.dispose();
	});
});

describe('extractInlandWaterGeometry', () => {
	it('lifts faces that belong to water vertex sets', () => {
		const positions = new Float32Array([
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1, // face 0 — water
			0,
			0,
			1,
			0,
			-1,
			0,
			1,
			0,
			0 // face 1 — mixed, only 1 water vert at index mapped
		]);
		// Unique indices: 0,1,2 for first face; 2,3,0 for second — mark 0,1,2 as water so face0 qualifies
		const posAttr = new BufferAttribute(positions, 3);
		const vertToUnique = new Uint32Array([0, 1, 2, 2, 3, 0]);
		const waterVerts = new Set([0, 1, 2]);
		const neighbors = [[1, 2], [0, 2], [0, 1, 3], [2]];
		const geo = extractInlandWaterGeometry(posAttr, vertToUnique, waterVerts, 0.01, neighbors);
		expect(geo).not.toBeNull();
		const out = geo!.getAttribute('position');
		expect(out.count).toBeGreaterThanOrEqual(3);
		const len0 = Math.hypot(out.getX(0), out.getY(0), out.getZ(0));
		expect(len0).toBeGreaterThan(1);
		const edge = geo!.getAttribute('aEdge');
		expect(edge).toBeTruthy();
		expect(edge.count).toBe(out.count);
		// Vert 2 borders land (3) so its edge factor should be elevated.
		let maxEdge = 0;
		for (let i = 0; i < edge.count; i++) maxEdge = Math.max(maxEdge, edge.getX(i));
		expect(maxEdge).toBeGreaterThan(0.4);
		geo!.dispose();
	});

	it('returns null when no qualifying faces exist', () => {
		const posAttr = new BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3);
		const vertToUnique = new Uint32Array([0, 1, 2]);
		expect(extractInlandWaterGeometry(posAttr, vertToUnique, new Set(), 0.01)).toBeNull();
	});
});

describe('inlandWaterEdgeFactor', () => {
	it('is 1 on land, 0 deep interior, and elevated on shore verts', () => {
		const water = new Set([0, 1]);
		const neighbors = [
			[1, 2], // shore — neighbor 2 is land
			[0], // interior relative to water set
			[0]
		];
		expect(inlandWaterEdgeFactor(2, water, neighbors)).toBe(1);
		expect(inlandWaterEdgeFactor(1, water, neighbors)).toBe(0);
		expect(inlandWaterEdgeFactor(0, water, neighbors)).toBeGreaterThan(0.5);
	});
});

describe('oceanShoreFactor', () => {
	it('peaks at the shoreline and is zero on land or deep ocean', () => {
		const sea = 0.53;
		const width = 0.06;
		expect(oceanShoreFactor(sea, sea, width)).toBe(1);
		expect(oceanShoreFactor(sea + 0.01, sea, width)).toBe(0);
		expect(oceanShoreFactor(sea - width, sea, width)).toBe(0);
		expect(oceanShoreFactor(sea - width * 0.5, sea, width)).toBeGreaterThan(0.4);
		expect(oceanShoreFactor(sea - width * 0.5, sea, width)).toBeLessThan(1);
	});
});

describe('terrainOceanCoastFactor', () => {
	it('elevates foam on ocean verts that touch land', () => {
		const sea = 0.5;
		const elevations = new Float32Array([0.48, 0.4, 0.6]);
		const neighbors = [
			[1, 2], // shallow ocean next to land
			[0], // deep-ish, only ocean neighbor
			[0]
		];
		expect(terrainOceanCoastFactor(2, elevations, sea, neighbors, 0.08)).toBe(0);
		expect(terrainOceanCoastFactor(0, elevations, sea, neighbors, 0.08)).toBeGreaterThan(0.5);
		expect(terrainOceanCoastFactor(1, elevations, sea, neighbors, 0.08)).toBe(
			oceanShoreFactor(0.4, sea, 0.08)
		);
	});
});

describe('paintOceanCoastAttribute', () => {
	it('writes aCoast with shoreline values from elevation samples', () => {
		const geo = new IcosahedronGeometry(1, 2);
		const sea = 0.5;
		paintOceanCoastAttribute(
			geo,
			(nx) => (nx > 0.2 ? 0.7 : nx < -0.2 ? 0.2 : 0.48),
			sea,
			0.08,
			0.05
		);
		const coast = geo.getAttribute('aCoast');
		expect(coast).toBeTruthy();
		expect(coast.count).toBe(geo.getAttribute('position').count);
		let maxCoast = 0;
		let zeroCount = 0;
		for (let i = 0; i < coast.count; i++) {
			const v = coast.getX(i);
			maxCoast = Math.max(maxCoast, v);
			if (v === 0) zeroCount++;
		}
		expect(maxCoast).toBeGreaterThan(0.35);
		expect(zeroCount).toBeGreaterThan(0);
		geo.dispose();
	});

	it('sampleOceanCoastAtDir is zero on land and positive near shore', () => {
		const elev = (x: number) => (x > 0 ? 0.7 : 0.47);
		expect(sampleOceanCoastAtDir(1, 0, 0, elev, 0.5, 0.08, 0.04)).toBe(0);
		expect(sampleOceanCoastAtDir(-1, 0, 0, elev, 0.5, 0.08, 0.04)).toBeGreaterThan(0.3);
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

	it('exposes terrain, water, atmosphere, cloud, and aircraft layers', () => {
		const planet = generatePlanet({ seed: 99, detail: 4, seaLevel: 0.53, aircraftCount: 3 });
		expect(planet.layers.terrain.name).toBe('planet:terrain');
		expect(planet.layers.water.name).toBe('planet:water');
		expect(planet.layers.atmosphere.name).toBe('planet:atmosphere');
		expect(planet.layers.atmosphereInner.name).toBe('planet:atmosphereInner');
		expect(planet.layers.clouds?.name).toBe('planet:clouds');
		expect(planet.layers.aircraft?.name).toBe('planet:aircraft');
		expect(planet.aircraftCount).toBe(3);
		expect(planet.group.children).toContain(planet.layers.terrain);
		expect(planet.group.children).toContain(planet.layers.water);
		expect(planet.group.children).toContain(planet.layers.atmosphere);
		expect(planet.group.children).toContain(planet.layers.atmosphereInner);
		expect(planet.group.children).toContain(planet.layers.clouds);
		expect(planet.group.children).toContain(planet.layers.aircraft);
		const coast = planet.layers.water.geometry.getAttribute('aCoast');
		expect(coast).toBeTruthy();
		expect(coast.count).toBe(planet.layers.water.geometry.getAttribute('position').count);
		let maxCoast = 0;
		for (let i = 0; i < coast.count; i++) maxCoast = Math.max(maxCoast, coast.getX(i));
		expect(maxCoast).toBeGreaterThan(0.2);
		if (planet.layers.lakes) {
			expect(planet.layers.lakes.name).toBe('planet:lakes');
			expect(planet.group.children).toContain(planet.layers.lakes);
			expect(planet.layers.lakes.geometry.getAttribute('aEdge')).toBeTruthy();
		}
		if (planet.layers.rivers) {
			expect(planet.layers.rivers.name).toBe('planet:rivers');
			expect(planet.group.children).toContain(planet.layers.rivers);
			expect(planet.layers.rivers.geometry.getAttribute('aEdge')).toBeTruthy();
		}
		planet.update(0.5, [1, 0, 0]);
		planet.dispose();
	});

	it('can disable clouds and aircraft', () => {
		const planet = generatePlanet({
			seed: 55,
			detail: 3,
			seaLevel: 0.53,
			clouds: false,
			aircraftCount: 0
		});
		expect(planet.layers.clouds).toBeNull();
		expect(planet.layers.aircraft).toBeNull();
		expect(planet.aircraftCount).toBe(0);
		planet.dispose();
	});

	it('places man-made land and sea structures from explicit descriptors', () => {
		const planet = generatePlanet({
			seed: 314,
			detail: 5,
			objectDensity: 0,
			seaLevel: 0.53,
			aircraftCount: 0,
			placeables: [
				{ kind: 'settlement', direction: [0, 1, 0], scale: 1.1 },
				{ kind: 'commsTower', direction: [1, 0, 0], scale: 1 },
				{ kind: 'lighthouse', direction: [0, 0, 1], scale: 1 },
				{ kind: 'offshorePlatform', direction: [0, -1, 0], scale: 1 },
				{ kind: 'ship', direction: [-1, 0, 0], scale: 0.9 }
			]
		});
		expect(planet.objectCounts.settlement).toBe(1);
		expect(planet.objectCounts.commsTower).toBe(1);
		expect(planet.objectCounts.lighthouse).toBe(1);
		expect(planet.objectCounts.offshorePlatform).toBe(1);
		expect(planet.objectCounts.ship).toBe(1);
		planet.dispose();
	});

	it('builds inland water overlays when hydrology produces lakes or rivers', () => {
		// Higher detail increases chance of hydrology features under the default land bias.
		const planet = generatePlanet({ seed: 2024, detail: 12, seaLevel: 0.53, objectDensity: 0.2 });
		const hasInlandBiome = planet.biomes.includes('lake') || planet.biomes.includes('river');
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
