import { Color, ShaderMaterial, type IUniform } from 'three';
import { planetConfig } from './planetConfig';

export type WaterUniforms = {
	uDeepColor: IUniform<Color>;
	uShallowColor: IUniform<Color>;
	uSpecularColor: IUniform<Color>;
	uFoamColor: IUniform<Color>;
	uLightDir: IUniform<[number, number, number]>;
	uTime: IUniform<number>;
	uFresnelPower: IUniform<number>;
	uFresnelBias: IUniform<number>;
	uOpacity: IUniform<number>;
	uSpecularStrength: IUniform<number>;
	uSpecularPower: IUniform<number>;
	uWaveStrength: IUniform<number>;
	uWaveSpeed: IUniform<number>;
	uWaveScale: IUniform<number>;
	uDepthMix: IUniform<number>;
	uFoamStrength: IUniform<number>;
	uFoamWidth: IUniform<number>;
	uFoamSpeed: IUniform<number>;
	uFoamNoiseScale: IUniform<number>;
	uOceanFoam: IUniform<number>;
};

export type WaterMaterialOptions = {
	deepColor?: string;
	shallowColor?: string;
	specularColor?: string;
	foamColor?: string;
	opacity?: number;
	waveStrength?: number;
	waveSpeed?: number;
	waveScale?: number;
	fresnelPower?: number;
	fresnelBias?: number;
	specularStrength?: number;
	specularPower?: number;
	depthMix?: number;
	foamStrength?: number;
	foamWidth?: number;
	foamSpeed?: number;
	foamNoiseScale?: number;
	oceanFoam?: number;
};

export type WaterMaterialBundle = {
	material: ShaderMaterial;
	uniforms: WaterUniforms;
	update: (elapsedSeconds: number, lightDir: [number, number, number]) => void;
	dispose: () => void;
};

/**
 * Grounded low-poly water: Fresnel rim, soft specular, subtle procedural normals,
 * and shore foam (`aEdge` inland; `aCoast` ocean shoreline from terrain).
 */
export function createWaterMaterial(options: WaterMaterialOptions = {}): WaterMaterialBundle {
	const w = planetConfig.water;
	const foam = w.foam;
	const uniforms: WaterUniforms = {
		uDeepColor: { value: new Color(options.deepColor ?? w.deepColor) },
		uShallowColor: { value: new Color(options.shallowColor ?? w.shallowColor) },
		uSpecularColor: { value: new Color(options.specularColor ?? w.specularColor) },
		uFoamColor: { value: new Color(options.foamColor ?? foam.color) },
		uLightDir: { value: [0.55, 0.7, 0.45] },
		uTime: { value: 0 },
		uFresnelPower: { value: options.fresnelPower ?? w.fresnelPower },
		uFresnelBias: { value: options.fresnelBias ?? w.fresnelBias },
		uOpacity: { value: options.opacity ?? w.opacity },
		uSpecularStrength: { value: options.specularStrength ?? w.specularStrength },
		uSpecularPower: { value: options.specularPower ?? w.specularPower },
		uWaveStrength: { value: options.waveStrength ?? w.waveStrength },
		uWaveSpeed: { value: options.waveSpeed ?? w.waveSpeed },
		uWaveScale: { value: options.waveScale ?? w.waveScale },
		uDepthMix: { value: options.depthMix ?? w.depthMix },
		uFoamStrength: { value: options.foamStrength ?? foam.strength },
		uFoamWidth: { value: options.foamWidth ?? foam.width },
		uFoamSpeed: { value: options.foamSpeed ?? foam.speed },
		uFoamNoiseScale: { value: options.foamNoiseScale ?? foam.noiseScale },
		uOceanFoam: { value: options.oceanFoam ?? foam.oceanCoast }
	};

	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms,
		vertexShader: /* glsl */ `
			attribute float aEdge;
			attribute float aCoast;

			varying vec3 vWorldPos;
			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vLocalPos;
			varying float vEdge;
			varying float vCoast;

			void main() {
				vec4 world = modelMatrix * vec4(position, 1.0);
				vWorldPos = world.xyz;
				vLocalPos = position;
				vWorldNormal = normalize(mat3(modelMatrix) * normal);
				vViewDir = normalize(cameraPosition - world.xyz);
				vEdge = aEdge;
				vCoast = aCoast;
				gl_Position = projectionMatrix * viewMatrix * world;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uDeepColor;
			uniform vec3 uShallowColor;
			uniform vec3 uSpecularColor;
			uniform vec3 uFoamColor;
			uniform vec3 uLightDir;
			uniform float uTime;
			uniform float uFresnelPower;
			uniform float uFresnelBias;
			uniform float uOpacity;
			uniform float uSpecularStrength;
			uniform float uSpecularPower;
			uniform float uWaveStrength;
			uniform float uWaveSpeed;
			uniform float uWaveScale;
			uniform float uDepthMix;
			uniform float uFoamStrength;
			uniform float uFoamWidth;
			uniform float uFoamSpeed;
			uniform float uFoamNoiseScale;
			uniform float uOceanFoam;

			varying vec3 vWorldPos;
			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vLocalPos;
			varying float vEdge;
			varying float vCoast;

			void main() {
				vec3 N = normalize(vWorldNormal);
				vec3 V = normalize(vViewDir);
				vec3 L = normalize(uLightDir);

				// Subtle procedural normal perturbation (keeps faceted lighting readable).
				float t = uTime * uWaveSpeed;
				vec3 lp = normalize(vLocalPos);
				float n1 = sin(lp.x * uWaveScale + t) * cos(lp.z * uWaveScale * 0.85 - t * 0.7);
				float n2 = cos(lp.y * uWaveScale * 1.1 - t * 0.9) * sin(lp.z * uWaveScale + t * 0.5);
				vec3 tangentPerturb = normalize(cross(N, vec3(0.0, 1.0, 0.0) + lp * 0.01));
				vec3 bitangent = normalize(cross(N, tangentPerturb));
				N = normalize(N + (tangentPerturb * n1 + bitangent * n2) * uWaveStrength);

				float ndotv = clamp(dot(N, V), 0.0, 1.0);
				float fresnel = uFresnelBias + (1.0 - uFresnelBias) * pow(1.0 - ndotv, uFresnelPower);

				// Latitude / facing shallow mix for coastal readability.
				float facing = pow(ndotv, 1.4);
				float depthHint = mix(1.0, facing, uDepthMix);
				vec3 base = mix(uDeepColor, uShallowColor, depthHint);

				float ndotl = max(dot(N, L), 0.0);
				vec3 H = normalize(L + V);
				float spec = pow(max(dot(N, H), 0.0), uSpecularPower) * uSpecularStrength * ndotl;

				vec3 color = base * (0.45 + 0.55 * ndotl) + uSpecularColor * spec;

				// Shore foam: inland uses aEdge; ocean uses terrain-derived aCoast.
				float foamPulse = 0.55 + 0.45 * sin(
					lp.x * uFoamNoiseScale + lp.z * uFoamNoiseScale * 0.7 + uTime * uFoamSpeed
				);
				foamPulse *= 0.7 + 0.3 * cos(
					lp.y * uFoamNoiseScale * 1.15 - uTime * uFoamSpeed * 0.85
				);
				float edgeFoam = pow(clamp(vEdge, 0.0, 1.0), uFoamWidth);
				float coastFoam = pow(clamp(vCoast, 0.0, 1.0), max(uFoamWidth * 0.85, 1.0)) * uOceanFoam;
				float foamMask = max(edgeFoam, coastFoam) * foamPulse * uFoamStrength;
				foamMask = clamp(foamMask, 0.0, 0.88);

				color = mix(color, uFoamColor, foamMask);

				// More opaque toward the limb so grazing ocean doesn't punch a hole through to space;
				// atmosphere haze then wraps outside that silhouette. Foam also seals transparent edges.
				float limbSolid = pow(1.0 - ndotv, 1.6);
				float alpha = clamp(
					uOpacity * (0.62 + 0.28 * fresnel) + limbSolid * 0.32 + foamMask * 0.4,
					0.0,
					0.98
				);

				gl_FragColor = vec4(color, alpha);
			}
		`
	});

	// Defaults when a mesh omits these buffers (ocean has aCoast; inland has aEdge).
	// Three's typings only list color/uv/uv1; ShaderMaterial accepts custom defaults at runtime.
	const defaults = material.defaultAttributeValues as typeof material.defaultAttributeValues & {
		aEdge: [number];
		aCoast: [number];
	};
	defaults.aEdge = [0];
	defaults.aCoast = [0];

	return {
		material,
		uniforms,
		update: (elapsedSeconds, lightDir) => {
			uniforms.uTime.value = elapsedSeconds;
			uniforms.uLightDir.value = lightDir;
		},
		dispose: () => material.dispose()
	};
}

/** Preset for inland lakes — calm and matte. */
export function createLakeWaterMaterial(): WaterMaterialBundle {
	const lake = planetConfig.water.lake;
	return createWaterMaterial({
		deepColor: lake.deepColor,
		shallowColor: lake.shallowColor,
		opacity: lake.opacity,
		waveScale: lake.waveScale,
		waveStrength: lake.waveStrength,
		waveSpeed: lake.waveSpeed,
		specularStrength: lake.specularStrength,
		specularPower: lake.specularPower,
		fresnelPower: lake.fresnelPower,
		fresnelBias: lake.fresnelBias,
		foamStrength: lake.foamStrength,
		foamWidth: lake.foamWidth,
		oceanFoam: 0
	});
}

/** Preset for rivers — subtle ripples, restrained gloss. */
export function createRiverWaterMaterial(): WaterMaterialBundle {
	const river = planetConfig.water.river;
	return createWaterMaterial({
		deepColor: river.deepColor,
		shallowColor: river.shallowColor,
		opacity: river.opacity,
		waveScale: river.waveScale,
		waveStrength: river.waveStrength,
		waveSpeed: river.waveSpeed,
		specularStrength: river.specularStrength,
		specularPower: river.specularPower,
		fresnelPower: river.fresnelPower,
		fresnelBias: river.fresnelBias,
		foamStrength: river.foamStrength,
		foamWidth: river.foamWidth,
		oceanFoam: 0
	});
}
