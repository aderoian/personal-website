/**
 * Planet tuning knobs — edit values here, not in the generators.
 *
 * Sections:
 *   mesh / scene  → resolution, size, camera framing
 *   land / sea    → how much ocean vs continent
 *   terrain       → hills, mountains, climate noise
 *   biomes        → classification thresholds
 *   hydrology     → lakes & rivers
 *   water         → ocean shader + coastal blend
 *   atmosphere    → scattering shell
 *   objects       → placeable registry density / sizing
 */

export const planetConfig = {
	/** Icosahedron subdivision (≈10× density vs detail 10). */
	detail: 54,
	radius: 1,
	/** Peak land relief amplitude. */
	maxDisplacement: 0.52,
	/**
	 * Fallback sea level when a call omits seaLevel.
	 * Midpoint of the production random band so direct calls still produce land.
	 */
	seaLevel: 0.535,
	/** Random sea-level band used by the home-page backdrop: base + rng * range. */
	seaLevelRandom: { base: 0.52, range: 0.03 },

	/** Multiplier applied to automatic prop density. */
	objectDensity: 1,

	scene: {
		/** Planet group scale in the Three.js scene. */
		scale: 0.58,
		position: { x: 0.48, y: 0.22, z: 0 },
		tiltZDeg: 23,
		tiltX: 0.15,
		spinSpeed: 0.0022,
		camera: {
			fov: 40,
			near: 0.1,
			far: 100,
			position: { x: 0, y: 0.12, z: 3.55 },
			lookAt: { x: 0.32, y: 0.1, z: 0 },
			/** Camera Z when aspect is portrait-like. */
			portraitZ: 4.05,
			portraitAspectBelow: 0.85
		},
		lights: {
			ambient: { color: 0xc5d0dc, intensity: 0.58 },
			key: { color: 0xfff5ea, intensity: 1.45, position: [2.8, 2.4, 3] as const },
			fill: { color: 0x9bb0c8, intensity: 0.36, position: [-2.2, -1, -1.2] as const },
			rim: { color: 0xb8d4e8, intensity: 0.22, position: [-1.5, 1.8, -2.5] as const }
		},
		backdropOpacity: { desktop: 0.78, mobile: 0.5 }
	},

	/**
	 * Land vs ocean. Higher landBias / lower landPower → more land.
	 * Elevation blend weights should roughly sum near 1 (before valley subtract).
	 */
	land: {
		continentFreq: 0.55,
		continentOctaves: 4,
		/** Added after remapping noise to 0–1 (0.5 = neutral; >0.5 more land). */
		landBias: 0.62,
		/** Power curve on continentalness (<1 spreads continents). */
		landPower: 0.85,
		elevationWeights: {
			base: 0.28,
			continentalness: 0.52,
			mountain: 0.32
		},
		valleyCarve: 0.12
	},

	terrain: {
		freq: { base: 1.25, range: 0.45 },
		moistureFreq: { base: 1.05, range: 0.45 },
		tempFreq: { base: 0.85, range: 0.35 },
		mountainFreq: { base: 1.6, range: 0.7 },
		warp: { base: 0.12, range: 0.16 },
		warpSampleScale: 0.75,
		warpOctaves: 3,
		baseOctaves: 6,
		mountain: {
			rangeMaskScale: 0.45,
			rangeMaskBias: 0.45,
			rangeMaskPower: 1.8,
			ridgeScale: 1.8,
			foothillScale: 3.2,
			ridgeWeight: 0.55,
			ridgeMix: 0.45,
			foothillWeight: 0.18,
			valleyPower: 1.6
		},
		moisture: {
			mountainDryness: 0.18,
			continentWetness: 0.05
		},
		temperature: {
			latitudeWeight: 0.78,
			noiseWeight: 0.22,
			/** How much elevation cools the climate. */
			lapseRate: 0.42
		},
		/** Neighbor height delta × this → slope 0–1. */
		slopeScale: 14,
		displacement: {
			oceanInset: 0.1,
			landExponent: 0.82,
			peakBoost: 0.55,
			peakExponent: 1.4
		},
		/** Per-face color jitter (HSL). */
		colorJitter: { h: 0.02, s: 0.04, l: 0.05 },
		/** Soften land↔water vertex colors near sea level (height units). */
		coastBlendWidth: 0.028
	},

	biomes: {
		deepOceanBelow: 0.035,
		beachAbove: 0.012,
		snowLineBase: 0.55,
		snowLineTempScale: 0.28,
		coldBelow: 0.28,
		veryColdBelow: 0.16,
		snowFromColdAboveSea: 0.35,
		glacierMoisture: 0.55,
		glacierAboveSea: 0.7,
		highAltitude: 0.72,
		mountainStrength: 0.55,
		mountainAboveSea: 0.55,
		alpineAboveSea: 0.82,
		rockSlope: 0.62,
		rockAboveSea: 0.28,
		tundraMoisture: 0.4,
		taigaMoisture: 0.45,
		coldTundraAboveSea: 0.35,
		hotDesertTemp: 0.72,
		hotDesertMoisture: 0.28,
		savannaTemp: 0.62,
		savannaMoisture: 0.42,
		rainforestMoisture: 0.72,
		rainforestTemp: 0.55,
		desertMoisture: 0.3,
		grasslandMoisture: 0.52
	},

	hydrology: {
		lake: {
			baseCount: 8,
			countScale: 0.35,
			maxCount: 18,
			basinBase: 70,
			minBasinBase: 4,
			maxHeightAboveSea: 0.2,
			floodAdd: 0.015,
			floodRange: 0.028,
			maxFloodAboveSea: 0.24
		},
		river: {
			baseCount: 6,
			countScale: 0.4,
			maxCount: 24,
			stepsBase: 100,
			startMin: 0.52,
			startMax: 0.9,
			carve: 0.014,
			minPath: 8
		}
	},

	water: {
		/** Smooth ocean sphere subdivision (independent of terrain detail). */
		detail: 48,
		deepColor: '#061e45',
		shallowColor: '#146a8c',
		specularColor: '#c5dde8',
		fresnelPower: 2.8,
		fresnelBias: 0.08,
		opacity: 0.86,
		specularStrength: 0.5,
		specularPower: 48,
		waveStrength: 0.035,
		waveSpeed: 0.55,
		waveScale: 6.5,
		depthMix: 0.55,
		/** Radial lift so inland water sits just above terrain faces. */
		inlandLift: 0.0035,
		lake: {
			deepColor: '#0a3550',
			shallowColor: '#1a7a96',
			opacity: 0.88,
			waveScale: 9.5,
			waveStrength: 0.028,
			waveSpeed: 0.4
		},
		river: {
			deepColor: '#0d4058',
			shallowColor: '#2288a8',
			opacity: 0.9,
			waveScale: 14,
			waveStrength: 0.04,
			waveSpeed: 0.75
		}
	},

	atmosphere: {
		minRadiusFactor: 1.08,
		peakClearanceFactor: 1.02,
		thickness: 0.045,
		detail: 5,
		rayleighColor: '#6ea8d8',
		mieColor: '#e8f2ff',
		intensity: 0.72,
		falloffPower: 3.2,
		sunScatter: 0.85,
		mieStrength: 0.28,
		miePower: 12,
		nightAttenuation: 0.35
	},

	objects: {
		/** Candidate list thinning relative to max count. */
		thinFactor: 0.22,
		/** Minimum angular separation between any two props (degrees). */
		minSeparationDeg: 0.42,
		/** Per-kind placement caps (before density multiplier). */
		maxCounts: {
			broadleafTree: 3500,
			coniferTree: 2800,
			tropicalTree: 2200,
			cactus: 1800,
			savannaShrub: 2200,
			grassShrub: 2800,
			boulder: 2500,
			mountainBoulder: 2000,
			iceSpire: 1600,
			coastalDriftwood: 900,
			coastalRock: 1100
		},
		scale: {
			broadleafTree: { min: 0.28, range: 0.42 },
			coniferTree: { min: 0.3, range: 0.48 },
			tropicalTree: { min: 0.32, range: 0.5 },
			cactus: { min: 0.35, range: 0.4 },
			savannaShrub: { min: 0.3, range: 0.35 },
			grassShrub: { min: 0.22, range: 0.3 },
			boulder: { min: 0.28, range: 0.4 },
			mountainBoulder: { min: 0.35, range: 0.5 },
			iceSpire: { min: 0.75, range: 0.55 },
			coastalDriftwood: { min: 0.35, range: 0.35 },
			coastalRock: { min: 0.25, range: 0.35 }
		},
		lift: {
			broadleafTree: 0.006,
			coniferTree: 0.006,
			tropicalTree: 0.006,
			cactus: 0.004,
			savannaShrub: 0.003,
			grassShrub: 0.002,
			boulder: 0.003,
			mountainBoulder: 0.004,
			iceSpire: 0.005,
			coastalDriftwood: 0.002,
			coastalRock: 0.002
		},
		placement: {
			treeMaxSlope: 0.48,
			treeMinElevation: 0.02,
			treeMaxMountain: 0.7,
			rockMinSlope: 0.18,
			snowMaxSlope: 0.75,
			coastMaxElevation: 0.04,
			coastMaxSlope: 0.55,
			shrubMaxSlope: 0.55,
			cactusMaxSlope: 0.42
		},
		/** Base acceptance chance per kind (scaled by density + biome weight). */
		chance: {
			broadleafTree: 0.78,
			coniferTree: 0.55,
			tropicalTree: 0.88,
			cactus: 0.42,
			savannaShrub: 0.48,
			grassShrub: 0.36,
			boulder: 0.24,
			mountainBoulder: 0.3,
			iceSpire: 0.28,
			coastalDriftwood: 0.2,
			coastalRock: 0.26
		},
		colors: {
			boulder: 0x7a7368,
			mountainBoulder: 0x6e6a66,
			iceSpire: 0xe8eef5,
			coastalRock: 0x8a8478,
			coastalDriftwood: 0x6b5344,
			cactus: 0x3d8a4a,
			savannaShrub: 0x8a9a3c,
			grassShrub: 0x4a8a3a,
			broadleafTrunk: [0.42, 0.28, 0.14] as const,
			broadleafFoliage: [0.18, 0.45, 0.2] as const,
			broadleafCrown: [0.22, 0.52, 0.24] as const,
			coniferTrunk: [0.35, 0.24, 0.14] as const,
			coniferFoliage: [0.12, 0.38, 0.28] as const,
			coniferCrown: [0.16, 0.44, 0.32] as const,
			tropicalTrunk: [0.38, 0.26, 0.12] as const,
			tropicalFoliage: [0.1, 0.5, 0.22] as const,
			tropicalCrown: [0.14, 0.58, 0.26] as const
		},
		/** Prototype mesh sizes relative to planet radius ≈ 1. */
		mesh: {
			broadleafTree: {
				trunkTop: 0.006,
				trunkBottom: 0.01,
				trunkHeight: 0.04,
				trunkY: 0.02,
				foliageRadius: 0.03,
				foliageHeight: 0.07,
				foliageY: 0.065,
				crownRadius: 0.021,
				crownHeight: 0.045,
				crownY: 0.105
			},
			coniferTree: {
				trunkTop: 0.005,
				trunkBottom: 0.009,
				trunkHeight: 0.045,
				trunkY: 0.022,
				foliageRadius: 0.028,
				foliageHeight: 0.08,
				foliageY: 0.07,
				crownRadius: 0.018,
				crownHeight: 0.05,
				crownY: 0.12
			},
			tropicalTree: {
				trunkTop: 0.005,
				trunkBottom: 0.009,
				trunkHeight: 0.055,
				trunkY: 0.028,
				foliageRadius: 0.038,
				foliageHeight: 0.045,
				foliageY: 0.078,
				crownRadius: 0.028,
				crownHeight: 0.035,
				crownY: 0.1
			},
			cactus: {
				trunkRadius: 0.01,
				trunkHeight: 0.055,
				trunkY: 0.028,
				armRadius: 0.007,
				armHeight: 0.028,
				armY: 0.038,
				armOffset: 0.014
			},
			savannaShrub: {
				baseRadius: 0.018,
				baseHeight: 0.02,
				baseY: 0.01,
				crownRadius: 0.028,
				crownHeight: 0.018,
				crownY: 0.028
			},
			grassShrub: {
				radius: 0.016,
				height: 0.022,
				y: 0.011
			},
			boulder: {
				radius: 0.0225,
				scale: [1.15, 0.75, 1] as const
			},
			mountainBoulder: {
				radius: 0.028,
				scale: [1.3, 0.85, 1.1] as const
			},
			iceSpire: {
				baseRadius: 0.025,
				baseScale: [1.2, 0.55, 1.1] as const,
				baseY: 0.006,
				spikeRadius: 0.014,
				spikeHeight: 0.045,
				spikeY: 0.035
			},
			coastalDriftwood: {
				radius: 0.006,
				length: 0.045,
				y: 0.004
			},
			coastalRock: {
				radius: 0.016,
				scale: [1.2, 0.55, 0.9] as const
			}
		}
	}
} as const;

export type PlanetConfig = typeof planetConfig;

/** Resolve a random sea level from the configured band. */
export function randomSeaLevel(rng: () => number = Math.random): number {
	const { base, range } = planetConfig.seaLevelRandom;
	return base + rng() * range;
}
