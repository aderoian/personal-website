import { Color, ShaderMaterial, type IUniform } from 'three';
import { planetConfig } from './planetConfig';

export type WaterUniforms = {
	uDeepColor: IUniform<Color>;
	uShallowColor: IUniform<Color>;
	uSpecularColor: IUniform<Color>;
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
};

export type WaterMaterialOptions = {
	deepColor?: string;
	shallowColor?: string;
	specularColor?: string;
	opacity?: number;
	waveStrength?: number;
	waveSpeed?: number;
	waveScale?: number;
	fresnelPower?: number;
	fresnelBias?: number;
	specularStrength?: number;
	specularPower?: number;
	depthMix?: number;
};

export type WaterMaterialBundle = {
	material: ShaderMaterial;
	uniforms: WaterUniforms;
	update: (elapsedSeconds: number, lightDir: [number, number, number]) => void;
	dispose: () => void;
};

/**
 * Grounded low-poly water: Fresnel rim, soft specular, subtle procedural normals.
 * Used for ocean sphere and inland lake/river face meshes.
 */
export function createWaterMaterial(options: WaterMaterialOptions = {}): WaterMaterialBundle {
	const w = planetConfig.water;
	const uniforms: WaterUniforms = {
		uDeepColor: { value: new Color(options.deepColor ?? w.deepColor) },
		uShallowColor: { value: new Color(options.shallowColor ?? w.shallowColor) },
		uSpecularColor: { value: new Color(options.specularColor ?? w.specularColor) },
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
		uDepthMix: { value: options.depthMix ?? w.depthMix }
	};

	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms,
		vertexShader: /* glsl */ `
			varying vec3 vWorldPos;
			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vLocalPos;

			void main() {
				vec4 world = modelMatrix * vec4(position, 1.0);
				vWorldPos = world.xyz;
				vLocalPos = position;
				vWorldNormal = normalize(mat3(modelMatrix) * normal);
				vViewDir = normalize(cameraPosition - world.xyz);
				gl_Position = projectionMatrix * viewMatrix * world;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uDeepColor;
			uniform vec3 uShallowColor;
			uniform vec3 uSpecularColor;
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

			varying vec3 vWorldPos;
			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vLocalPos;

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
				float alpha = clamp(uOpacity * (0.55 + 0.45 * fresnel), 0.0, 0.95);

				gl_FragColor = vec4(color, alpha);
			}
		`
	});

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

/** Preset for inland lakes. */
export function createLakeWaterMaterial(): WaterMaterialBundle {
	const lake = planetConfig.water.lake;
	return createWaterMaterial({
		deepColor: lake.deepColor,
		shallowColor: lake.shallowColor,
		opacity: lake.opacity,
		waveScale: lake.waveScale,
		waveStrength: lake.waveStrength,
		waveSpeed: lake.waveSpeed
	});
}

/** Preset for rivers (slightly faster, tighter ripples). */
export function createRiverWaterMaterial(): WaterMaterialBundle {
	const river = planetConfig.water.river;
	return createWaterMaterial({
		deepColor: river.deepColor,
		shallowColor: river.shallowColor,
		opacity: river.opacity,
		waveScale: river.waveScale,
		waveStrength: river.waveStrength,
		waveSpeed: river.waveSpeed
	});
}
