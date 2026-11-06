/**
 * The things that grow and lie about a river bank: lily pads in the still
 * water, bulrushes in the shallows, wildflowers in the grass, pebbles at the
 * water's edge, two weeping willows leaning over the river, and a fallen log
 * with a few mushrooms by the eddy pool.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { noise2, paintLook, smoothBlob } from "./glade-paint";

export type RiversideWorld = {
  scene: THREE.Scene;
  keep: <T extends { dispose: () => void }>(thing: T) => T;
  random: () => number;
  wind: { value: number };
  gust: { value: number };
  centre: THREE.Vector3;
  halfWidth: number;
  groundHeight: (x: number, z: number) => number;
  /** Distance to the nearest open water, as if to the river's centre line. */
  distanceToWater: (x: number, z: number) => number;
  /** A point on the river, `side` units across from its centre line. */
  riverPoint: (arc: number, side: number) => THREE.Vector3;
  arcAt: (z: number) => number;
  pool: { centre: THREE.Vector3; radius: number };
  /** Where the footbridge crosses, as an arc distance along the river. */
  bridgeArc: number;
};

export function addRiverside(world: RiversideWorld) {
  const { scene, keep, random, wind, gust, centre, halfWidth } = world;
  const between = (low: number, high: number) => low + random() * (high - low);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const place = new THREE.Vector3();
  const tint = new THREE.Color();
  const instanced: THREE.InstancedMesh[] = [];

  function painted(color: string | null, dapple: number, sway = 0, dappleScale = 1, extra: THREE.MeshLambertMaterialParameters = {}) {
    const material = keep(new THREE.MeshLambertMaterial({ ...(color ? { color: new THREE.Color(color) } : {}), ...extra }));
    paintLook(material, { wind, gust, strength: sway, dapple, dappleScale });
    return material;
  }

  function scatter(geometry: THREE.BufferGeometry, material: THREE.Material, count: number,
    pick: (index: number) => { at: THREE.Vector3; size: THREE.Vector3; turn?: number; tilt?: number; color?: string } | null) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    let placed = 0;
    for (let attempt = 0; attempt < count * 6 && placed < count; attempt += 1) {
      const spot = pick(attempt);
      if (!spot) continue;
      quaternion.setFromEuler(new THREE.Euler(spot.tilt ?? 0, spot.turn ?? random() * Math.PI * 2, (spot.tilt ?? 0) * 0.5));
      matrix.compose(spot.at, quaternion, spot.size);
      mesh.setMatrixAt(placed, matrix);
      if (spot.color) mesh.setColorAt(placed, tint.set(spot.color));
      placed += 1;
    }
    mesh.count = placed;
    scene.add(mesh);
    instanced.push(mesh);
    return mesh;
  }

  const nearGlade = (spread: number) => {
    place.set(centre.x + (random() - 0.5) * spread, 0, centre.z + (random() - 0.5) * spread);
    return place;
  };

  // --- Water lilies, as in Monet's pond: drifts of pads round the pool and all
  // about the water by the bridge, with pink, white and yellow flowers. The
  // middle of the river stays open for the rafts. -------------------------------------
  const padGeometry = keep(new THREE.CircleGeometry(0.55, 18, 0.35, Math.PI * 2 - 0.7));
  padGeometry.rotateX(-Math.PI / 2);
  const lilyPads: THREE.Vector3[] = [];
  type Drift = { at: THREE.Vector3; spread: number };
  const drifts: Drift[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = random() * Math.PI * 2;
    const ring = between(world.pool.radius * 0.35, world.pool.radius * 0.8);
    drifts.push({ at: new THREE.Vector3(world.pool.centre.x + Math.cos(angle) * ring, 0, world.pool.centre.z + Math.sin(angle) * ring), spread: 1.6 });
  }
  for (let index = 0; index < 16; index += 1) {
    const side = (index % 2 ? 1 : -1) * between(2.3, halfWidth - 0.7);
    drifts.push({ at: world.riverPoint(world.bridgeArc + between(-24, 24), side), spread: 1.4 });
  }
  for (let index = 0; index < 8; index += 1) {
    const side = (index % 2 ? 1 : -1) * between(2.6, halfWidth - 0.6);
    drifts.push({ at: world.riverPoint(world.arcAt(centre.z + between(-70, 70)), side), spread: 1.1 });
  }
  scatter(padGeometry, painted(null, 0.3, 0, 2, { side: THREE.DoubleSide }), 300, (index) => {
    const drift = drifts[index % drifts.length];
    const at = drift.at.clone().add(new THREE.Vector3(between(-1, 1) * drift.spread * 1.6, 0, between(-1, 1) * drift.spread * 1.6));
    // Keep to open water, off the banks.
    if (world.distanceToWater(at.x, at.z) > halfWidth - 0.4) return null;
    at.y = -0.27 + random() * 0.01;
    lilyPads.push(at.clone());
    const size = between(0.55, 1.35);
    return { at, size: new THREE.Vector3(size, 1, size), color: ["#5f7a3a", "#6d8442", "#536a33", "#7a8a45"][index % 4] };
  });
  // Flowers: an outer ring of petals and a smaller, paler inner cup.
  const petalRing = (count: number, length: number, tilt: number) => {
    const parts = Array.from({ length: count }, (_, petal) => {
      const part = new THREE.ConeGeometry(length * 0.32, length, 4);
      part.rotateZ(tilt);
      part.rotateY((petal / count) * Math.PI * 2);
      part.translate(0, length * 0.25, 0);
      return part;
    });
    const merged = keep(mergeGeometries(parts));
    parts.forEach((part) => part.dispose());
    return merged;
  };
  const outerPetals = petalRing(8, 0.24, 1.15);
  const innerPetals = petalRing(6, 0.16, 0.55);
  const bloomColours = ["#e8a7b8", "#f3ede0", "#e8a7b8", "#efd77a", "#d27f97", "#f3ede0"];
  const blooms = lilyPads.filter((_, index) => index % 4 === 1).slice(0, 80);
  scatter(outerPetals, painted(null, 0.12), blooms.length, (index) => {
    const at = blooms[index];
    return at ? { at: at.clone().setY(-0.24), size: new THREE.Vector3(1.3, 1.1, 1.3), color: bloomColours[index % bloomColours.length] } : null;
  });
  scatter(innerPetals, painted(null, 0.1), blooms.length, (index) => {
    const at = blooms[index];
    return at ? { at: at.clone().setY(-0.2), size: new THREE.Vector3(1.2, 1.2, 1.2), color: ["#fbf3e6", "#f7e7a3"][index % 2] } : null;
  });

  // --- Irises along the banks by the bridge: sword leaves and violet flowers ---------
  const irisSpots: THREE.Vector3[] = [];
  for (let attempt = 0; attempt < 600 && irisSpots.length < 70; attempt += 1) {
    const side = (random() > 0.5 ? 1 : -1) * between(halfWidth + 0.2, halfWidth + 2.2);
    const at = world.riverPoint(world.bridgeArc + between(-22, 22), side);
    if (world.distanceToWater(at.x, at.z) < halfWidth) continue;
    at.y = world.groundHeight(at.x, at.z) - 0.05;
    irisSpots.push(at);
  }
  const leafParts = Array.from({ length: 5 }, (_, blade) => {
    const part = new THREE.ConeGeometry(0.05, 1.3, 3);
    part.scale(1, 1, 0.3);
    part.translate(0, 0.65, 0);
    part.rotateZ((blade - 2) * 0.14);
    part.rotateY(blade * 1.3);
    return part;
  });
  const irisLeaves = keep(mergeGeometries(leafParts));
  leafParts.forEach((part) => part.dispose());
  const irisFlower = petalRing(3, 0.2, 2.2);
  irisFlower.translate(0, 1.25, 0);
  let irisIndex = 0;
  scatter(irisLeaves, painted("#5f7a3a", 0.25, 0.12), irisSpots.length, () => {
    const at = irisSpots[irisIndex++];
    return at ? { at, size: new THREE.Vector3(1, between(0.8, 1.2), 1) } : null;
  });
  irisIndex = 0;
  scatter(irisFlower, painted(null, 0.15, 0.12), irisSpots.length, () => {
    const at = irisSpots[irisIndex++];
    return at ? { at, size: new THREE.Vector3(1, between(0.85, 1.15), 1), color: ["#6d5aa0", "#8a6fb5", "#5a4b8e"][irisIndex % 3] } : null;
  });

  // --- Bulrushes in the shallows: tall stems with brown velvet heads -----------------
  const rushParts = [new THREE.CylinderGeometry(0.02, 0.03, 2, 4), new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6)];
  rushParts[0].translate(0, 1, 0);
  rushParts[1].translate(0, 1.75, 0);
  const rushStem = keep(rushParts[0]);
  const rushHead = keep(rushParts[1]);
  const rushSpots: THREE.Vector3[] = [];
  for (let attempt = 0; attempt < 900 && rushSpots.length < 160; attempt += 1) {
    const spot = nearGlade(160).clone();
    const d = world.distanceToWater(spot.x, spot.z);
    if (d < halfWidth - 0.9 || d > halfWidth + 0.8) continue;
    if (noise2(spot.x * 0.2 + 7, spot.z * 0.2) < 0.5) continue;
    spot.y = Math.max(world.groundHeight(spot.x, spot.z), -0.9);
    rushSpots.push(spot);
  }
  [[rushStem, painted("#6b6a35", 0.2, 0.12)], [rushHead, painted("#5a3a22", 0.3, 0.12)]].forEach(([geometry, material]) => {
    let index = 0;
    scatter(geometry as THREE.BufferGeometry, material as THREE.Material, rushSpots.length, () => {
      const at = rushSpots[index];
      const height = 0.75 + ((index * 37) % 10) / 20;
      index += 1;
      return at ? { at, size: new THREE.Vector3(1, height, 1), turn: index, tilt: ((index % 5) - 2) * 0.04 } : null;
    });
  });

  // --- Wildflowers in the grass: buttercups, cornflowers, daisies and a few poppies --
  const flowerGeometry = keep(new THREE.IcosahedronGeometry(0.11, 0));
  flowerGeometry.translate(0, 0.42, 0);
  const flowerColours = ["#e0b83c", "#e0b83c", "#f2eee2", "#f2eee2", "#6f8fb8", "#b8432f"];
  scatter(flowerGeometry, painted(null, 0.05, 0.12), 1100, () => {
    const spot = nearGlade(150);
    const d = world.distanceToWater(spot.x, spot.z);
    if (d < halfWidth + 3) return null;
    // Flowers come in drifts, not evenly.
    const drift = noise2(spot.x * 0.09 + 3, spot.z * 0.09 - 2);
    if (drift < 0.55) return null;
    const colour = flowerColours[Math.floor(noise2(spot.x * 0.05, spot.z * 0.05) * flowerColours.length * 1.6) % flowerColours.length];
    return { at: spot.clone().setY(world.groundHeight(spot.x, spot.z)), size: new THREE.Vector3(1, between(0.8, 1.3), 1), color: colour };
  });

  // --- Pebbles at the water's edge -----------------------------------------------------
  const pebble = keep(smoothBlob(1, 0.12));
  scatter(pebble, painted(null, 0.25, 0, 3), 520, () => {
    const spot = nearGlade(150);
    const d = world.distanceToWater(spot.x, spot.z);
    if (d < halfWidth + 0.3 || d > halfWidth + 2.6) return null;
    const size = between(0.6, 1.8);
    return {
      at: spot.clone().setY(world.groundHeight(spot.x, spot.z) + 0.02),
      size: new THREE.Vector3(size, size * 0.55, size * between(0.7, 1.2)),
      color: ["#8a7d6c", "#a4977f", "#6e6255", "#c3b49a"][Math.floor(random() * 4)],
    };
  });

  // --- Two weeping willows leaning over the river --------------------------------------
  const willowFrond = keep(new THREE.CylinderGeometry(0.03, 0.09, 3.2, 4));
  willowFrond.translate(0, -1.6, 0);
  const willowLeaf = painted("#8a8f4a", 0.35, 0.22, 1.2);
  // The fronds sway from their tops; flip so "up" for the wind is the hanging end.
  const willowCrown = keep(smoothBlob(2, 2.6));
  const trunkMaterial = painted("#4a3726", 0.2);
  const willowTrunk = keep(new THREE.CylinderGeometry(0.35, 0.55, 5, 8));
  willowTrunk.translate(0, 2.5, 0);
  const willows: THREE.Vector3[] = [];
  // Kept clear of the bridge ends, so the way on to the bridge is open.
  [[9, 1], [33, -1]].forEach(([dz, side]) => {
    const arc = world.arcAt(centre.z + dz);
    const root = world.riverPoint(arc, side * (halfWidth + 3.2));
    root.y = world.groundHeight(root.x, root.z) - 0.1;
    willows.push(root.clone());
    const lean = new THREE.Group();
    lean.position.copy(root);
    const towardRiver = world.riverPoint(arc, 0).sub(root).setY(0).normalize();
    lean.rotation.set(towardRiver.z * 0.2, 0, -towardRiver.x * 0.2);
    lean.add(new THREE.Mesh(willowTrunk, trunkMaterial));
    const crown = new THREE.Mesh(willowCrown, willowLeaf);
    crown.position.y = 5.4;
    crown.scale.set(1.2, 0.7, 1.2);
    lean.add(crown);
    scene.add(lean);
    // Fronds hang in a ring under the crown, some trailing toward the water.
    const fronds = new THREE.InstancedMesh(willowFrond, willowLeaf, 90);
    for (let index = 0; index < 90; index += 1) {
      const angle = (index / 90) * Math.PI * 2 + random() * 0.2;
      const ring = between(1.2, 3);
      place.set(Math.cos(angle) * ring, 5.6 + between(-0.3, 0.4), Math.sin(angle) * ring);
      quaternion.setFromEuler(new THREE.Euler(Math.sin(angle) * 0.15, 0, -Math.cos(angle) * 0.15));
      const length = between(0.7, 1.25);
      matrix.compose(place, quaternion, scale.set(1, length, 1));
      fronds.setMatrixAt(index, matrix);
    }
    lean.add(fronds);
    instanced.push(fronds);
  });

  // --- A fallen log by the eddy pool, with a few mushrooms -------------------------------
  const logGeometry = keep(new THREE.CylinderGeometry(0.45, 0.55, 5.5, 10));
  const log = new THREE.Mesh(logGeometry, painted("#5e4630", 0.4, 0, 1.5));
  const away = world.pool.centre.clone().sub(world.riverPoint(world.arcAt(world.pool.centre.z), 0)).setY(0).normalize();
  const logAt = world.pool.centre.clone().addScaledVector(away, world.pool.radius + 2.6);
  logAt.y = world.groundHeight(logAt.x, logAt.z) + 0.3;
  log.position.copy(logAt);
  log.rotation.set(0, Math.atan2(away.x, away.z) + Math.PI / 2, Math.PI / 2);
  scene.add(log);
  const capGeometry = keep(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  const stalkGeometry = keep(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 6));
  const capMaterial = painted("#c9a77a", 0.2);
  const stalkMaterial = painted("#efe6d2", 0.1);
  for (let index = 0; index < 6; index += 1) {
    const offset = between(-2.2, 2.2);
    const at = logAt.clone().add(new THREE.Vector3(away.z * offset, 0, -away.x * offset)).addScaledVector(away, between(0.5, 0.9));
    const ground = world.groundHeight(at.x, at.z);
    const size = between(0.7, 1.3);
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    stalk.position.set(at.x, ground + 0.1 * size, at.z);
    stalk.scale.setScalar(size);
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.set(at.x, ground + 0.2 * size, at.z);
    cap.scale.setScalar(size);
    scene.add(stalk, cap);
  }

  // The log's length, as points along it, so the walker can step round it.
  const logAxis = away.clone();
  const logPoints = [-2.4, -1.2, 0, 1.2, 2.4].map((offset) => logAt.clone().addScaledVector(logAxis, offset));

  return {
    lilyPads,
    willows,
    logPoints,
    rushes: rushSpots,
    irises: irisSpots,
    dispose() {
      instanced.forEach((mesh) => mesh.dispose());
    },
  };
}
