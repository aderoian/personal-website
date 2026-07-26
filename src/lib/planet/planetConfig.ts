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
 *   objects       → placeable registry density / sizing (natural + man-made)
 *   clouds        → sparse procedural cloud shell
 *   aircraft      → orbiting low-poly planes
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
	seaLevel: 0.505,
	/** Random sea-level band used by the home-page backdrop: base + rng * range. */
	seaLevelRandom: { base: 0.50, range: 0.03 },

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
		specularStrength: 0.42,
		specularPower: 42,
		waveStrength: 0.035,
		waveSpeed: 0.55,
		waveScale: 6.5,
		depthMix: 0.55,
		/** Radial lift so inland water sits just above terrain faces. */
		inlandLift: 0.0035,
		/**
		 * Terrain under inland water overlays. Keep relatively bright so transparent
		 * water edges don't read as a black ring against land.
		 */
		inlandUnderlay: {
			/** Mix toward beach / wet sand under lake & river faces. */
			wetBlend: 0.55,
			/** Mild darken after wet blend (1 = no darken; was ~0.45 on raw water color). */
			darken: 0.88,
			/** Soft wet tint on land faces that only touch one water vertex. */
			edgeWetBlend: 0.32
		},
		/** Shore foam shared by ocean + inland overlays. */
		foam: {
			color: '#dff3f8',
			strength: 0.55,
			/** Higher = tighter rim along land contact. */
			width: 1.45,
			speed: 0.95,
			noiseScale: 20,
			/**
			 * Ocean coastline foam strength (multiplies `aCoast` from terrain shore signal).
			 * Not camera/Fresnel driven.
			 */
			oceanCoast: 0.9,
			/**
			 * Elevation band below sea level (height units) where ocean shore foam appears.
			 * Wider than terrain.coastBlendWidth so the rim reads at planet scale.
			 */
			oceanCoastWidth: 0.06,
			/** Angular probe (radians) to detect land adjacent to steep coasts. */
			oceanCoastProbe: 0.038
		},
		lake: {
			deepColor: '#0a3550',
			shallowColor: '#1a7a96',
			opacity: 0.88,
			waveScale: 8.5,
			waveStrength: 0.01,
			waveSpeed: 0.28,
			/** Calm, matte surface — readable color, almost no glare. */
			specularStrength: 0.06,
			specularPower: 10,
			fresnelPower: 4.8,
			fresnelBias: 0.015,
			foamStrength: 0.42,
			foamWidth: 1.55
		},
		river: {
			deepColor: '#0d4058',
			shallowColor: '#2288a8',
			opacity: 0.9,
			waveScale: 13,
			waveStrength: 0.022,
			waveSpeed: 0.62,
			/** Subtle ripples, not metallic. */
			specularStrength: 0.12,
			specularPower: 16,
			fresnelPower: 4.2,
			fresnelBias: 0.02,
			foamStrength: 0.5,
			foamWidth: 1.35
		}
	},

	atmosphere: {
		minRadiusFactor: 1.06,
		peakClearanceFactor: 1.015,
		/** Extra shell beyond peak clearance for the outer halo. */
		thickness: 0.09,
		/** Inner haze shell sits just outside peak terrain. */
		innerThickness: 0.022,
		detail: 6,
		rayleighColor: '#7eb6e0',
		mieColor: '#f0f7ff',
		hazeColor: '#9ec9ea',
		intensity: 1.05,
		falloffPower: 2.6,
		hazeStrength: 1.2,
		hazePower: 1.45,
		sunScatter: 0.9,
		mieStrength: 0.34,
		miePower: 10,
		nightAttenuation: 0.28,
		/**
		 * Limb factor handoff (0 = face-on, 1 = silhouette).
		 * Inner fades out across [blendStart, blendEnd]; outer fades in over the same range.
		 */
		blendStart: 0.42,
		blendEnd: 0.88,
		/** Front-face haze over the planet limb (covers see-through water edges). */
		innerIntensity: 0.78,
		innerFalloffPower: 2.0,
		innerHazeStrength: 1.05
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
			coastalRock: 1100,
			settlement: 120,
			commsTower: 90,
			lighthouse: 70,
			offshorePlatform: 55,
			ship: 80
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
			coastalRock: { min: 0.25, range: 0.35 },
			settlement: { min: 0.85, range: 0.55 },
			commsTower: { min: 0.9, range: 0.45 },
			lighthouse: { min: 0.95, range: 0.4 },
			offshorePlatform: { min: 0.9, range: 0.4 },
			ship: { min: 0.75, range: 0.45 }
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
			coastalRock: 0.002,
			settlement: 0.004,
			commsTower: 0.005,
			lighthouse: 0.003,
			offshorePlatform: 0.004,
			ship: 0.006
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
			cactusMaxSlope: 0.42,
			/** Man-made structure terrain gates. */
			structureMaxSlope: 0.32,
			structureMinElevation: 0.015,
			structureMaxMountain: 0.45,
			towerMaxSlope: 0.28,
			towerMinElevation: 0.04,
			lighthouseMaxElevation: 0.045,
			lighthouseMaxSlope: 0.5,
			oceanMaxDepth: 0.12,
			shipMaxDepth: 0.08
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
			coastalRock: 0.26,
			settlement: 0.22,
			commsTower: 0.18,
			lighthouse: 0.28,
			offshorePlatform: 0.2,
			ship: 0.16
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
			tropicalCrown: [0.14, 0.58, 0.26] as const,
			settlementWall: [0.55, 0.52, 0.48] as const,
			settlementRoof: [0.42, 0.28, 0.22] as const,
			settlementAccent: [0.35, 0.4, 0.48] as const,
			commsTowerBody: [0.62, 0.64, 0.68] as const,
			commsTowerDish: [0.78, 0.8, 0.85] as const,
			lighthouseBase: [0.72, 0.74, 0.78] as const,
			lighthouseStripe: [0.85, 0.25, 0.22] as const,
			lighthouseLantern: [0.95, 0.9, 0.55] as const,
			platformDeck: [0.55, 0.58, 0.62] as const,
			platformLeg: [0.4, 0.42, 0.46] as const,
			platformCrane: [0.75, 0.55, 0.2] as const,
			shipHull: [0.28, 0.38, 0.52] as const,
			shipDeck: [0.7, 0.72, 0.75] as const,
			shipBridge: [0.85, 0.88, 0.9] as const
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
			},
			settlement: {
				baseW: 0.045,
				baseH: 0.018,
				baseD: 0.038,
				baseY: 0.009,
				midW: 0.028,
				midH: 0.022,
				midD: 0.024,
				midY: 0.028,
				roofW: 0.034,
				roofH: 0.014,
				roofD: 0.03,
				roofY: 0.044,
				towerW: 0.012,
				towerH: 0.032,
				towerD: 0.012,
				towerY: 0.034,
				towerX: 0.018
			},
			commsTower: {
				mastRadius: 0.004,
				mastHeight: 0.08,
				mastY: 0.04,
				baseW: 0.018,
				baseH: 0.01,
				baseY: 0.005,
				dishRadius: 0.014,
				dishY: 0.07,
				dishTilt: 0.35,
				crossArm: 0.022,
				crossY: 0.055
			},
			lighthouse: {
				baseRadius: 0.016,
				baseHeight: 0.012,
				baseY: 0.006,
				shaftBottom: 0.01,
				shaftTop: 0.007,
				shaftHeight: 0.055,
				shaftY: 0.038,
				lanternRadius: 0.009,
				lanternHeight: 0.014,
				lanternY: 0.072,
				capRadius: 0.011,
				capHeight: 0.01,
				capY: 0.084
			},
			offshorePlatform: {
				deckW: 0.048,
				deckH: 0.008,
				deckD: 0.04,
				deckY: 0.028,
				legRadius: 0.004,
				legHeight: 0.032,
				legSpread: 0.016,
				craneMastH: 0.03,
				craneMastY: 0.048,
				craneArmL: 0.028,
				craneArmY: 0.058
			},
			ship: {
				hullL: 0.055,
				hullW: 0.016,
				hullH: 0.012,
				hullY: 0.008,
				deckL: 0.04,
				deckW: 0.012,
				deckH: 0.006,
				deckY: 0.016,
				bridgeL: 0.014,
				bridgeW: 0.01,
				bridgeH: 0.012,
				bridgeY: 0.024,
				funnelR: 0.004,
				funnelH: 0.012,
				funnelY: 0.032
			}
		}
	},

	/**
	 * Sparse procedural cloud shell — soft coverage so terrain stays readable.
	 */
	clouds: {
		/** Radial offset above peak clearance (added to peakClear). */
		altitude: 0.038,
		/** Higher subdivision so fluffy patches don't look faceted. */
		detail: 8,
		seedXor: 0xa5a5a5a5,
		color: '#f4f9fd',
		shadowColor: '#9eb8cc',
		/** Peak opacity inside a patch (sky between patches is clear). */
		opacity: 0.68,
		/**
		 * Noise threshold for cloud banks — higher = fewer, more isolated spots.
		 * Only noise peaks above this become clouds.
		 */
		coverage: 0.55,
		/** Feather width at bank edges. */
		softness: 0.12,
		/** Fine fluff frequency inside each patch. */
		noiseScale: 5.2,
		noiseOctaves: 5,
		driftSpeed: 0.014,
		/** Visible rotation of the cloud pattern relative to the surface, radians/second. */
		rotationSpeed: 0.055,
		sunLit: 0.7,
		nightAttenuation: 0.4,
		/** Face-on density multiplier (lower = less surface blocking). */
		faceDensity: 0.82,
		/** Billow strength — higher = puffier cauliflower interiors. */
		fluffiness: 0.85,
		/** Large-scale bank / spot frequency (lower = bigger isolated patches). */
		patchScale: 1.55
	},

	/**
	 * Seeded low-poly aircraft on great-circle routes.
	 */
	aircraft: {
		count: 5,
		seedXor: 0x51eed5e5,
		/** Flight altitude above planet radius (before peak clearance). */
		altitude: 0.055,
		altitudeJitter: 0.018,
		scale: { min: 0.7, range: 0.5 },
		/** Radians per second along the great circle. */
		orbitSpeed: 0.12,
		orbitSpeedJitter: 0.06,
		bodyColor: [0.82, 0.84, 0.88] as const,
		wingColor: [0.55, 0.62, 0.72] as const,
		accentColor: [0.75, 0.35, 0.28] as const,
		mesh: {
			fuselageR: 0.004,
			fuselageL: 0.028,
			wingSpan: 0.032,
			wingChord: 0.008,
			wingThick: 0.0015,
			tailSpan: 0.012,
			tailChord: 0.006,
			finH: 0.008,
			finChord: 0.005
		}
	}
} as const;

export type PlanetConfig = typeof planetConfig;

/** Resolve a random sea level from the configured band. */
export function randomSeaLevel(rng: () => number = Math.random): number {
	const { base, range } = planetConfig.seaLevelRandom;
	return base + rng() * range;
}
