import {
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	InstancedMesh,
	Matrix4,
	MeshLambertMaterial,
	Quaternion,
	SphereGeometry,
	Vector3,
	type Group
} from 'three';
import { type BiomeKind } from './biomes';
import { planetConfig } from './planetConfig';

export type PlaceableDomain = 'land' | 'coast' | 'ocean';

export type PlaceableKind =
	| 'broadleafTree'
	| 'coniferTree'
	| 'tropicalTree'
	| 'cactus'
	| 'savannaShrub'
	| 'grassShrub'
	| 'boulder'
	| 'mountainBoulder'
	| 'iceSpire'
	| 'coastalDriftwood'
	| 'coastalRock'
	| 'settlement'
	| 'commsTower'
	| 'lighthouse'
	| 'offshorePlatform'
	| 'ship';

/** Explicit placement relative to a unit-sphere surface direction. */
export type PlaceableDescriptor = {
	kind: PlaceableKind;
	/** Unit direction from planet center to surface. */
	direction: [number, number, number];
	scale?: number;
	/** Yaw around surface normal, radians. */
	rotation?: number;
};

export type SurfacePoint = {
	index: number;
	dirX: number;
	dirY: number;
	dirZ: number;
	radius: number;
	biome: BiomeKind;
	elevation: number;
	slope: number;
	mountain: number;
	/** Placement domain — land/coast use terrain radius; ocean uses sea radius. */
	domain: PlaceableDomain;
};

export type PlacementOptions = {
	rng: () => number;
	/** Automatic density multiplier (1 = default). */
	density?: number;
	maxCounts?: Partial<Record<PlaceableKind, number>>;
	explicit?: PlaceableDescriptor[];
};

export type PlaceableCounts = Record<PlaceableKind, number>;

export type PlaceableBundle = {
	meshes: InstancedMesh[];
	dispose: () => void;
	counts: PlaceableCounts;
};

type PlaceableDef = {
	kind: PlaceableKind;
	/** Which surface domain this kind samples from. */
	domain: PlaceableDomain;
	createGeometry: () => BufferGeometry;
	/** Flat color when not using vertex colors. */
	color: number;
	vertexColors?: boolean;
	lift: number;
	scale: { min: number; range: number };
	chance: number;
	maxCount: number;
	/** Biome affinity weights (0 = excluded). */
	biomeWeight: Partial<Record<BiomeKind, number>>;
	canPlace: (point: SurfacePoint) => boolean;
};

const UP = new Vector3(0, 1, 0);
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const tmpQuat = new Quaternion();
const tmpMat = new Matrix4();
const tmpNormal = new Vector3();
const tmpAxis = new Vector3();

function orientToNormal(normal: Vector3, yaw: number): Quaternion {
	tmpQuat.setFromUnitVectors(UP, normal);
	if (yaw !== 0) {
		tmpAxis.copy(normal).normalize();
		const spin = new Quaternion().setFromAxisAngle(tmpAxis, yaw);
		tmpQuat.premultiply(spin);
	}
	return tmpQuat;
}

function setInstanceMatrix(
	mesh: InstancedMesh,
	index: number,
	position: Vector3,
	normal: Vector3,
	scale: number,
	yaw: number
): void {
	tmpMat.compose(position, orientToNormal(normal, yaw), tmpScale.set(scale, scale, scale));
	mesh.setMatrixAt(index, tmpMat);
}

function mergeGeometries(
	geos: BufferGeometry[],
	colorsPerGeo?: ReadonlyArray<readonly [number, number, number]>
): BufferGeometry {
	const positions: number[] = [];
	const normals: number[] = [];
	const colors: number[] = [];
	geos.forEach((g, gi) => {
		const nonIndexed = g.index ? g.toNonIndexed() : g;
		if (!nonIndexed.getAttribute('normal')) nonIndexed.computeVertexNormals();
		const pos = nonIndexed.getAttribute('position');
		const nor = nonIndexed.getAttribute('normal');
		const rgb = colorsPerGeo?.[gi] ?? [1, 1, 1];
		for (let i = 0; i < pos.count; i++) {
			positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
			normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
			if (colorsPerGeo) colors.push(rgb[0], rgb[1], rgb[2]);
		}
		if (nonIndexed !== g) nonIndexed.dispose();
		g.dispose();
	});
	const merged = new BufferGeometry();
	merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	merged.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
	if (colorsPerGeo) {
		merged.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
	}
	return merged;
}

function createLayeredTree(
	mesh: {
		trunkTop: number;
		trunkBottom: number;
		trunkHeight: number;
		trunkY: number;
		foliageRadius: number;
		foliageHeight: number;
		foliageY: number;
		crownRadius: number;
		crownHeight: number;
		crownY: number;
	},
	colors: {
		trunk: readonly [number, number, number];
		foliage: readonly [number, number, number];
		crown: readonly [number, number, number];
	}
): BufferGeometry {
	const trunk = new CylinderGeometry(mesh.trunkTop, mesh.trunkBottom, mesh.trunkHeight, 5);
	trunk.translate(0, mesh.trunkY, 0);
	const foliage = new ConeGeometry(mesh.foliageRadius, mesh.foliageHeight, 6);
	foliage.translate(0, mesh.foliageY, 0);
	const crown = new ConeGeometry(mesh.crownRadius, mesh.crownHeight, 6);
	crown.translate(0, mesh.crownY, 0);
	return mergeGeometries([trunk, foliage, crown], [colors.trunk, colors.foliage, colors.crown]);
}

export function createBroadleafTreeGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.broadleafTree;
	const c = planetConfig.objects.colors;
	return createLayeredTree(m, {
		trunk: c.broadleafTrunk,
		foliage: c.broadleafFoliage,
		crown: c.broadleafCrown
	});
}

export function createConiferTreeGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.coniferTree;
	const c = planetConfig.objects.colors;
	return createLayeredTree(m, {
		trunk: c.coniferTrunk,
		foliage: c.coniferFoliage,
		crown: c.coniferCrown
	});
}

export function createTropicalTreeGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.tropicalTree;
	const c = planetConfig.objects.colors;
	const trunk = new CylinderGeometry(m.trunkTop, m.trunkBottom, m.trunkHeight, 5);
	trunk.translate(0, m.trunkY, 0);
	const canopy = new SphereGeometry(m.foliageRadius, 6, 4);
	canopy.scale(1.15, 0.55, 1.15);
	canopy.translate(0, m.foliageY, 0);
	const crown = new SphereGeometry(m.crownRadius, 5, 3);
	crown.scale(1.1, 0.5, 1.1);
	crown.translate(0, m.crownY, 0);
	return mergeGeometries(
		[trunk, canopy, crown],
		[c.tropicalTrunk, c.tropicalFoliage, c.tropicalCrown]
	);
}

export function createCactusGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.cactus;
	const trunk = new CylinderGeometry(m.trunkRadius, m.trunkRadius * 1.1, m.trunkHeight, 6);
	trunk.translate(0, m.trunkY, 0);
	const arm = new CylinderGeometry(m.armRadius, m.armRadius, m.armHeight, 5);
	arm.translate(m.armOffset, m.armY, 0);
	const arm2 = new CylinderGeometry(m.armRadius * 0.9, m.armRadius * 0.9, m.armHeight * 0.8, 5);
	arm2.translate(-m.armOffset * 0.85, m.armY * 0.9, 0);
	return mergeGeometries([trunk, arm, arm2]);
}

export function createSavannaShrubGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.savannaShrub;
	const stem = new CylinderGeometry(0.004, 0.006, m.baseHeight, 4);
	stem.translate(0, m.baseY, 0);
	const crown = new ConeGeometry(m.crownRadius, m.crownHeight, 5);
	crown.translate(0, m.crownY, 0);
	return mergeGeometries([stem, crown]);
}

export function createGrassShrubGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.grassShrub;
	const bush = new ConeGeometry(m.radius, m.height, 5);
	bush.translate(0, m.y, 0);
	return bush;
}

export function createBoulderGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.boulder;
	const rock = new DodecahedronGeometry(m.radius, 0);
	rock.scale(m.scale[0], m.scale[1], m.scale[2]);
	rock.computeVertexNormals();
	return rock;
}

export function createMountainBoulderGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.mountainBoulder;
	const rock = new DodecahedronGeometry(m.radius, 0);
	rock.scale(m.scale[0], m.scale[1], m.scale[2]);
	rock.computeVertexNormals();
	return rock;
}

export function createIceSpireGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.iceSpire;
	const base = new DodecahedronGeometry(m.baseRadius, 0);
	base.scale(m.baseScale[0], m.baseScale[1], m.baseScale[2]);
	base.translate(0, m.baseY, 0);
	const spike = new ConeGeometry(m.spikeRadius, m.spikeHeight, 5);
	spike.translate(0, m.spikeY, 0);
	return mergeGeometries([base, spike]);
}

export function createCoastalDriftwoodGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.coastalDriftwood;
	const log = new CylinderGeometry(m.radius, m.radius * 0.9, m.length, 5);
	log.rotateZ(Math.PI / 2);
	log.translate(0, m.y, 0);
	return log;
}

export function createCoastalRockGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.coastalRock;
	const rock = new DodecahedronGeometry(m.radius, 0);
	rock.scale(m.scale[0], m.scale[1], m.scale[2]);
	rock.computeVertexNormals();
	return rock;
}

export function createSettlementGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.settlement;
	const c = planetConfig.objects.colors;
	const base = new BoxGeometry(m.baseW, m.baseH, m.baseD);
	base.translate(0, m.baseY, 0);
	const mid = new BoxGeometry(m.midW, m.midH, m.midD);
	mid.translate(-0.008, m.midY, 0.004);
	const roof = new BoxGeometry(m.roofW, m.roofH, m.roofD);
	roof.translate(-0.008, m.roofY, 0.004);
	const tower = new BoxGeometry(m.towerW, m.towerH, m.towerD);
	tower.translate(m.towerX, m.towerY, -0.006);
	return mergeGeometries(
		[base, mid, roof, tower],
		[c.settlementWall, c.settlementWall, c.settlementRoof, c.settlementAccent]
	);
}

export function createCommsTowerGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.commsTower;
	const c = planetConfig.objects.colors;
	const base = new BoxGeometry(m.baseW, m.baseH, m.baseW);
	base.translate(0, m.baseY, 0);
	const mast = new CylinderGeometry(m.mastRadius * 0.7, m.mastRadius, m.mastHeight, 5);
	mast.translate(0, m.mastY, 0);
	const arm = new CylinderGeometry(m.mastRadius * 0.5, m.mastRadius * 0.5, m.crossArm, 4);
	arm.rotateZ(Math.PI / 2);
	arm.translate(0, m.crossY, 0);
	const dish = new SphereGeometry(m.dishRadius, 6, 4);
	dish.scale(1, 0.35, 1);
	dish.rotateX(m.dishTilt);
	dish.translate(m.crossArm * 0.35, m.dishY, 0);
	return mergeGeometries(
		[base, mast, arm, dish],
		[c.commsTowerBody, c.commsTowerBody, c.commsTowerBody, c.commsTowerDish]
	);
}

export function createLighthouseGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.lighthouse;
	const c = planetConfig.objects.colors;
	const base = new CylinderGeometry(m.baseRadius, m.baseRadius * 1.15, m.baseHeight, 6);
	base.translate(0, m.baseY, 0);
	const shaft = new CylinderGeometry(m.shaftTop, m.shaftBottom, m.shaftHeight, 6);
	shaft.translate(0, m.shaftY, 0);
	const lantern = new CylinderGeometry(m.lanternRadius, m.lanternRadius, m.lanternHeight, 6);
	lantern.translate(0, m.lanternY, 0);
	const cap = new ConeGeometry(m.capRadius, m.capHeight, 6);
	cap.translate(0, m.capY, 0);
	return mergeGeometries(
		[base, shaft, lantern, cap],
		[c.lighthouseBase, c.lighthouseStripe, c.lighthouseLantern, c.lighthouseBase]
	);
}

export function createOffshorePlatformGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.offshorePlatform;
	const c = planetConfig.objects.colors;
	const deck = new BoxGeometry(m.deckW, m.deckH, m.deckD);
	deck.translate(0, m.deckY, 0);
	const legs: BufferGeometry[] = [];
	const offsets: Array<[number, number]> = [
		[m.legSpread, m.legSpread],
		[m.legSpread, -m.legSpread],
		[-m.legSpread, m.legSpread],
		[-m.legSpread, -m.legSpread]
	];
	for (const [ox, oz] of offsets) {
		const leg = new CylinderGeometry(m.legRadius, m.legRadius * 1.1, m.legHeight, 4);
		leg.translate(ox, m.legHeight * 0.5, oz);
		legs.push(leg);
	}
	const craneMast = new CylinderGeometry(m.legRadius * 0.9, m.legRadius, m.craneMastH, 4);
	craneMast.translate(m.legSpread * 0.5, m.craneMastY, 0);
	const craneArm = new BoxGeometry(m.craneArmL, m.legRadius * 1.2, m.legRadius * 1.2);
	craneArm.translate(m.legSpread * 0.5 + m.craneArmL * 0.35, m.craneArmY, 0);
	return mergeGeometries(
		[deck, ...legs, craneMast, craneArm],
		[
			c.platformDeck,
			c.platformLeg,
			c.platformLeg,
			c.platformLeg,
			c.platformLeg,
			c.platformCrane,
			c.platformCrane
		]
	);
}

export function createShipGeometry(): BufferGeometry {
	const m = planetConfig.objects.mesh.ship;
	const c = planetConfig.objects.colors;
	const hull = new BoxGeometry(m.hullL, m.hullH, m.hullW);
	hull.translate(0, m.hullY, 0);
	const bow = new ConeGeometry(m.hullW * 0.55, m.hullL * 0.28, 4);
	bow.rotateZ(-Math.PI / 2);
	bow.translate(m.hullL * 0.42, m.hullY, 0);
	const deck = new BoxGeometry(m.deckL, m.deckH, m.deckW);
	deck.translate(-0.004, m.deckY, 0);
	const bridge = new BoxGeometry(m.bridgeL, m.bridgeH, m.bridgeW);
	bridge.translate(-0.01, m.bridgeY, 0);
	const funnel = new CylinderGeometry(m.funnelR, m.funnelR * 1.1, m.funnelH, 5);
	funnel.translate(0.006, m.funnelY, 0);
	return mergeGeometries(
		[hull, bow, deck, bridge, funnel],
		[c.shipHull, c.shipHull, c.shipDeck, c.shipBridge, c.shipHull]
	);
}

const p = () => planetConfig.objects.placement;

export function canPlaceBroadleafTree(point: SurfacePoint): boolean {
	return (
		point.slope < p().treeMaxSlope &&
		point.elevation > p().treeMinElevation &&
		point.mountain < p().treeMaxMountain
	);
}

export function canPlaceConiferTree(point: SurfacePoint): boolean {
	return canPlaceBroadleafTree(point);
}

export function canPlaceTropicalTree(point: SurfacePoint): boolean {
	return canPlaceBroadleafTree(point);
}

export function canPlaceCactus(point: SurfacePoint): boolean {
	return point.slope < p().cactusMaxSlope && point.elevation > p().treeMinElevation;
}

export function canPlaceSavannaShrub(point: SurfacePoint): boolean {
	return point.slope < p().shrubMaxSlope && point.elevation > 0.01;
}

export function canPlaceGrassShrub(point: SurfacePoint): boolean {
	return point.slope < p().shrubMaxSlope && point.elevation > 0.01;
}

export function canPlaceBoulder(point: SurfacePoint): boolean {
	return point.slope > p().rockMinSlope;
}

export function canPlaceMountainBoulder(point: SurfacePoint): boolean {
	return point.slope > p().rockMinSlope * 0.85 && point.mountain > 0.25;
}

export function canPlaceIceSpire(point: SurfacePoint): boolean {
	return point.slope < p().snowMaxSlope;
}

export function canPlaceCoastalDriftwood(point: SurfacePoint): boolean {
	return point.elevation <= p().coastMaxElevation && point.slope < p().coastMaxSlope;
}

export function canPlaceCoastalRock(point: SurfacePoint): boolean {
	return point.elevation <= p().coastMaxElevation && point.slope < p().coastMaxSlope;
}

export function canPlaceSettlement(point: SurfacePoint): boolean {
	return (
		point.slope < p().structureMaxSlope &&
		point.elevation > p().structureMinElevation &&
		point.mountain < p().structureMaxMountain
	);
}

export function canPlaceCommsTower(point: SurfacePoint): boolean {
	return (
		point.slope < p().towerMaxSlope &&
		point.elevation > p().towerMinElevation &&
		point.mountain < p().structureMaxMountain
	);
}

export function canPlaceLighthouse(point: SurfacePoint): boolean {
	return point.elevation <= p().lighthouseMaxElevation && point.slope < p().lighthouseMaxSlope;
}

export function canPlaceOffshorePlatform(point: SurfacePoint): boolean {
	// elevation is seaLevel - height for ocean points (depth below sea).
	return point.elevation >= 0 && point.elevation <= p().oceanMaxDepth && point.slope < 0.85;
}

export function canPlaceShip(point: SurfacePoint): boolean {
	return point.elevation >= 0 && point.elevation <= p().shipMaxDepth && point.slope < 0.9;
}

/** Legacy helper: tree terrain + vegetated biomes. Prefer registry. */
export function canPlaceTree(point: SurfacePoint): boolean {
	return (
		canPlaceBroadleafTree(point) &&
		(point.biome === 'forest' ||
			point.biome === 'rainforest' ||
			point.biome === 'taiga' ||
			point.biome === 'grassland')
	);
}

/** Legacy helper: boulder terrain + rock-supporting biomes. Prefer registry. */
export function canPlaceRock(point: SurfacePoint): boolean {
	return (
		canPlaceBoulder(point) &&
		(point.biome === 'rock' ||
			point.biome === 'mountain' ||
			point.biome === 'alpine' ||
			point.biome === 'desert' ||
			point.biome === 'tundra' ||
			point.biome === 'savanna')
	);
}

/** Legacy helper: ice terrain + cold biomes. Prefer registry. */
export function canPlaceSnowFormation(point: SurfacePoint): boolean {
	return (
		canPlaceIceSpire(point) &&
		(point.biome === 'snow' || point.biome === 'glacier' || point.biome === 'alpine')
	);
}

function buildRegistry(): PlaceableDef[] {
	const o = planetConfig.objects;
	const c = o.colors;
	return [
		{
			kind: 'broadleafTree',
			domain: 'land',
			createGeometry: createBroadleafTreeGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.broadleafTree,
			scale: o.scale.broadleafTree,
			chance: o.chance.broadleafTree,
			maxCount: o.maxCounts.broadleafTree,
			biomeWeight: { forest: 1, grassland: 0.35 },
			canPlace: canPlaceBroadleafTree
		},
		{
			kind: 'coniferTree',
			domain: 'land',
			createGeometry: createConiferTreeGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.coniferTree,
			scale: o.scale.coniferTree,
			chance: o.chance.coniferTree,
			maxCount: o.maxCounts.coniferTree,
			biomeWeight: { taiga: 1, forest: 0.15, tundra: 0.2 },
			canPlace: canPlaceConiferTree
		},
		{
			kind: 'tropicalTree',
			domain: 'land',
			createGeometry: createTropicalTreeGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.tropicalTree,
			scale: o.scale.tropicalTree,
			chance: o.chance.tropicalTree,
			maxCount: o.maxCounts.tropicalTree,
			biomeWeight: { rainforest: 1 },
			canPlace: canPlaceTropicalTree
		},
		{
			kind: 'cactus',
			domain: 'land',
			createGeometry: createCactusGeometry,
			color: c.cactus,
			lift: o.lift.cactus,
			scale: o.scale.cactus,
			chance: o.chance.cactus,
			maxCount: o.maxCounts.cactus,
			biomeWeight: { desert: 1 },
			canPlace: canPlaceCactus
		},
		{
			kind: 'savannaShrub',
			domain: 'land',
			createGeometry: createSavannaShrubGeometry,
			color: c.savannaShrub,
			lift: o.lift.savannaShrub,
			scale: o.scale.savannaShrub,
			chance: o.chance.savannaShrub,
			maxCount: o.maxCounts.savannaShrub,
			biomeWeight: { savanna: 1, grassland: 0.25 },
			canPlace: canPlaceSavannaShrub
		},
		{
			kind: 'grassShrub',
			domain: 'land',
			createGeometry: createGrassShrubGeometry,
			color: c.grassShrub,
			lift: o.lift.grassShrub,
			scale: o.scale.grassShrub,
			chance: o.chance.grassShrub,
			maxCount: o.maxCounts.grassShrub,
			biomeWeight: { grassland: 1, forest: 0.25, savanna: 0.2 },
			canPlace: canPlaceGrassShrub
		},
		{
			kind: 'boulder',
			domain: 'land',
			createGeometry: createBoulderGeometry,
			color: c.boulder,
			lift: o.lift.boulder,
			scale: o.scale.boulder,
			chance: o.chance.boulder,
			maxCount: o.maxCounts.boulder,
			biomeWeight: {
				rock: 1,
				desert: 0.55,
				savanna: 0.35,
				tundra: 0.45,
				grassland: 0.15
			},
			canPlace: canPlaceBoulder
		},
		{
			kind: 'mountainBoulder',
			domain: 'land',
			createGeometry: createMountainBoulderGeometry,
			color: c.mountainBoulder,
			lift: o.lift.mountainBoulder,
			scale: o.scale.mountainBoulder,
			chance: o.chance.mountainBoulder,
			maxCount: o.maxCounts.mountainBoulder,
			biomeWeight: { mountain: 1, alpine: 0.7, rock: 0.4 },
			canPlace: canPlaceMountainBoulder
		},
		{
			kind: 'iceSpire',
			domain: 'land',
			createGeometry: createIceSpireGeometry,
			color: c.iceSpire,
			lift: o.lift.iceSpire,
			scale: o.scale.iceSpire,
			chance: o.chance.iceSpire,
			maxCount: o.maxCounts.iceSpire,
			biomeWeight: { snow: 1, glacier: 1, alpine: 0.55 },
			canPlace: canPlaceIceSpire
		},
		{
			kind: 'coastalDriftwood',
			domain: 'coast',
			createGeometry: createCoastalDriftwoodGeometry,
			color: c.coastalDriftwood,
			lift: o.lift.coastalDriftwood,
			scale: o.scale.coastalDriftwood,
			chance: o.chance.coastalDriftwood,
			maxCount: o.maxCounts.coastalDriftwood,
			biomeWeight: { beach: 1 },
			canPlace: canPlaceCoastalDriftwood
		},
		{
			kind: 'coastalRock',
			domain: 'coast',
			createGeometry: createCoastalRockGeometry,
			color: c.coastalRock,
			lift: o.lift.coastalRock,
			scale: o.scale.coastalRock,
			chance: o.chance.coastalRock,
			maxCount: o.maxCounts.coastalRock,
			biomeWeight: { beach: 0.85 },
			canPlace: canPlaceCoastalRock
		},
		{
			kind: 'settlement',
			domain: 'land',
			createGeometry: createSettlementGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.settlement,
			scale: o.scale.settlement,
			chance: o.chance.settlement,
			maxCount: o.maxCounts.settlement,
			biomeWeight: {
				grassland: 1,
				forest: 0.55,
				savanna: 0.7,
				desert: 0.35,
				taiga: 0.4,
				tundra: 0.25
			},
			canPlace: canPlaceSettlement
		},
		{
			kind: 'commsTower',
			domain: 'land',
			createGeometry: createCommsTowerGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.commsTower,
			scale: o.scale.commsTower,
			chance: o.chance.commsTower,
			maxCount: o.maxCounts.commsTower,
			biomeWeight: {
				grassland: 0.7,
				rock: 1,
				mountain: 0.85,
				desert: 0.55,
				tundra: 0.5,
				alpine: 0.4
			},
			canPlace: canPlaceCommsTower
		},
		{
			kind: 'lighthouse',
			domain: 'coast',
			createGeometry: createLighthouseGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.lighthouse,
			scale: o.scale.lighthouse,
			chance: o.chance.lighthouse,
			maxCount: o.maxCounts.lighthouse,
			biomeWeight: { beach: 1 },
			canPlace: canPlaceLighthouse
		},
		{
			kind: 'offshorePlatform',
			domain: 'ocean',
			createGeometry: createOffshorePlatformGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.offshorePlatform,
			scale: o.scale.offshorePlatform,
			chance: o.chance.offshorePlatform,
			maxCount: o.maxCounts.offshorePlatform,
			biomeWeight: { shallow: 1, deepOcean: 0.45 },
			canPlace: canPlaceOffshorePlatform
		},
		{
			kind: 'ship',
			domain: 'ocean',
			createGeometry: createShipGeometry,
			color: 0xffffff,
			vertexColors: true,
			lift: o.lift.ship,
			scale: o.scale.ship,
			chance: o.chance.ship,
			maxCount: o.maxCounts.ship,
			biomeWeight: { shallow: 1, deepOcean: 0.65 },
			canPlace: canPlaceShip
		}
	];
}

export const PLACEABLE_KINDS: PlaceableKind[] = [
	'broadleafTree',
	'coniferTree',
	'tropicalTree',
	'cactus',
	'savannaShrub',
	'grassShrub',
	'boulder',
	'mountainBoulder',
	'iceSpire',
	'coastalDriftwood',
	'coastalRock',
	'settlement',
	'commsTower',
	'lighthouse',
	'offshorePlatform',
	'ship'
];

export function emptyPlaceableCounts(): PlaceableCounts {
	const counts = {} as PlaceableCounts;
	for (const kind of PLACEABLE_KINDS) counts[kind] = 0;
	return counts;
}

export function getPlaceableRegistry(): PlaceableDef[] {
	return buildRegistry();
}

export function getPlaceableDomain(kind: PlaceableKind): PlaceableDomain {
	const def = getPlaceableRegistry().find((d) => d.kind === kind);
	return def?.domain ?? 'land';
}

function normalizeDirection(x: number, y: number, z: number): Vector3 {
	const len = Math.hypot(x, y, z) || 1;
	return new Vector3(x / len, y / len, z / len);
}

function findNearestSurface(
	points: SurfacePoint[],
	dir: Vector3,
	domain?: PlaceableDomain
): SurfacePoint | null {
	let best: SurfacePoint | null = null;
	let bestDot = -2;
	for (const pnt of points) {
		if (domain && pnt.domain !== domain) continue;
		const dot = pnt.dirX * dir.x + pnt.dirY * dir.y + pnt.dirZ * dir.z;
		if (dot > bestDot) {
			bestDot = dot;
			best = pnt;
		}
	}
	// Fallback without domain filter if nothing matched (explicit descriptors).
	if (!best && domain) return findNearestSurface(points, dir);
	return best;
}

type PlacedItem = { point: SurfacePoint; scale: number; yaw: number; kind: PlaceableKind };

/**
 * Build instanced placeables from the registry on valid surface points.
 * Uses shared cross-type angular spacing. Deterministic for a given rng + surface set.
 */
export function placeObjects(
	group: Group,
	points: SurfacePoint[],
	options: PlacementOptions
): PlaceableBundle {
	const cfg = planetConfig.objects;
	const rng = options.rng;
	const density = options.density ?? 1;
	const registry = getPlaceableRegistry();
	const minSepDot = Math.cos((cfg.minSeparationDeg * Math.PI) / 180);

	const shuffle = <T>(arr: T[]) => {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	};

	const farEnough = (point: SurfacePoint, placed: PlacedItem[]) => {
		for (const other of placed) {
			const dot =
				point.dirX * other.point.dirX +
				point.dirY * other.point.dirY +
				point.dirZ * other.point.dirZ;
			if (dot > minSepDot) return false;
		}
		return true;
	};

	/** All placements share one global set for cross-type separation. */
	const allPlaced: PlacedItem[] = [];
	const byKind = new Map<PlaceableKind, PlacedItem[]>();
	for (const def of registry) byKind.set(def.kind, []);

	for (const def of registry) {
		const maxCount = Math.floor((options.maxCounts?.[def.kind] ?? def.maxCount) * density);
		const candidates: SurfacePoint[] = [];
		for (const point of points) {
			if (point.domain !== def.domain) continue;
			const weight = def.biomeWeight[point.biome] ?? 0;
			if (weight <= 0) continue;
			if (!def.canPlace(point)) continue;
			candidates.push(point);
		}
		shuffle(candidates);
		const step = Math.max(
			1,
			Math.floor(candidates.length / Math.max(1, maxCount * cfg.thinFactor))
		);
		const list = byKind.get(def.kind)!;
		for (let i = 0; i < candidates.length && list.length < maxCount; i += step) {
			const point = candidates[i];
			const weight = def.biomeWeight[point.biome] ?? 0;
			if (rng() > def.chance * weight * density) continue;
			if (!farEnough(point, allPlaced)) continue;
			const entry: PlacedItem = {
				point,
				scale: def.scale.min + rng() * def.scale.range,
				yaw: rng() * Math.PI * 2,
				kind: def.kind
			};
			list.push(entry);
			allPlaced.push(entry);
		}
	}

	for (const desc of options.explicit ?? []) {
		const dir = normalizeDirection(desc.direction[0], desc.direction[1], desc.direction[2]);
		const domain = getPlaceableDomain(desc.kind);
		const nearest = findNearestSurface(points, dir, domain);
		if (!nearest) continue;
		const entry: PlacedItem = {
			point: {
				...nearest,
				dirX: dir.x,
				dirY: dir.y,
				dirZ: dir.z,
				radius: nearest.radius,
				domain
			},
			scale: desc.scale ?? 1,
			yaw: desc.rotation ?? 0,
			kind: desc.kind
		};
		byKind.get(desc.kind)?.push(entry);
		allPlaced.push(entry);
	}

	const meshes: InstancedMesh[] = [];
	const geos: BufferGeometry[] = [];
	const mats: MeshLambertMaterial[] = [];
	const counts = emptyPlaceableCounts();

	for (const def of registry) {
		const items = byKind.get(def.kind) ?? [];
		counts[def.kind] = items.length;
		const geo = def.createGeometry();
		if (items.length === 0) {
			geo.dispose();
			continue;
		}
		const mat = new MeshLambertMaterial({
			color: def.vertexColors ? 0xffffff : def.color,
			flatShading: true,
			vertexColors: Boolean(def.vertexColors)
		});
		const mesh = new InstancedMesh(geo, mat, items.length);
		for (let i = 0; i < items.length; i++) {
			const { point, scale, yaw } = items[i];
			tmpNormal.set(point.dirX, point.dirY, point.dirZ);
			tmpPos.copy(tmpNormal).multiplyScalar(point.radius + def.lift * scale);
			setInstanceMatrix(mesh, i, tmpPos, tmpNormal, scale, yaw);
		}
		mesh.instanceMatrix.needsUpdate = true;
		mesh.frustumCulled = true;
		mesh.name = `placeable:${def.kind}`;
		group.add(mesh);
		meshes.push(mesh);
		geos.push(geo);
		mats.push(mat);
	}

	return {
		meshes,
		counts,
		dispose: () => {
			for (const m of meshes) group.remove(m);
			for (const g of geos) g.dispose();
			for (const m of mats) m.dispose();
		}
	};
}

/** Sum of all placeable instances (useful for tests / UI). */
export function totalPlaceableCount(counts: PlaceableCounts): number {
	let n = 0;
	for (const kind of PLACEABLE_KINDS) n += counts[kind];
	return n;
}
