import { BackSide, Color, ShaderMaterial, type IUniform } from 'three';
import { planetConfig } from './planetConfig';

export type AtmosphereUniforms = {
	uRayleighColor: IUniform<Color>;
	uMieColor: IUniform<Color>;
	uLightDir: IUniform<[number, number, number]>;
	uIntensity: IUniform<number>;
	uFalloffPower: IUniform<number>;
	uSunScatter: IUniform<number>;
	uMieStrength: IUniform<number>;
	uMiePower: IUniform<number>;
	uNightAttenuation: IUniform<number>;
};

export type AtmosphereMaterialBundle = {
	material: ShaderMaterial;
	uniforms: AtmosphereUniforms;
	update: (lightDir: [number, number, number]) => void;
	dispose: () => void;
};

/**
 * Back-face atmosphere shell with Rayleigh rim + soft Mie sun glow.
 * Sized to wrap terrain peaks; night side is attenuated for realism.
 */
export function createAtmosphereMaterial(): AtmosphereMaterialBundle {
	const a = planetConfig.atmosphere;
	const uniforms: AtmosphereUniforms = {
		uRayleighColor: { value: new Color(a.rayleighColor) },
		uMieColor: { value: new Color(a.mieColor) },
		uLightDir: { value: [0.55, 0.7, 0.45] },
		uIntensity: { value: a.intensity },
		uFalloffPower: { value: a.falloffPower },
		uSunScatter: { value: a.sunScatter },
		uMieStrength: { value: a.mieStrength },
		uMiePower: { value: a.miePower },
		uNightAttenuation: { value: a.nightAttenuation }
	};

	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		side: BackSide,
		uniforms,
		vertexShader: /* glsl */ `
			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vWorldPos;

			void main() {
				vec4 world = modelMatrix * vec4(position, 1.0);
				vWorldPos = world.xyz;
				vWorldNormal = normalize(mat3(modelMatrix) * normal);
				vViewDir = normalize(cameraPosition - world.xyz);
				gl_Position = projectionMatrix * viewMatrix * world;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uRayleighColor;
			uniform vec3 uMieColor;
			uniform vec3 uLightDir;
			uniform float uIntensity;
			uniform float uFalloffPower;
			uniform float uSunScatter;
			uniform float uMieStrength;
			uniform float uMiePower;
			uniform float uNightAttenuation;

			varying vec3 vWorldNormal;
			varying vec3 vViewDir;
			varying vec3 vWorldPos;

			void main() {
				// BackSide: flip so we treat outward normals for rim math.
				vec3 N = normalize(-vWorldNormal);
				vec3 V = normalize(vViewDir);
				vec3 L = normalize(uLightDir);

				float ndotv = clamp(dot(N, V), 0.0, 1.0);
				float rim = pow(1.0 - ndotv, uFalloffPower);

				float sunFacing = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
				float dayFactor = mix(uNightAttenuation, 1.0, sunFacing);

				// Soft forward scatter toward the sun limb.
				float mie = pow(max(dot(V, L), 0.0), uMiePower) * uMieStrength;

				vec3 rayleigh = uRayleighColor * rim * (0.55 + uSunScatter * sunFacing);
				vec3 mieGlow = uMieColor * mie * rim;
				vec3 color = (rayleigh + mieGlow) * uIntensity * dayFactor;
				float alpha = clamp(rim * uIntensity * dayFactor, 0.0, 0.85);

				gl_FragColor = vec4(color, alpha);
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
