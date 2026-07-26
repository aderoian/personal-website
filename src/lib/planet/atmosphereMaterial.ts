import {
	AddEquation,
	BackSide,
	Color,
	CustomBlending,
	FrontSide,
	OneFactor,
	OneMinusSrcAlphaFactor,
	ShaderMaterial,
	type IUniform
} from 'three';
import { planetConfig } from './planetConfig';

export type AtmosphereUniforms = {
	uRayleighColor: IUniform<Color>;
	uMieColor: IUniform<Color>;
	uHazeColor: IUniform<Color>;
	uLightDir: IUniform<[number, number, number]>;
	uIntensity: IUniform<number>;
	uFalloffPower: IUniform<number>;
	uHazeStrength: IUniform<number>;
	uHazePower: IUniform<number>;
	uSunScatter: IUniform<number>;
	uMieStrength: IUniform<number>;
	uMiePower: IUniform<number>;
	uNightAttenuation: IUniform<number>;
	uBlendStart: IUniform<number>;
	uBlendEnd: IUniform<number>;
};

export type AtmosphereMaterialBundle = {
	material: ShaderMaterial;
	uniforms: AtmosphereUniforms;
	update: (lightDir: [number, number, number]) => void;
	dispose: () => void;
};

function createAtmosphereUniforms(): AtmosphereUniforms {
	const a = planetConfig.atmosphere;
	return {
		uRayleighColor: { value: new Color(a.rayleighColor) },
		uMieColor: { value: new Color(a.mieColor) },
		uHazeColor: { value: new Color(a.hazeColor) },
		uLightDir: { value: [0.55, 0.7, 0.45] },
		uIntensity: { value: a.intensity },
		uFalloffPower: { value: a.falloffPower },
		uHazeStrength: { value: a.hazeStrength },
		uHazePower: { value: a.hazePower },
		uSunScatter: { value: a.sunScatter },
		uMieStrength: { value: a.mieStrength },
		uMiePower: { value: a.miePower },
		uNightAttenuation: { value: a.nightAttenuation },
		uBlendStart: { value: a.blendStart },
		uBlendEnd: { value: a.blendEnd }
	};
}

/** Premultiplied-alpha compositing so inner + outer shells stack without hot bands. */
function atmosphereBlending() {
	return {
		transparent: true,
		depthWrite: false,
		blending: CustomBlending,
		blendEquation: AddEquation,
		blendSrc: OneFactor,
		blendDst: OneMinusSrcAlphaFactor,
		blendSrcAlpha: OneFactor,
		blendDstAlpha: OneMinusSrcAlphaFactor
	} as const;
}

const ATMOSPHERE_VERTEX = /* glsl */ `
	varying vec3 vWorldNormal;
	varying vec3 vViewDir;

	void main() {
		vec4 world = modelMatrix * vec4(position, 1.0);
		vWorldNormal = normalize(mat3(modelMatrix) * normal);
		vViewDir = normalize(cameraPosition - world.xyz);
		gl_Position = projectionMatrix * viewMatrix * world;
	}
`;

const SHARED_ATMOSPHERE_HELPERS = /* glsl */ `
	uniform vec3 uRayleighColor;
	uniform vec3 uMieColor;
	uniform vec3 uHazeColor;
	uniform vec3 uLightDir;
	uniform float uIntensity;
	uniform float uFalloffPower;
	uniform float uHazeStrength;
	uniform float uHazePower;
	uniform float uSunScatter;
	uniform float uMieStrength;
	uniform float uMiePower;
	uniform float uNightAttenuation;
	uniform float uBlendStart;
	uniform float uBlendEnd;

	varying vec3 vWorldNormal;
	varying vec3 vViewDir;

	float atmosphereLimb(vec3 N) {
		vec3 V = normalize(vViewDir);
		return clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0);
	}

	float atmosphereDay(vec3 N) {
		vec3 L = normalize(uLightDir);
		float sunFacing = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
		return mix(uNightAttenuation, 1.0, sunFacing);
	}

	// Smooth handoff weight in [0,1]: 0 = inner-dominated, 1 = outer-dominated.
	float outerBlendWeight(float limb) {
		return smoothstep(uBlendStart, uBlendEnd, limb);
	}
`;

/**
 * Outer BackSide shell: halo beyond the silhouette.
 * Density ramps up where the inner layer fades out (complementary blend).
 */
export function createAtmosphereMaterial(): AtmosphereMaterialBundle {
	const a = planetConfig.atmosphere;
	const uniforms = createAtmosphereUniforms();
	uniforms.uIntensity.value = a.intensity;
	uniforms.uFalloffPower.value = a.falloffPower;

	const material = new ShaderMaterial({
		...atmosphereBlending(),
		depthTest: true,
		side: BackSide,
		uniforms,
		vertexShader: ATMOSPHERE_VERTEX,
		fragmentShader: /* glsl */ `
			${SHARED_ATMOSPHERE_HELPERS}

			void main() {
				vec3 N = normalize(-vWorldNormal);
				vec3 V = normalize(vViewDir);
				vec3 L = normalize(uLightDir);

				float limb = atmosphereLimb(N);
				float day = atmosphereDay(N);
				float wOuter = outerBlendWeight(limb);

				float haze = pow(limb, uHazePower) * uHazeStrength;
				float rim = pow(limb, uFalloffPower);
				float mie = pow(max(dot(V, L), 0.0), uMiePower) * uMieStrength;

				float sunFacing = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
				vec3 rayleigh = uRayleighColor * rim * (0.4 + uSunScatter * sunFacing);
				vec3 hazeCol = uHazeColor * haze * (0.55 + 0.45 * sunFacing);
				vec3 mieGlow = uMieColor * mie * (rim * 0.7 + haze * 0.35);

				// Outer owns the far limb / halo; fade near face-on and mid-disk.
				float density = (haze * 0.75 + rim * 0.55) * wOuter;
				float alpha = clamp(density * uIntensity * day, 0.0, 0.92);
				vec3 color = (rayleigh + hazeCol + mieGlow) * uIntensity * day;

				gl_FragColor = vec4(color * alpha, alpha);
			}
		`
	});

	return {
		material,
		uniforms,
		update: (lightDir) => {
			uniforms.uLightDir.value = lightDir;
		},
		dispose: () => material.dispose()
	};
}

/**
 * Inner FrontSide shell: surface haze over oceans/land.
 * Density peaks mid-limb and fades where the outer halo takes over.
 */
export function createInnerAtmosphereMaterial(): AtmosphereMaterialBundle {
	const a = planetConfig.atmosphere;
	const uniforms = createAtmosphereUniforms();
	uniforms.uIntensity.value = a.innerIntensity;
	uniforms.uFalloffPower.value = a.innerFalloffPower;
	uniforms.uHazeStrength.value = a.innerHazeStrength;

	const material = new ShaderMaterial({
		...atmosphereBlending(),
		depthTest: true,
		side: FrontSide,
		uniforms,
		vertexShader: ATMOSPHERE_VERTEX,
		fragmentShader: /* glsl */ `
			${SHARED_ATMOSPHERE_HELPERS}

			void main() {
				vec3 N = normalize(vWorldNormal);
				vec3 L = normalize(uLightDir);

				float limb = atmosphereLimb(N);
				float day = atmosphereDay(N);
				float wOuter = outerBlendWeight(limb);
				float wInner = 1.0 - wOuter;

				float haze = pow(limb, uHazePower) * uHazeStrength;
				float rim = pow(limb, uFalloffPower);

				// Keep a soft face-on veil so water edges don't punch through,
				// but still concentrate toward the limb.
				float faceVeil = pow(limb, 0.65) * 0.22;
				float density = (haze * 0.85 + rim * 0.4 + faceVeil) * wInner;

				float sunFacing = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
				vec3 color =
					(uHazeColor * (haze + faceVeil) +
						uRayleighColor * rim * (0.35 + uSunScatter * 0.45 * sunFacing)) *
					uIntensity *
					day;

				float alpha = clamp(density * uIntensity * day, 0.0, 0.7);
				gl_FragColor = vec4(color * alpha, alpha);
			}
		`
	});

	return {
		material,
		uniforms,
		update: (lightDir) => {
			uniforms.uLightDir.value = lightDir;
		},
		dispose: () => material.dispose()
	};
}
