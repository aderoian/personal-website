import {
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	ConeGeometry,
	CylinderGeometry,
	Group,
	InstancedMesh,
	Matrix4,
	MeshLambertMaterial,
	Quaternion,
	Vector3
} from 'three';
import { createRng } from './noise';
import { planetConfig } from './planetConfig';

export type AircraftBundle = {
	group: Group;
	count: number;
	update: (elapsedSeconds: number) => void;
	dispose: () => void;
};

type PlaneRoute = {
	/** Unit pole of the great-circle plane (orbit axis). */
	axis: Vector3;
	/** Starting unit position on the orbit. */
	start: Vector3;
	/** Unit tangent at t=0 (velocity direction). */
	tangent: Vector3;
	altitude: number;
	speed: number;
	scale: number;
	phase: number;
};

const tmpPos = new Vector3();
const tmpFwd = new Vector3();
const tmpUp = new Vector3();
const tmpRight = new Vector3();
const tmpQuat = new Quaternion();
const tmpMat = new Matrix4();
const tmpScale = new Vector3();
const tmpRotated = new Vector3();
const tmpCross = new Vector3();

function mergeGeometries(
	geos: BufferGeometry[],
	colorsPerGeo: ReadonlyArray<readonly [number, number, number]>
): BufferGeometry {
	const positions: number[] = [];
	const normals: number[] = [];
	const colors: number[] = [];
	geos.forEach((g, gi) => {
		const nonIndexed = g.index ? g.toNonIndexed() : g;
		if (!nonIndexed.getAttribute('normal')) nonIndexed.computeVertexNormals();
		const pos = nonIndexed.getAttribute('position');
		const nor = nonIndexed.getAttribute('normal');
		const rgb = colorsPerGeo[gi] ?? [1, 1, 1];
		for (let i = 0; i < pos.count; i++) {
			positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
			normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
			colors.push(rgb[0], rgb[1], rgb[2]);
		}
		if (nonIndexed !== g) nonIndexed.dispose();
		g.dispose();
	});
	const merged = new BufferGeometry();
	merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	merged.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
	merged.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
	return merged;
}

/** Low-poly aircraft: fuselage + wings + tail, local +Z forward, +Y up. */
export function createPlaneGeometry(): BufferGeometry {
	const m = planetConfig.aircraft.mesh;
	const body = planetConfig.aircraft.bodyColor;
	const wing = planetConfig.aircraft.wingColor;
	const accent = planetConfig.aircraft.accentColor;

	const fuselage = new CylinderGeometry(m.fuselageR * 0.7, m.fuselageR, m.fuselageL, 5);
	fuselage.rotateX(Math.PI / 2);
	fuselage.translate(0, 0, 0);

	const nose = new ConeGeometry(m.fuselageR * 0.75, m.fuselageL * 0.28, 5);
	nose.rotateX(Math.PI / 2);
	nose.translate(0, 0, m.fuselageL * 0.55);

	const wings = new BoxGeometry(m.wingSpan, m.wingThick, m.wingChord);
	wings.translate(0, 0, 0.002);

	const tail = new BoxGeometry(m.tailSpan, m.wingThick, m.tailChord);
	tail.translate(0, 0, -m.fuselageL * 0.38);

	const fin = new BoxGeometry(m.wingThick, m.finH, m.finChord);
	fin.translate(0, m.finH * 0.45, -m.fuselageL * 0.36);

	return mergeGeometries([fuselage, nose, wings, tail, fin], [body, accent, wing, wing, accent]);
}

function randomUnit(rng: () => number): Vector3 {
	// Marsaglia method on sphere.
	let x = 0;
	let y = 0;
	let s = 2;
	while (s >= 1 || s === 0) {
		x = rng() * 2 - 1;
		y = rng() * 2 - 1;
		s = x * x + y * y;
	}
	const z = 1 - 2 * s;
	const f = 2 * Math.sqrt(1 - s);
	return new Vector3(x * f, y * f, z).normalize();
}

function buildRoutes(count: number, radius: number, rng: () => number): PlaneRoute[] {
	const a = planetConfig.aircraft;
	const routes: PlaneRoute[] = [];
	for (let i = 0; i < count; i++) {
		const start = randomUnit(rng);
		let axis = randomUnit(rng);
		// Ensure axis is not nearly parallel to start.
		if (Math.abs(axis.dot(start)) > 0.92) {
			axis = new Vector3(-start.y, start.z, start.x).normalize();
		}
		// Project axis orthogonal to start for a clean great-circle pole, then nudge.
		const tangent = new Vector3().crossVectors(axis, start).normalize();
		if (tangent.lengthSq() < 1e-6) {
			tangent.set(-start.z, 0, start.x).normalize();
		}
		const orbitAxis = new Vector3().crossVectors(start, tangent).normalize();
		routes.push({
			axis: orbitAxis,
			start: start.clone(),
			tangent: tangent.clone(),
			altitude: radius + a.altitude + rng() * a.altitudeJitter,
			speed: a.orbitSpeed + rng() * a.orbitSpeedJitter,
			scale: a.scale.min + rng() * a.scale.range,
			phase: rng() * Math.PI * 2
		});
	}
	return routes;
}

/**
 * Seeded fleet of planes on deterministic great-circle routes.
 * Transforms are pure functions of elapsed time (static at t=0 for reduced motion).
 */
export function createAircraft(
	planetRadius: number,
	seed: number,
	count: number = planetConfig.aircraft.count
): AircraftBundle {
	const rng = createRng(seed ^ planetConfig.aircraft.seedXor);
	const routes = buildRoutes(Math.max(0, count), planetRadius, rng);
	const group = new Group();
	group.name = 'planet:aircraft';

	if (routes.length === 0) {
		return {
			group,
			count: 0,
			update: () => {},
			dispose: () => {}
		};
	}

	const geo = createPlaneGeometry();
	const mat = new MeshLambertMaterial({
		vertexColors: true,
		flatShading: true
	});
	const mesh = new InstancedMesh(geo, mat, routes.length);
	mesh.name = 'planet:planes';
	mesh.frustumCulled = false;
	group.add(mesh);

	const applyRoutes = (elapsedSeconds: number) => {
		for (let i = 0; i < routes.length; i++) {
			const r = routes[i];
			const angle = r.phase + elapsedSeconds * r.speed;
			// Rodrigues rotation of start around axis by angle.
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			tmpRotated
				.copy(r.start)
				.multiplyScalar(cos)
				.addScaledVector(tmpCross.crossVectors(r.axis, r.start), sin)
				.addScaledVector(r.axis, r.axis.dot(r.start) * (1 - cos));
			tmpPos.copy(tmpRotated).normalize().multiplyScalar(r.altitude);

			// Forward = d/dt of position on the circle ≈ axis × position.
			tmpFwd.crossVectors(r.axis, tmpRotated).normalize();
			tmpUp.copy(tmpPos).normalize();
			tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
			tmpFwd.crossVectors(tmpRight, tmpUp).normalize();

			// Basis: +X right, +Y up (radial), +Z forward.
			tmpMat.makeBasis(tmpRight, tmpUp, tmpFwd);
			tmpQuat.setFromRotationMatrix(tmpMat);
			tmpScale.set(r.scale, r.scale, r.scale);
			tmpMat.compose(tmpPos, tmpQuat, tmpScale);
			mesh.setMatrixAt(i, tmpMat);
		}
		mesh.instanceMatrix.needsUpdate = true;
	};

	applyRoutes(0);

	return {
		group,
		count: routes.length,
		update: applyRoutes,
		dispose: () => {
			group.remove(mesh);
			geo.dispose();
			mat.dispose();
		}
	};
}
