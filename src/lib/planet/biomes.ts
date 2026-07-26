import { Color } from 'three';
import { planetConfig } from './planetConfig';

export type BiomeKind =
	| 'deepOcean'
	| 'shallow'
	| 'lake'
	| 'river'
	| 'beach'
	| 'desert'
	| 'savanna'
	| 'grassland'
	| 'forest'
	| 'rainforest'
	| 'taiga'
	| 'tundra'
	| 'rock'
	| 'mountain'
	| 'alpine'
	| 'snow'
	| 'glacier';

export const BIOME_COLORS: Record<BiomeKind, Color> = {
	deepOcean: new Color('#061e45'),
	shallow: new Color('#146a8c'),
	lake: new Color('#0a3550'),
	river: new Color('#0d4058'),
	beach: new Color('#e2c87a'),
	desert: new Color('#d4a04a'),
	savanna: new Color('#c2a84a'),
	grassland: new Color('#5bb34f'),
	forest: new Color('#1f7a35'),
	rainforest: new Color('#0d5c28'),
	taiga: new Color('#2d6b4a'),
	tundra: new Color('#8fa89a'),
	rock: new Color('#7a6e63'),
	mountain: new Color('#8a9099'),
	alpine: new Color('#a8b0bc'),
	snow: new Color('#f0f4f8'),
	glacier: new Color('#d6e8f2')
};

export type BiomeInputs = {
	height: number;
	moisture: number;
	temperature: number;
	slope: number;
	mountain: number;
	seaLevel: number;
};

/**
 * Classify a surface sample from elevation, climate, and relief.
 * Order: water → beach → high-altitude / cold → steep rock → lowland biomes.
 */
export function pickBiome(input: BiomeInputs): BiomeKind {
	const { height, moisture, temperature, slope, mountain, seaLevel } = input;
	const b = planetConfig.biomes;

	if (height < seaLevel - b.deepOceanBelow) return 'deepOcean';
	if (height < seaLevel) return 'shallow';
	if (height < seaLevel + b.beachAbove) return 'beach';

	const aboveSea = (height - seaLevel) / Math.max(1e-6, 1 - seaLevel);
	const snowLine = b.snowLineBase + temperature * b.snowLineTempScale;
	const isCold = temperature < b.coldBelow;
	const isVeryCold = temperature < b.veryColdBelow;

	if (aboveSea > snowLine || (isVeryCold && aboveSea > b.snowFromColdAboveSea)) {
		return moisture > b.glacierMoisture && aboveSea > b.glacierAboveSea ? 'glacier' : 'snow';
	}

	if (
		aboveSea > b.highAltitude ||
		(mountain > b.mountainStrength && aboveSea > b.mountainAboveSea)
	) {
		if (isCold || aboveSea > b.alpineAboveSea) return 'alpine';
		return 'mountain';
	}

	if (slope > b.rockSlope && aboveSea > b.rockAboveSea) return 'rock';

	if (isVeryCold) return moisture > b.tundraMoisture ? 'tundra' : 'rock';
	if (isCold) {
		if (moisture > b.taigaMoisture) return 'taiga';
		return aboveSea > b.coldTundraAboveSea ? 'tundra' : 'grassland';
	}

	if (temperature > b.hotDesertTemp && moisture < b.hotDesertMoisture) return 'desert';
	if (temperature > b.savannaTemp && moisture < b.savannaMoisture) return 'savanna';
	if (moisture > b.rainforestMoisture && temperature > b.rainforestTemp) return 'rainforest';
	if (moisture < b.desertMoisture) return 'desert';
	if (moisture < b.grasslandMoisture) return 'grassland';
	return 'forest';
}

/** Biomes that support some form of tree placeable. */
export function biomeSupportsTrees(kind: BiomeKind): boolean {
	return kind === 'forest' || kind === 'rainforest' || kind === 'taiga' || kind === 'grassland';
}

/** Biomes that support boulder / rock placeables. */
export function biomeSupportsRocks(kind: BiomeKind): boolean {
	return (
		kind === 'rock' ||
		kind === 'mountain' ||
		kind === 'alpine' ||
		kind === 'desert' ||
		kind === 'tundra' ||
		kind === 'savanna'
	);
}

/** Biomes that support ice / snow formations. */
export function biomeSupportsSnowFormations(kind: BiomeKind): boolean {
	return kind === 'snow' || kind === 'glacier' || kind === 'alpine';
}

/** Biomes that support coastal placeables. */
export function biomeSupportsCoastal(kind: BiomeKind): boolean {
	return kind === 'beach';
}

/**
 * Soft coastal blend factor in [0, 1].
 * 0 = fully land color, 1 = fully water color. Peaks at sea level.
 */
export function coastalBlendFactor(height: number, seaLevel: number, width?: number): number {
	const w = width ?? planetConfig.terrain.coastBlendWidth;
	if (w <= 0) return height < seaLevel ? 1 : 0;
	const t = (height - (seaLevel - w)) / (2 * w);
	if (t <= 0) return 1;
	if (t >= 1) return 0;
	// Smoothstep for a soft shoreline.
	return 1 - t * t * (3 - 2 * t);
}
