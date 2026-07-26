<script lang="ts">
	import { onMount } from 'svelte';
	import {
		AmbientLight,
		Clock,
		DirectionalLight,
		Group,
		PerspectiveCamera,
		Scene,
		Vector3,
		WebGLRenderer
	} from 'three';
	import { generatePlanet } from '$lib/planet/generatePlanet';
	import { planetConfig, randomSeaLevel } from '$lib/planet/planetConfig';

	let container: HTMLDivElement | undefined = $state();

	const cfg = planetConfig;
	const sceneCfg = cfg.scene;

	onMount(() => {
		if (!container) return;

		// Escape transformed ancestors (e.g. main.motion-fade-up) so fixed covers the viewport
		const host = container;
		document.body.appendChild(host);

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const scene = new Scene();
		const cam = sceneCfg.camera;
		const camera = new PerspectiveCamera(cam.fov, 1, cam.near, cam.far);
		camera.position.set(cam.position.x, cam.position.y, cam.position.z);
		camera.lookAt(cam.lookAt.x, cam.lookAt.y, cam.lookAt.z);

		const renderer = new WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance'
		});
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		host.appendChild(renderer.domElement);

		const lights = sceneCfg.lights;
		scene.add(new AmbientLight(lights.ambient.color, lights.ambient.intensity));
		const key = new DirectionalLight(lights.key.color, lights.key.intensity);
		key.position.set(...lights.key.position);
		scene.add(key);
		const fill = new DirectionalLight(lights.fill.color, lights.fill.intensity);
		fill.position.set(...lights.fill.position);
		scene.add(fill);
		const rim = new DirectionalLight(lights.rim.color, lights.rim.intensity);
		rim.position.set(...lights.rim.position);
		scene.add(rim);

		const lightDir = new Vector3(...lights.key.position).normalize();
		const lightDirTuple: [number, number, number] = [lightDir.x, lightDir.y, lightDir.z];
		const clock = new Clock(false);

		let planetGroup: Group | null = null;
		let updatePlanet: (elapsed: number, dir: [number, number, number]) => void = () => {};
		let disposePlanet: () => void = () => {};

		try {
			const generated = generatePlanet({
				detail: cfg.detail,
				radius: cfg.radius,
				maxDisplacement: cfg.maxDisplacement,
				seaLevel: randomSeaLevel(),
				objectDensity: cfg.objectDensity
			});
			disposePlanet = generated.dispose;
			updatePlanet = generated.update;
			planetGroup = generated.group;
			planetGroup.rotation.z = (sceneCfg.tiltZDeg * Math.PI) / 180;
			planetGroup.rotation.x = sceneCfg.tiltX;
			planetGroup.position.set(sceneCfg.position.x, sceneCfg.position.y, sceneCfg.position.z);
			planetGroup.scale.setScalar(sceneCfg.scale);
			scene.add(planetGroup);
			updatePlanet(0, lightDirTuple);
		} catch (err) {
			console.error('Planet generation failed:', err);
		}

		let frame = 0;
		let running = true;
		let visible = !document.hidden;

		const renderFrame = () => {
			renderer.render(scene, camera);
		};

		const resize = () => {
			const w = host.clientWidth;
			const h = host.clientHeight;
			if (w < 2 || h < 2) return;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h, false);
			camera.position.z = w / h < cam.portraitAspectBelow ? cam.portraitZ : cam.position.z;
			renderFrame();
		};

		const onVisibility = () => {
			visible = !document.hidden;
			if (visible) clock.start();
			else clock.stop();
		};

		const tick = () => {
			if (!running || reducedMotion) return;
			frame = requestAnimationFrame(tick);
			if (!visible) return;
			if (planetGroup) planetGroup.rotation.y += sceneCfg.spinSpeed;
			updatePlanet(clock.getElapsedTime(), lightDirTuple);
			renderFrame();
		};

		resize();
		requestAnimationFrame(resize);
		if (!reducedMotion && planetGroup) {
			clock.start();
			tick();
		} else {
			updatePlanet(0, lightDirTuple);
			renderFrame();
		}

		const ro = new ResizeObserver(resize);
		ro.observe(host);
		window.addEventListener('visibilitychange', onVisibility);

		return () => {
			running = false;
			cancelAnimationFrame(frame);
			ro.disconnect();
			window.removeEventListener('visibilitychange', onVisibility);
			disposePlanet();
			renderer.dispose();
			if (renderer.domElement.parentElement === host) {
				host.removeChild(renderer.domElement);
			}
			host.remove();
		};
	});
</script>

<div
	bind:this={container}
	class="planet-backdrop"
	aria-hidden="true"
	style="--planet-opacity-desktop: {sceneCfg.backdropOpacity
		.desktop}; --planet-opacity-mobile: {sceneCfg.backdropOpacity.mobile};"
></div>

<style>
	.planet-backdrop {
		pointer-events: none;
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		opacity: var(--planet-opacity-desktop, 0.78);
	}

	.planet-backdrop :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	@media (max-width: 767px) {
		.planet-backdrop {
			opacity: var(--planet-opacity-mobile, 0.5);
		}
	}
</style>
