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
	import { planetConfig, randomSeaLevel } from '$lib/planet/planetConfig';

	let {
		variant = 'backdrop'
	}: {
		variant?: 'backdrop' | 'page';
	} = $props();

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
		let cancelled = false;
		let idleHandle: number | null = null;
		let deferTimer: ReturnType<typeof setTimeout> | null = null;

		let frame = 0;
		let running = true;
		let visible = !document.hidden;

		const renderFrame = () => {
			renderer.render(scene, camera);
		};

		// Mobile browsers change the visual viewport as chrome shows/hides while
		// position:fixed + inset:0 still tracks the layout viewport — pin the
		// canvas to visualViewport so the planet stays centered while scrolling.
		let lastW = 0;
		let lastH = 0;
		const resize = () => {
			const vv = window.visualViewport;
			const w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
			const h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
			const top = Math.round(vv?.offsetTop ?? 0);
			const left = Math.round(vv?.offsetLeft ?? 0);

			host.style.top = `${top}px`;
			host.style.left = `${left}px`;
			host.style.width = `${w}px`;
			host.style.height = `${h}px`;

			if (w === lastW && h === lastH) return;
			lastW = w;
			lastH = h;
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

		const startAnimation = () => {
			if (!running || cancelled || !planetGroup) return;
			if (!reducedMotion) {
				clock.start();
				tick();
			} else {
				updatePlanet(0, lightDirTuple);
				renderFrame();
			}
		};

		const buildPlanet = async () => {
			const { generatePlanet } = await import('$lib/planet/generatePlanet');
			if (cancelled) return;

			try {
				const generated = generatePlanet({
					detail: cfg.detail,
					radius: cfg.radius,
					maxDisplacement: cfg.maxDisplacement,
					seaLevel: randomSeaLevel(),
					objectDensity: cfg.objectDensity
				});
				if (cancelled) {
					generated.dispose();
					return;
				}
				disposePlanet = generated.dispose;
				updatePlanet = generated.update;
				planetGroup = generated.group;
				planetGroup.rotation.z = (sceneCfg.tiltZDeg * Math.PI) / 180;
				planetGroup.rotation.x = sceneCfg.tiltX;
				planetGroup.position.set(sceneCfg.position.x, sceneCfg.position.y, sceneCfg.position.z);
				planetGroup.scale.setScalar(sceneCfg.scale);
				scene.add(planetGroup);
				updatePlanet(0, lightDirTuple);
				renderFrame();
				startAnimation();
			} catch (err) {
				console.error('Planet generation failed:', err);
			}
		};

		const scheduleGeneration = () => {
			const run = () => {
				idleHandle = null;
				deferTimer = null;
				void buildPlanet();
			};
			const ric = (
				window as Window & {
					requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
				}
			).requestIdleCallback;
			if (typeof ric === 'function') {
				idleHandle = ric(run, { timeout: 1200 });
			} else {
				deferTimer = setTimeout(run, 0);
			}
		};

		resize();
		requestAnimationFrame(resize);
		// Double rAF: let the browser paint page content before the heavy generator runs.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (!cancelled) scheduleGeneration();
			});
		});

		const vv = window.visualViewport;
		vv?.addEventListener('resize', resize);
		vv?.addEventListener('scroll', resize);
		window.addEventListener('resize', resize);
		window.addEventListener('orientationchange', resize);
		window.addEventListener('visibilitychange', onVisibility);

		return () => {
			cancelled = true;
			running = false;
			cancelAnimationFrame(frame);
			if (idleHandle !== null) {
				const cic = (window as Window & { cancelIdleCallback?: (id: number) => void })
					.cancelIdleCallback;
				if (typeof cic === 'function') cic(idleHandle);
			}
			if (deferTimer !== null) clearTimeout(deferTimer);
			vv?.removeEventListener('resize', resize);
			vv?.removeEventListener('scroll', resize);
			window.removeEventListener('resize', resize);
			window.removeEventListener('orientationchange', resize);
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
	class:planet-backdrop--page={variant === 'page'}
	aria-hidden={variant !== 'page'}
	role={variant === 'page' ? 'img' : undefined}
	aria-label={variant === 'page' ? 'Procedural planet' : undefined}
	style="--planet-opacity-desktop: {sceneCfg.backdropOpacity
		.desktop}; --planet-opacity-mobile: {sceneCfg.backdropOpacity.mobile};"
></div>

<style>
	.planet-backdrop {
		pointer-events: none;
		position: fixed;
		top: 0;
		left: 0;
		/* Fallback before JS measures visualViewport; dvh tracks mobile chrome. */
		width: 100%;
		height: 100vh;
		height: 100dvh;
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
		.planet-backdrop:not(.planet-backdrop--page) {
			opacity: var(--planet-opacity-mobile, 0.5);
		}
	}

	.planet-backdrop--page {
		opacity: 1;
	}
</style>
