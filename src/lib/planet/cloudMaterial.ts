import {
	AddEquation,
	Color,
	CustomBlending,
	FrontSide,
	OneFactor,
	OneMinusSrcAlphaFactor,
	ShaderMaterial,
	type IUniform
} from 'three';
import { planetConfig } from './planetConfig';

export type CloudUniforms = {
	uCloudColor: IUniform<Color>;
	uShadowColor: IUniform<Color>;
	uLightDir: IUniform<[number, number, number]>;
	uTime: IUniform<number>;
	uOpacity: IUniform<number>;
	uCoverage: IUniform<number>;
	uSoftness: IUniform<number>;
	uNoiseScale: IUniform<number>;
	uDriftSpeed: IUniform<number>;
	uRotation: IUniform<number>;
	uSunLit: IUniform<number>;
	uNightAttenuation: IUniform<number>;
	uFaceDensity: IUniform<number>;
	uFluffiness: IUniform<number>;
	uPatchScale: IUniform<number>;
	uSeed: IUniform<number>;
};

export type CloudMaterialBundle = {
	material: ShaderMaterial;
	uniforms: CloudUniforms;
	update: (elapsedSeconds: number, lightDir: [number, number, number]) => void;
	dispose: () => void;
};

/**
 * Sparse procedural cloud shell — discrete fluffy patches, not a thin veil.
 * Premultiplied alpha + depthWrite false to stack with atmosphere.
 */
export function createCloudMaterial(seed: number = 1): CloudMaterialBundle {
	const c = planetConfig.clouds;
	const uniforms: CloudUniforms = {
		uCloudColor: { value: new Color(c.color) },
		uShadowColor: { value: new Color(c.shadowColor) },
		uLightDir: { value: [0.55, 0.7, 0.45] },
		uTime: { value: 0 },
		uOpacity: { value: c.opacity },
		uCoverage: { value: c.coverage },
		uSoftness: { value: c.softness },
		uNoiseScale: { value: c.noiseScale },
		uDriftSpeed: { value: c.driftSpeed },
		uRotation: { value: 0 },
		uSunLit: { value: c.sunLit },
		uNightAttenuation: { value: c.nightAttenuation },
		uFaceDensity: { value: c.faceDensity },
		uFluffiness: { value: c.fluffiness },
		uPatchScale: { value: c.patchScale },
		uSeed: { value: (seed >>> 0) / 4294967296 }
	};

	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		depthTest: true,
		// Front faces only — DoubleSide on a transparent shell fights the depth buffer.
		side: FrontSide,
		blending: CustomBlending,
		blendEquation: AddEquation,
		blendSrc: OneFactor,
		blendDst: OneMinusSrcAlphaFactor,
		blendSrcAlpha: OneFactor,
		blendDstAlpha: OneMinusSrcAlphaFactor,
		uniforms,
		vertexShader: /* glsl */ `
			varying vec3 vWorldNormal;
			varying vec3 vLocalDir;
			varying vec3 vViewDir;

			void main() {
				vec4 world = modelMatrix * vec4(position, 1.0);
				// Object-space direction so the pattern co-rotates with the planet mesh.
				vLocalDir = normalize(position);
				vWorldNormal = normalize(mat3(modelMatrix) * normal);
				vViewDir = normalize(cameraPosition - world.xyz);
				gl_Position = projectionMatrix * viewMatrix * world;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uCloudColor;
			uniform vec3 uShadowColor;
			uniform vec3 uLightDir;
			uniform float uTime;
			uniform float uOpacity;
			uniform float uCoverage;
			uniform float uSoftness;
			uniform float uNoiseScale;
			uniform float uDriftSpeed;
			uniform float uRotation;
			uniform float uSunLit;
			uniform float uNightAttenuation;
			uniform float uFaceDensity;
			uniform float uFluffiness;
			uniform float uPatchScale;
			uniform float uSeed;

			varying vec3 vWorldNormal;
			varying vec3 vLocalDir;
			varying vec3 vViewDir;

			float hash31(vec3 p) {
				p = fract(p * 0.1031 + uSeed);
				p += dot(p, p.yzx + 33.33);
				return fract((p.x + p.y) * p.z);
			}

			float valueNoise(vec3 p) {
				vec3 i = floor(p);
				vec3 f = fract(p);
				// Quintic for softer, puffier interpolation.
				f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
				float n000 = hash31(i);
				float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
				float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
				float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
				float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
				float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
				float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
				float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
				float nx00 = mix(n000, n100, f.x);
				float nx10 = mix(n010, n110, f.x);
				float nx01 = mix(n001, n101, f.x);
				float nx11 = mix(n011, n111, f.x);
				float nxy0 = mix(nx00, nx10, f.y);
				float nxy1 = mix(nx01, nx11, f.y);
				return mix(nxy0, nxy1, f.z);
			}

			float fbm(vec3 p) {
				float sum = 0.0;
				float amp = 0.5;
				float freq = 1.0;
				for (int i = 0; i < 5; i++) {
					sum += amp * valueNoise(p * freq);
					freq *= 2.12;
					amp *= 0.5;
				}
				return sum;
			}

			// Billowy / cauliflower fluff from inverted absolute noise.
			float billowFbm(vec3 p) {
				float sum = 0.0;
				float amp = 0.5;
				float freq = 1.0;
				for (int i = 0; i < 4; i++) {
					float n = valueNoise(p * freq);
					n = 1.0 - abs(n * 2.0 - 1.0);
					n = n * n;
					sum += amp * n;
					freq *= 2.05;
					amp *= 0.52;
				}
				return sum;
			}

			vec3 rotateAroundY(vec3 p, float angle) {
				float c = cos(angle);
				float s = sin(angle);
				return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
			}

			void main() {
				vec3 N = normalize(vWorldNormal);
				vec3 V = normalize(vViewDir);
				vec3 L = normalize(uLightDir);
				// Sample in object space (co-rotates with terrain), then spin the
				// pattern for relative wind drift. World-space sampling looked like
				// reverse rotation / depth fighting as the planet spun through a fixed field.
				vec3 dir = rotateAroundY(normalize(vLocalDir), uRotation);

				float limb = clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0);
				float faceOn = 1.0 - limb;
				float day = mix(uNightAttenuation, 1.0, clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0));

				vec3 drift = vec3(
					uTime * uDriftSpeed,
					uTime * uDriftSpeed * 0.41,
					-uTime * uDriftSpeed * 0.27
				);

				// Domain warp so patch shapes look organic, not grid-locked.
				vec3 warpSample = dir * (uPatchScale * 1.6) + drift * 0.45;
				vec3 warp = vec3(
					fbm(warpSample),
					fbm(warpSample + vec3(17.1, 3.4, 9.2)),
					fbm(warpSample + vec3(5.7, 22.3, 1.8))
				);
				warp = (warp - 0.5) * 0.55;

				// Large-scale banks: only peaks become discrete cloud spots.
				float banks = fbm(dir * uPatchScale + warp * 0.35 + drift * 0.25);
				float soft = max(uSoftness, 0.02);
				// High coverage threshold → clear sky between patches.
				float bankMask = smoothstep(uCoverage, min(1.0, uCoverage + soft), banks);
				bankMask = pow(bankMask, 1.35);

				// Early out for empty sky (keeps the surface fully visible).
				if (bankMask < 0.008) {
					gl_FragColor = vec4(0.0);
					return;
				}

				// Fine fluffy structure inside each bank.
				vec3 fluffPos = dir * uNoiseScale + warp * uFluffiness + drift;
				float fluff = billowFbm(fluffPos);
				float detail = fbm(fluffPos * 1.85 + vec3(4.2, 1.1, 8.7));
				fluff = mix(fluff, fluff * detail, 0.45);
				fluff = pow(clamp(fluff, 0.0, 1.0), mix(1.4, 0.75, uFluffiness));

				// Soft cotton edges: dense core, feathered rim.
				float core = smoothstep(0.28, 0.72, fluff);
				float density = bankMask * mix(fluff * 0.55, core, 0.65);
				density *= mix(1.0, uFaceDensity, faceOn);
				// Slight limb lift so patches silhouette against space.
				density *= 0.82 + 0.28 * limb;

				// Internal shading so puffs read as volume, not flat tint.
				float lit = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
				float puffShade = mix(0.55, 1.0, core) * mix(0.5, 1.0, lit * uSunLit);
				vec3 col = mix(uShadowColor, uCloudColor, puffShade);

				float alpha = clamp(density * uOpacity * day, 0.0, 0.72);
				gl_FragColor = vec4(col * alpha, alpha);
			}
		`
	});

	return {
		material,
		uniforms,
		update: (elapsedSeconds, lightDir) => {
			uniforms.uTime.value = elapsedSeconds;
			uniforms.uRotation.value = elapsedSeconds * c.rotationSpeed;
			uniforms.uLightDir.value = lightDir;
		},
		dispose: () => material.dispose()
	};
}
