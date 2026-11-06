/**
 * Life in the glade: small natural events that happen now and then near you.
 *
 * Some creatures are always about (gulls and kites overhead, a heron in the
 * shallows, ducks, fish under the surface, dragonflies, butterflies). Others
 * are occasional: swallows skimming the river, a starling flock, a fish
 * jumping, a rabbit, a frog's plop, a leaf falling, a gust of wind, a
 * kingfisher, an otter, a frog sunning on a lily pad. Each has
 * its own unhurried timer, so the glade stays calm but rarely the same.
 *
 * Also here: the walker, the little figure you move about the bank.
 */
import * as THREE from "three";

/** Something you might stop and look at, and how close you need to be. */
/** Something solid on the ground the walker goes round, not through. */
export type Obstacle = { x: number; z: number; r: number };

export type LifeWorld = {
  scene: THREE.Scene;
  curve: THREE.CatmullRomCurve3;
  riverLength: number;
  halfWidth: number;
  groundHeight: (x: number, z: number) => number;
  distanceToRiver: (x: number, z: number) => number;
  /** Arc distance (from upstream) of the river point nearest x, z. */
  arcNear: (x: number, z: number) => number;
  ripple: (at: THREE.Vector3, size?: number, when?: number) => void;
  random: () => number;
  keep: <T extends { dispose: () => void }>(thing: T) => T;
  trees: { x: number; z: number; s: number }[];
  /** 0 normally; rises during a gust. Shared with the grass and trees. */
  gust: { value: number };
  /** The eddy pool, where pond skaters and a couple of fish keep to themselves. */
  pool: { centre: THREE.Vector3; radius: number };
  /** Where lily pads float, for a frog to sit on now and then. */
  lilyPads: THREE.Vector3[];
};

const tangent = new THREE.Vector3();
const lateral = new THREE.Vector3();

type Bird = { group: THREE.Group; left: THREE.Group; right: THREE.Group };

export function createLife(world: LifeWorld) {
  const { scene, curve, riverLength, halfWidth, random, keep } = world;
  const between = (low: number, high: number) => low + random() * (high - low);
  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
    keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...extra }));
  const basic = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) =>
    keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...extra }));
  const sphere = keep(new THREE.SphereGeometry(1, 12, 8));
  const cone = keep(new THREE.ConeGeometry(1, 1, 8));
  const stick = keep(new THREE.CylinderGeometry(1, 1, 1, 6));

  /** A point on the river, `side` units across from its centre line. */
  function riverPoint(arc: number, side: number, out = new THREE.Vector3()) {
    const u = THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999);
    curve.getPointAt(u, out);
    curve.getTangentAt(u, tangent);
    lateral.set(-tangent.z, 0, tangent.x).normalize();
    out.addScaledVector(lateral, side);
    return out;
  }

  function riverHeading(arc: number) {
    curve.getTangentAt(THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999), tangent);
    return Math.atan2(tangent.x, tangent.z);
  }

  // --- Birds ----------------------------------------------------------------
  function makeBird(color: string, span: number, chord = 0.24): Bird {
    const wing = keep(new THREE.PlaneGeometry(span / 2, chord));
    wing.translate(span / 4, 0, 0);
    const material = basic(color, { side: THREE.DoubleSide });
    const group = new THREE.Group();
    const left = new THREE.Group();
    const right = new THREE.Group();
    const leftWing = new THREE.Mesh(wing, material);
    const rightWing = new THREE.Mesh(wing, material);
    rightWing.scale.x = -1;
    leftWing.rotation.x = rightWing.rotation.x = -Math.PI / 2;
    left.add(leftWing);
    right.add(rightWing);
    const body = new THREE.Mesh(sphere, material);
    body.scale.set(span * 0.06, span * 0.05, span * 0.2);
    group.add(left, right, body);
    scene.add(group);
    return { group, left, right };
  }

  function flap(bird: Bird, now: number, rate: number, amount: number, glide: number, phase: number) {
    // Mostly gliding, with bursts of wingbeats.
    const beating = Math.sin(now * 0.0005 + phase) > glide;
    const beat = beating ? Math.sin(now * rate + phase * 10) * amount : 0.12;
    bird.left.rotation.z = beat;
    bird.right.rotation.z = -beat;
  }

  /** Point a bird along its direction of travel. */
  function face(bird: Bird, from: THREE.Vector3, to: THREE.Vector3) {
    bird.group.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  }

  // Kites, high and dark; gulls, pale and lower over the water ("What Freedom!").
  const soarers = [
    ...Array.from({ length: 3 }, () => ({ bird: makeBird("#3c2a1b", 1.8), height: between(20, 26), radius: between(26, 44), speed: between(0.05, 0.08), glide: 0.5 })),
    ...Array.from({ length: 3 }, () => ({ bird: makeBird("#f1ebdd", 1.5, 0.28), height: between(8, 13), radius: between(14, 26), speed: between(0.09, 0.13), glide: 0.2 })),
  ].map((entry) => ({ ...entry, phase: random() * Math.PI * 2, center: new THREE.Vector3(), last: new THREE.Vector3() }));

  // --- A heron in the shallows ------------------------------------------------
  const heron = new THREE.Group();
  const heronGrey = lambert("#8d9497");
  const heronDark = lambert("#4a4d50");
  {
    const body = new THREE.Mesh(sphere, heronGrey);
    body.scale.set(0.32, 0.36, 0.62);
    body.position.y = 1.35;
    const legs = [-0.1, 0.1].map((x) => {
      const leg = new THREE.Mesh(stick, heronDark);
      leg.scale.set(0.025, 1.1, 0.025);
      leg.position.set(x, 0.6, 0);
      return leg;
    });
    heron.add(body, ...legs);
  }
  const heronNeck = new THREE.Group();
  heronNeck.position.set(0, 1.55, 0.42);
  {
    const neck = new THREE.Mesh(stick, heronGrey);
    neck.scale.set(0.06, 0.75, 0.06);
    neck.position.y = 0.34;
    const head = new THREE.Mesh(sphere, heronGrey);
    head.scale.set(0.1, 0.1, 0.16);
    head.position.set(0, 0.74, 0.05);
    const beak = new THREE.Mesh(cone, lambert("#b8913f"));
    beak.scale.set(0.035, 0.34, 0.035);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.72, 0.3);
    heronNeck.add(neck, head, beak);
  }
  heron.add(heronNeck);
  const heronArc = world.arcNear(0, -22);
  riverPoint(heronArc, halfWidth - 0.6, heron.position);
  heron.position.y = world.groundHeight(heron.position.x, heron.position.z) - 0.1;
  heron.rotation.y = riverHeading(heronArc) + Math.PI * 0.6;
  scene.add(heron);
  let heronDipAt = performance.now() + between(8000, 20000);

  // --- Ducks paddling -------------------------------------------------------------
  const duckBrown = lambert("#7b5a38");
  const duckHead = lambert("#2f4a3a");
  const ducks = Array.from({ length: 2 }, (_, index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(sphere, duckBrown);
    body.scale.set(0.24, 0.17, 0.38);
    const head = new THREE.Mesh(sphere, duckHead);
    head.scale.setScalar(0.12);
    head.position.set(0, 0.2, 0.26);
    const bill = new THREE.Mesh(sphere, lambert("#c9a14a"));
    bill.scale.set(0.05, 0.025, 0.08);
    bill.position.set(0, 0.18, 0.39);
    group.add(body, head, bill);
    scene.add(group);
    return { group, arc: 0, side: index === 0 ? 1.4 : 2.1, wakeAt: 0, placed: false, phase: index * 2.3 };
  });

  // --- Fish, as shadows under the surface ------------------------------------------
  const fishShadowGeometry = keep(new THREE.CircleGeometry(1, 16));
  fishShadowGeometry.rotateX(-Math.PI / 2);
  const fishShadowMaterial = basic("#21393b", { transparent: true, opacity: 0.32, depthWrite: false });
  const fishes = Array.from({ length: 5 }, () => {
    const mesh = new THREE.Mesh(fishShadowGeometry, fishShadowMaterial);
    mesh.scale.set(0.16, 1, 0.5);
    mesh.renderOrder = 3;
    scene.add(mesh);
    return { mesh, arc: 0, side: 0, placed: false, dart: 0, phase: random() * 10 };
  });

  // --- Dragonflies over the reeds, butterflies over the grass ---------------------
  const dragonWing = keep(new THREE.PlaneGeometry(0.32, 0.06));
  const dragonflies = Array.from({ length: 2 }, (_, index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(stick, lambert(index ? "#3f7f86" : "#6b8f3e"));
    body.scale.set(0.02, 0.3, 0.02);
    body.rotation.x = Math.PI / 2;
    const wingMaterial = basic("#eef2ea", { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const wings = [0.04, -0.04].map((z) => {
      const wing = new THREE.Mesh(dragonWing, wingMaterial);
      wing.rotation.x = -Math.PI / 2;
      wing.position.set(0, 0.02, z);
      return wing;
    });
    group.add(body, ...wings);
    scene.add(group);
    return { group, wings, base: new THREE.Vector3(), target: new THREE.Vector3(), nextHop: 0, placed: false };
  });

  const butterflyWing = keep(new THREE.CircleGeometry(0.13, 8));
  butterflyWing.translate(0.13, 0, 0);
  const butterflies = ["#efe3c6", "#d98f3e", "#a9bfd0"].map((color, index) => {
    const material = basic(color, { side: THREE.DoubleSide });
    const group = new THREE.Group();
    const left = new THREE.Group();
    const right = new THREE.Group();
    const leftWing = new THREE.Mesh(butterflyWing, material);
    const rightWing = new THREE.Mesh(butterflyWing, material);
    rightWing.scale.x = -1;
    leftWing.rotation.x = rightWing.rotation.x = -Math.PI / 2;
    left.add(leftWing);
    right.add(rightWing);
    group.add(left, right);
    scene.add(group);
    return { group, left, right, base: new THREE.Vector3(), phase: index * 2.1, placed: false, last: new THREE.Vector3() };
  });

  // --- Small things always about -----------------------------------------------------
  // Midges dancing in a column over the water's edge, catching the light.
  const MIDGES = 36;
  const midgeGeometry = keep(new THREE.BufferGeometry());
  midgeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MIDGES * 3), 3));
  const midges = new THREE.Points(midgeGeometry, keep(new THREE.PointsMaterial({
    color: new THREE.Color("#fff4d8"), size: 0.07, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  scene.add(midges);
  const midgeHome = new THREE.Vector3();
  let midgesPlaced = false;

  // Pond skaters on the still pool, and two fish turning slowly in it.
  const skaterMaterial = basic("#2c2420");
  const skaters = Array.from({ length: 7 }, () => {
    const mesh = new THREE.Mesh(sphere, skaterMaterial);
    mesh.scale.set(0.035, 0.01, 0.07);
    scene.add(mesh);
    return { mesh, at: new THREE.Vector2(), target: new THREE.Vector2(), nextSkip: 0, placed: false };
  });
  const poolFish = Array.from({ length: 2 }, (_, index) => {
    const mesh = new THREE.Mesh(fishShadowGeometry, fishShadowMaterial);
    mesh.scale.set(0.14, 1, 0.42);
    mesh.renderOrder = 3;
    scene.add(mesh);
    return { mesh, phase: index * Math.PI, ring: 1.6 + index * 1.7 };
  });

  // Bees working the wildflowers near you.
  const bees = Array.from({ length: 3 }, (_, index) => {
    const mesh = new THREE.Mesh(sphere, basic(index ? "#c99a2e" : "#d6a83a"));
    mesh.scale.setScalar(0.05);
    scene.add(mesh);
    return { mesh, base: new THREE.Vector3(), target: new THREE.Vector3(), nextHop: 0, placed: false };
  });

  // Thistledown, loosed by gusts and carried off on the wind.
  const DOWN = 14;
  const downGeometry = keep(new THREE.BufferGeometry());
  downGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DOWN * 3), 3));
  const thistledown = new THREE.Points(downGeometry, keep(new THREE.PointsMaterial({
    color: new THREE.Color("#fbf6ea"), size: 0.14, transparent: true, opacity: 0, depthWrite: false,
  })));
  scene.add(thistledown);
  const downSeeds = Array.from({ length: DOWN }, () => new THREE.Vector3(between(-6, 6), between(0.5, 2.5), between(-6, 6)));
  const downOrigin = new THREE.Vector3();
  let downAge = 100;
  thistledown.visible = false;

  function smallThings(now: number, dt: number, focus: THREE.Vector3, focusArc: number) {
    if (!midgesPlaced || midgeHome.distanceTo(focus) > 20) {
      riverPoint(focusArc + between(-6, 6), (random() > 0.5 ? 1 : -1) * (halfWidth - 0.2), midgeHome);
      midgesPlaced = true;
    }
    const midgePositions = midgeGeometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < MIDGES; index += 1) {
      const t = now * 0.001;
      midgePositions.setXYZ(index,
        midgeHome.x + Math.sin(t * 3.1 + index * 1.7) * 0.45 + Math.sin(t * 0.5 + index) * 0.2,
        0.5 + ((index * 0.37 + Math.sin(t * 2.3 + index) * 0.25) % 1.6),
        midgeHome.z + Math.cos(t * 2.7 + index * 2.3) * 0.45,
      );
    }
    midgePositions.needsUpdate = true;

    const { centre, radius } = world.pool;
    skaters.forEach((skater) => {
      if (!skater.placed) {
        const angle = random() * Math.PI * 2;
        skater.at.set(Math.cos(angle), Math.sin(angle)).multiplyScalar(between(1, radius * 0.8));
        skater.target.copy(skater.at);
        skater.placed = true;
      }
      // Still, then a sudden skip to somewhere nearby.
      if (now > skater.nextSkip) {
        skater.nextSkip = now + between(900, 3200);
        skater.target.set(skater.at.x + between(-1.2, 1.2), skater.at.y + between(-1.2, 1.2));
        if (skater.target.length() > radius * 0.85) skater.target.multiplyScalar(0.6);
      }
      skater.at.lerp(skater.target, 0.18);
      skater.mesh.position.set(centre.x + skater.at.x, -0.25, centre.z + skater.at.y);
      skater.mesh.rotation.y = Math.atan2(skater.target.x - skater.at.x, skater.target.y - skater.at.y);
    });
    poolFish.forEach((fish) => {
      const angle = now * 0.00012 * (fish.ring > 2 ? -1 : 1) + fish.phase;
      fish.mesh.position.set(centre.x + Math.cos(angle) * fish.ring, -0.19, centre.z + Math.sin(angle) * fish.ring);
      fish.mesh.rotation.y = -angle + (fish.ring > 2 ? Math.PI : 0);
    });

    bees.forEach((bee) => {
      if (!bee.placed || bee.base.distanceTo(focus) > 18) {
        const angle = random() * Math.PI * 2;
        bee.base.set(focus.x + Math.cos(angle) * between(4, 9), 0, focus.z + Math.sin(angle) * between(4, 9));
        bee.mesh.position.copy(bee.base).setY(0.6);
        bee.placed = true;
      }
      if (now > bee.nextHop) {
        // From flower to flower, never far.
        bee.nextHop = now + between(600, 1800);
        const x = bee.base.x + between(-2.5, 2.5);
        const z = bee.base.z + between(-2.5, 2.5);
        bee.target.set(x, world.groundHeight(x, z) + between(0.45, 0.9), z);
      }
      bee.mesh.position.lerp(bee.target, 0.06);
      bee.mesh.position.y += Math.sin(now * 0.05) * 0.006;
    });

    // A good gust lifts a puff of thistledown.
    if (world.gust.value > 1 && downAge > 12) {
      downAge = 0;
      downOrigin.copy(focus);
    }
    downAge += dt;
    thistledown.visible = downAge < 12;
    if (!thistledown.visible) return;
    const downPositions = downGeometry.attributes.position as THREE.BufferAttribute;
    downSeeds.forEach((seed, index) => {
      downPositions.setXYZ(index,
        downOrigin.x + seed.x + downAge * 1.6 + Math.sin(now * 0.001 + index) * 0.5,
        world.groundHeight(downOrigin.x + seed.x, downOrigin.z + seed.z) + seed.y + downAge * 0.25 + Math.sin(now * 0.0015 + index * 2) * 0.3,
        downOrigin.z + seed.z + downAge * 0.8 + Math.cos(now * 0.0012 + index) * 0.5,
      );
    });
    downPositions.needsUpdate = true;
    (thistledown.material as THREE.PointsMaterial).opacity = downAge < 12 ? Math.min(1, downAge) * (1 - downAge / 12) * 0.9 : 0;
  }

  // --- Occasional things ------------------------------------------------------------
  type Actor = (now: number, dt: number) => boolean;
  const actors: Actor[] = [];

  // Occasional birds are made once and reused, so nothing piles up.
  const swallowPair = [makeBird("#2c2420", 0.7, 0.12), makeBird("#2c2420", 0.7, 0.12)];
  const flock = Array.from({ length: 18 }, () => makeBird("#2c2420", 0.45, 0.1));
  [...swallowPair, ...flock].forEach((bird) => { bird.group.visible = false; });
  let swallowsOut = false;
  let flockOut = false;

  function swallows(now: number, focusArc: number) {
    if (swallowsOut) return;
    swallowsOut = true;
    const pair = swallowPair;
    const start = now;
    const direction = random() > 0.5 ? 1 : -1;
    const from = focusArc - direction * 45;
    const point = new THREE.Vector3();
    const last = new THREE.Vector3();
    actors.push((time) => {
      const t = (time - start) / 1000;
      let alive = false;
      pair.forEach((bird, index) => {
        const local = t - index * 0.5;
        const travelled = local * 9;
        if (local < 0 || travelled > 90) { bird.group.visible = false; return; }
        alive = true;
        bird.group.visible = true;
        riverPoint(from + direction * travelled, Math.sin(local * 1.3 + index) * 2.2, point);
        point.y = 1.1 + Math.abs(Math.sin(local * 2.2 + index)) * 1.2;
        last.copy(bird.group.position);
        bird.group.position.copy(point);
        face(bird, last, point);
        bird.group.rotation.z = Math.sin(local * 2.2) * 0.4;
        flap(bird, time, 0.03, 0.7, -0.2, index);
      });
      if (!alive) swallowsOut = false;
      return alive;
    });
  }

  function starlings(now: number, focus: THREE.Vector3) {
    if (flockOut) return;
    flockOut = true;
    flock.forEach((bird) => { bird.group.visible = true; });
    const angle = random() * Math.PI * 2;
    const across = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const start = now;
    const centre = new THREE.Vector3();
    actors.push((time) => {
      const t = (time - start) / 1000;
      if (t > 32) {
        flock.forEach((bird) => { bird.group.visible = false; });
        flockOut = false;
        return false;
      }
      centre.copy(focus).addScaledVector(across, -110 + t * 7);
      centre.y = 26 + Math.sin(t * 0.4) * 3;
      const breathe = 1 + Math.sin(t * 0.5) * 0.5;
      flock.forEach((bird, index) => {
        bird.group.position.set(
          centre.x + Math.sin(t * 0.7 + index) * 6 * breathe,
          centre.y + Math.sin(t * 1.1 + index * 2) * 3,
          centre.z + Math.cos(t * 0.9 + index * 1.3) * 6 * breathe,
        );
        bird.group.rotation.y = angle + Math.PI / 2 + Math.sin(t + index) * 0.4;
        flap(bird, time, 0.04, 0.8, -1, index);
      });
      return true;
    });
  }

  const fishBody = lambert("#b9c3bd");
  const sprayGeometry = keep(new THREE.BufferGeometry());
  sprayGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
  function fishJump(now: number, focusArc: number) {
    const arc = focusArc + between(-18, 18);
    const fromPoint = riverPoint(arc, between(-2.5, 2.5));
    const heading = riverHeading(arc) + (random() > 0.5 ? 0 : Math.PI) + between(-0.5, 0.5);
    const length = between(1.2, 2);
    const toPoint = fromPoint.clone().add(new THREE.Vector3(Math.sin(heading) * length, 0, Math.cos(heading) * length));
    const fish = new THREE.Group();
    const body = new THREE.Mesh(sphere, fishBody);
    body.scale.set(0.09, 0.12, 0.34);
    const tail = new THREE.Mesh(cone, fishBody);
    tail.scale.set(0.12, 0.16, 0.02);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.38;
    fish.add(body, tail);
    scene.add(fish);
    const spray = new THREE.Points(sprayGeometry.clone(), new THREE.PointsMaterial({ color: new THREE.Color("#f4eedd"), size: 0.12, transparent: true }));
    scene.add(spray);
    const drops = Array.from({ length: 10 }, () => new THREE.Vector3(between(-1, 1), between(1.5, 3), between(-1, 1)));
    world.ripple(fromPoint, 0.7, now);
    let landed = false;
    const start = now;
    const duration = 900;
    actors.push((time) => {
      const p = (time - start) / duration;
      if (p < 1) {
        fish.position.lerpVectors(fromPoint, toPoint, p);
        fish.position.y = -0.3 + Math.sin(p * Math.PI) * 1.3;
        fish.rotation.set(-Math.cos(p * Math.PI) * 1.1, heading, 0);
      } else if (!landed) {
        landed = true;
        scene.remove(fish);
        world.ripple(toPoint, 0.9, time);
        world.ripple(toPoint, 0.5, time + 200);
      }
      // A little spray at each end.
      const positions = spray.geometry.attributes.position as THREE.BufferAttribute;
      const age = ((time - start) % duration) / 600;
      const at = p < 1 ? fromPoint : toPoint;
      drops.forEach((drop, index) => {
        positions.setXYZ(index, at.x + drop.x * age * 0.6, -0.3 + drop.y * age - 4.9 * age * age, at.z + drop.z * age * 0.6);
      });
      positions.needsUpdate = true;
      (spray.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age);
      if (p > 1.7) {
        scene.remove(spray);
        spray.geometry.dispose();
        (spray.material as THREE.PointsMaterial).dispose();
        return false;
      }
      return true;
    });
  }

  let rabbitNow: THREE.Group | null = null;
  let rabbitStartle: THREE.Vector3 | null = null;
  const rabbitFur = lambert("#a07a4c");
  const rabbitTail = lambert("#efe7d6");
  function rabbit(now: number, focus: THREE.Vector3) {
    let x = 0;
    let z = 0;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = between(9, 20);
      x = focus.x + Math.cos(angle) * distance;
      z = focus.z + Math.sin(angle) * distance;
      if (world.distanceToRiver(x, z) > halfWidth + 5) break;
    }
    const group = new THREE.Group();
    const body = new THREE.Mesh(sphere, rabbitFur);
    body.scale.set(0.2, 0.18, 0.28);
    body.position.y = 0.18;
    const head = new THREE.Mesh(sphere, rabbitFur);
    head.scale.setScalar(0.12);
    head.position.set(0, 0.32, 0.22);
    const ears = [-0.04, 0.04].map((offset) => {
      const ear = new THREE.Mesh(sphere, rabbitFur);
      ear.scale.set(0.025, 0.12, 0.04);
      ear.position.set(offset, 0.48, 0.18);
      return ear;
    });
    const tail = new THREE.Mesh(sphere, rabbitTail);
    tail.scale.setScalar(0.06);
    tail.position.set(0, 0.22, -0.28);
    group.add(body, head, ...ears, tail);
    scene.add(group);
    rabbitNow = group;
    let heading = random() * Math.PI * 2;
    let hopStart = now + 600;
    let hops = 0;
    const totalHops = 6 + Math.floor(random() * 6);
    let groundX = x;
    let groundZ = z;
    group.position.set(x, world.groundHeight(x, z), z);
    group.scale.setScalar(0.01);
    const born = now;
    actors.push((time) => {
      const grow = Math.min(1, (time - born) / 400);
      if (hops >= totalHops) {
        const shrink = 1 - (time - hopStart) / 500;
        if (shrink <= 0) { scene.remove(group); if (rabbitNow === group) rabbitNow = null; return false; }
        group.scale.setScalar(shrink);
        return true;
      }
      group.scale.setScalar(grow);
      const p = (time - hopStart) / 420;
      if (p >= 0 && p < 1) {
        const nx = groundX + Math.sin(heading) * 0.9 * p;
        const nz = groundZ + Math.cos(heading) * 0.9 * p;
        group.position.set(nx, world.groundHeight(nx, nz) + Math.sin(p * Math.PI) * 0.35, nz);
      } else if (p >= 1) {
        groundX += Math.sin(heading) * 0.9;
        groundZ += Math.cos(heading) * 0.9;
        hops += 1;
        if (random() > 0.6) heading += between(-1.2, 1.2);
        // Startled by you coming close, it bolts the other way without stopping.
        const away = rabbitStartle;
        if (away) heading = Math.atan2(groundX - away.x, groundZ - away.z) + between(-0.4, 0.4);
        // Otherwise, sometimes a pause to sit up and look about.
        hopStart = time + (away ? 60 : random() > 0.7 ? between(1500, 3500) : between(150, 500));
      }
      group.rotation.y = heading;
      return true;
    });
  }

  function frogPlop(now: number, focusArc: number) {
    const side = (random() > 0.5 ? 1 : -1) * (halfWidth - between(0.4, 1));
    const at = riverPoint(focusArc + between(-16, 16), side);
    world.ripple(at, 0.45, now);
    world.ripple(at, 0.25, now + 160);
  }

  const leafGeometry = keep(new THREE.PlaneGeometry(0.22, 0.14));
  const leafMaterials = ["#a1873e", "#c4974f", "#7f7a41", "#b5652f"].map((color) => basic(color, { side: THREE.DoubleSide }));
  function fallingLeaf(now: number, focus: THREE.Vector3) {
    const near = world.trees.filter((tree) => Math.hypot(tree.x - focus.x, tree.z - focus.z) < 40);
    const tree = near[Math.floor(random() * near.length)];
    if (!tree) return;
    const leaf = new THREE.Mesh(leafGeometry, leafMaterials[Math.floor(random() * leafMaterials.length)]);
    const ground = world.groundHeight(tree.x, tree.z);
    leaf.position.set(tree.x + between(-1.5, 1.5) * tree.s, ground + tree.s * 3.4, tree.z + between(-1.5, 1.5) * tree.s);
    scene.add(leaf);
    const drift = new THREE.Vector3(between(-0.6, 0.6), 0, between(-0.6, 0.6));
    let state: "falling" | "floating" | "resting" = "falling";
    let arc = 0;
    let side = 0;
    let settledAt = 0;
    const start = now;
    actors.push((time, dt) => {
      const t = (time - start) / 1000;
      if (state === "falling") {
        leaf.position.x += (drift.x + Math.sin(t * 2.4) * 0.8) * dt;
        leaf.position.z += (drift.z + Math.cos(t * 1.9) * 0.5) * dt;
        leaf.position.y -= 0.9 * dt;
        leaf.rotation.set(Math.sin(t * 3) * 0.9, t * 1.3, Math.cos(t * 2.5) * 0.7);
        const inRiver = world.distanceToRiver(leaf.position.x, leaf.position.z) < halfWidth - 0.3;
        const floor = inRiver ? -0.26 : world.groundHeight(leaf.position.x, leaf.position.z) + 0.04;
        if (leaf.position.y <= floor) {
          leaf.position.y = floor;
          leaf.rotation.set(-Math.PI / 2, 0, random() * 6);
          settledAt = time;
          if (inRiver) {
            state = "floating";
            arc = world.arcNear(leaf.position.x, leaf.position.z);
            const centre = riverPoint(arc, 0);
            side = Math.hypot(leaf.position.x - centre.x, leaf.position.z - centre.z) * (random() > 0.5 ? 1 : -1);
            world.ripple(leaf.position, 0.3, time);
          } else {
            state = "resting";
          }
        }
        return true;
      }
      const age = (time - settledAt) / 1000;
      if (state === "floating") {
        arc += 0.45 * dt;
        riverPoint(arc, side, leaf.position);
        leaf.position.y = -0.26;
        leaf.rotation.z += dt * 0.2;
      }
      const life = state === "floating" ? 45 : 14;
      if (age > life) {
        const fade = 1 - (age - life) / 2;
        if (fade <= 0) { scene.remove(leaf); return false; }
        leaf.scale.setScalar(fade);
      }
      return true;
    });
  }

  function gustOfWind(now: number, focus: THREE.Vector3) {
    const start = now;
    // A gust often shakes a leaf or two loose.
    if (random() > 0.3) fallingLeaf(now + 400, focus);
    if (random() > 0.6) fallingLeaf(now + 1200, focus);
    actors.push((time) => {
      const p = (time - start) / 6000;
      if (p >= 1) { world.gust.value = 0; return false; }
      world.gust.value = Math.sin(p * Math.PI) ** 2 * 1.4;
      return true;
    });
  }

  // A kingfisher: a flash of blue low along the water, a pause on a perch, a dive.
  const kingfisher = makeBird("#2b86a8", 0.5, 0.12);
  kingfisher.group.visible = false;
  {
    const belly = new THREE.Mesh(sphere, basic("#d9782f"));
    belly.scale.set(0.05, 0.04, 0.09);
    belly.position.y = -0.03;
    kingfisher.group.add(belly);
  }
  let kingfisherOut = false;
  let kingfisherStartle: THREE.Vector3 | null = null;
  function kingfisherVisit(now: number, focusArc: number) {
    if (kingfisherOut) return;
    kingfisherOut = true;
    const side = (random() > 0.5 ? 1 : -1) * (halfWidth + 0.4);
    const direction = random() > 0.5 ? 1 : -1;
    const perch = riverPoint(focusArc + between(-10, 10), side);
    perch.y = 1.5;
    const from = riverPoint(focusArc - direction * 40, side * 0.3).setY(0.8);
    const dive = riverPoint(world.arcNear(perch.x, perch.z), side * 0.4).setY(-0.3);
    const away = riverPoint(focusArc + direction * 45, -side * 0.3).setY(1);
    const sit = between(3500, 7000);
    const start = now;
    const last = new THREE.Vector3();
    let splashed = false;
    kingfisher.group.visible = true;
    actors.push((time) => {
      const t = time - start;
      last.copy(kingfisher.group.position);
      if (t < 2200) {
        kingfisher.group.position.lerpVectors(from, perch, t / 2200);
        kingfisher.group.position.y += Math.sin((t / 2200) * Math.PI) * 0.4;
        flap(kingfisher, time, 0.06, 0.8, -1, 1);
      } else if (t < 2200 + sit && !(kingfisherStartle && kingfisherStartle.distanceTo(perch) < 4)) {
        kingfisher.group.position.copy(perch);
        kingfisher.left.rotation.z = kingfisher.right.rotation.z = 0;
        kingfisher.group.rotation.y += Math.sin(time * 0.003) * 0.01;
        return true;
      } else if (t < 2600 + sit) {
        if (kingfisherStartle) kingfisherStartle = null;
        kingfisher.group.position.lerpVectors(perch, dive, (t - 2200 - sit) / 400);
      } else if (t < 4800 + sit) {
        if (!splashed) { splashed = true; world.ripple(dive, 0.6, time); world.ripple(dive, 0.35, time + 150); }
        kingfisher.group.position.lerpVectors(dive, away, (t - 2600 - sit) / 2200);
        flap(kingfisher, time, 0.06, 0.8, -1, 1);
      } else {
        kingfisher.group.visible = false;
        kingfisherOut = false;
        return false;
      }
      face(kingfisher, last, kingfisher.group.position);
      return true;
    });
  }

  // An otter: a head swimming across, a V of wake, a dive, and up once more further on.
  const otter = new THREE.Group();
  {
    const head = new THREE.Mesh(sphere, lambert("#5a4330"));
    head.scale.set(0.2, 0.14, 0.26);
    const nose = new THREE.Mesh(sphere, lambert("#2c2018"));
    nose.scale.setScalar(0.04);
    nose.position.set(0, 0.03, 0.24);
    otter.add(head, nose);
  }
  otter.visible = false;
  scene.add(otter);
  let otterOut = false;
  function otterSwim(now: number, focusArc: number) {
    if (otterOut) return;
    otterOut = true;
    let arc = focusArc + between(-20, 20);
    let side = (random() > 0.5 ? 1 : -1) * (halfWidth - 0.5);
    const crossing = -Math.sign(side) * 0.9;
    const start = now;
    let wakeAt = now;
    let dived = false;
    otter.visible = true;
    actors.push((time, dt) => {
      const t = (time - start) / 1000;
      if (t < 7 || (t > 10 && t < 15)) {
        if (t > 10 && dived) { dived = false; world.ripple(otter.position, 0.5, time); }
        otter.visible = true;
        side += crossing * dt;
        arc -= dt * 0.6;
        riverPoint(arc, side, otter.position);
        otter.position.y = -0.27 + Math.sin(time * 0.006) * 0.02;
        otter.rotation.y = Math.atan2(-tangent.x * 0.6 + lateral.x * crossing, -tangent.z * 0.6 + lateral.z * crossing);
        if (time > wakeAt) { wakeAt = time + 450; world.ripple(otter.position, 0.4, time); }
      } else if (t < 10) {
        if (!dived) { dived = true; world.ripple(otter.position, 0.7, time); }
        otter.visible = false;
        arc -= dt * 1.5;
        side += crossing * dt * 0.5;
      } else {
        world.ripple(otter.position, 0.6, time);
        otter.visible = false;
        otterOut = false;
        return false;
      }
      return true;
    });
  }

  // A frog sits out on a lily pad for a while, then plops off.
  const frog = new THREE.Group();
  {
    const body = new THREE.Mesh(sphere, lambert("#6c7d3a"));
    body.scale.set(0.12, 0.08, 0.14);
    body.position.y = 0.06;
    const eyes = [-0.05, 0.05].map((x) => {
      const eye = new THREE.Mesh(sphere, lambert("#3f4a22"));
      eye.scale.setScalar(0.03);
      eye.position.set(x, 0.12, 0.08);
      return eye;
    });
    frog.add(body, ...eyes);
  }
  frog.visible = false;
  scene.add(frog);
  let frogOut = false;
  function frogOnPad(now: number, focus: THREE.Vector3) {
    if (frogOut || world.lilyPads.length === 0) return;
    const pads = world.lilyPads.slice().sort((a, b) => a.distanceTo(focus) - b.distanceTo(focus)).slice(0, 8);
    const pad = pads[Math.floor(random() * pads.length)];
    frogOut = true;
    frog.position.copy(pad).setY(-0.25);
    frog.rotation.y = random() * Math.PI * 2;
    frog.visible = true;
    const stay = between(15000, 35000);
    const start = now;
    actors.push((time) => {
      const t = time - start;
      if (t < stay) {
        frog.scale.setScalar(1 + Math.sin(time * 0.004) * 0.03);
        return true;
      }
      const p = (t - stay) / 450;
      if (p < 1) {
        frog.position.y = -0.25 + Math.sin(p * Math.PI) * 0.4;
        frog.position.x += Math.sin(frog.rotation.y) * 0.02;
        frog.position.z += Math.cos(frog.rotation.y) * 0.02;
        return true;
      }
      world.ripple(frog.position.clone().setY(-0.3), 0.45, time);
      frog.visible = false;
      frogOut = false;
      return false;
    });
  }

  type Occasion = { next: number; every: [number, number]; happen: (now: number, focus: THREE.Vector3, focusArc: number) => void };
  const start = performance.now();
  const plan: Omit<Occasion, "next">[] = [
    { every: [10, 22], happen: (now, _focus, arc) => frogPlop(now, arc) },
    { every: [14, 30], happen: (now, _focus, arc) => fishJump(now, arc) },
    { every: [12, 26], happen: (now, focus) => fallingLeaf(now, focus) },
    { every: [30, 65], happen: (now, _focus, arc) => swallows(now, arc) },
    { every: [35, 75], happen: (now, focus) => gustOfWind(now, focus) },
    { every: [60, 120], happen: (now, focus) => rabbit(now, focus) },
    { every: [80, 150], happen: (now, focus) => starlings(now, focus) },
    { every: [40, 90], happen: (now, _focus, arc) => kingfisherVisit(now, arc) },
    { every: [80, 160], happen: (now, _focus, arc) => otterSwim(now, arc) },
    { every: [45, 100], happen: (now, focus) => frogOnPad(now, focus) },
  ];
  const occasions: Occasion[] = plan.map((occasion) => ({
    ...occasion,
    next: start + between(occasion.every[0] * 0.3, occasion.every[1]) * 1000,
  }));

  const scratch = new THREE.Vector3();

  /** Called every animated frame with where the walker is. */
  function update(now: number, dt: number, focus: THREE.Vector3) {
    const focusArc = world.arcNear(focus.x, focus.z);

    for (const occasion of occasions) {
      if (now < occasion.next) continue;
      occasion.happen(now, focus, focusArc);
      occasion.next = now + between(occasion.every[0], occasion.every[1]) * 1000;
    }
    for (let index = actors.length - 1; index >= 0; index -= 1) {
      if (!actors[index](now, dt)) actors.splice(index, 1);
    }
    smallThings(now, dt, focus, focusArc);

    soarers.forEach((entry, index) => {
      entry.center.lerp(focus, 0.004);
      if (entry.center.lengthSq() === 0) entry.center.copy(focus);
      const angle = entry.phase + now * 0.001 * entry.speed;
      entry.last.copy(entry.bird.group.position);
      entry.bird.group.position.set(
        entry.center.x + Math.cos(angle) * entry.radius,
        entry.height + Math.sin(angle * 3 + index) * 0.8,
        entry.center.z + Math.sin(angle) * entry.radius * 0.7,
      );
      face(entry.bird, entry.last, entry.bird.group.position);
      entry.bird.group.rotation.z = 0.25;
      flap(entry.bird, now, 0.008, 0.55, entry.glide, entry.phase);
    });

    // The heron now and then dips to fish, and straightens again.
    const dip = (now - heronDipAt) / 2600;
    if (dip > 1) heronDipAt = now + between(14000, 32000);
    heronNeck.rotation.x = dip > 0 && dip < 1 ? Math.sin(dip * Math.PI) * 1.25 : Math.sin(now * 0.0004) * 0.05;
    if (dip > 0.45 && dip < 0.5) {
      riverPoint(heronArc, halfWidth - 1.6, scratch);
      world.ripple(scratch, 0.35, now);
    }

    ducks.forEach((duck, index) => {
      if (!duck.placed || Math.abs(duck.arc - focusArc) > 70) {
        duck.arc = focusArc + between(-30, 30);
        duck.placed = true;
      }
      // Paddling gently upstream, against the current.
      duck.arc -= dt * (0.25 + Math.sin(now * 0.0003 + duck.phase) * 0.1);
      const side = duck.side * (index ? -1 : 1) + Math.sin(now * 0.0002 + duck.phase) * 0.8;
      riverPoint(duck.arc + index * 1.2, side, duck.group.position);
      duck.group.position.y = -0.24 + Math.sin(now * 0.002 + duck.phase) * 0.02;
      duck.group.rotation.y = riverHeading(duck.arc) + Math.PI + Math.sin(now * 0.0005 + duck.phase) * 0.3;
      if (now > duck.wakeAt) {
        duck.wakeAt = now + between(1400, 2400);
        world.ripple(duck.group.position, 0.3, now);
      }
    });

    fishes.forEach((fish) => {
      if (!fish.placed || Math.abs(fish.arc - focusArc) > 45) {
        fish.arc = focusArc + between(-30, 30);
        fish.side = between(-2.8, 2.8);
        fish.placed = true;
      }
      // Holding against the current, with the odd dart.
      if (fish.dart <= 0 && random() < dt * 0.15) fish.dart = 1;
      fish.dart = Math.max(0, fish.dart - dt * 1.5);
      fish.arc -= dt * (fish.dart * 3 + Math.sin(now * 0.0008 + fish.phase) * 0.15);
      fish.side += Math.sin(now * 0.0006 + fish.phase) * dt * 0.3;
      fish.side = THREE.MathUtils.clamp(fish.side, -3, 3);
      riverPoint(fish.arc, fish.side, fish.mesh.position);
      fish.mesh.position.y = -0.18;
      fish.mesh.rotation.y = riverHeading(fish.arc) + Math.PI + Math.sin(now * 0.004 + fish.phase) * 0.2;
    });

    dragonflies.forEach((fly, index) => {
      if (!fly.placed || fly.base.distanceTo(focus) > 25) {
        riverPoint(focusArc + between(-8, 8), (index ? -1 : 1) * (halfWidth + 0.6), fly.base);
        fly.group.position.copy(fly.base);
        fly.placed = true;
      }
      if (now > fly.nextHop) {
        fly.nextHop = now + between(700, 2600);
        fly.target.set(fly.base.x + between(-3.5, 3.5), between(0.7, 1.7), fly.base.z + between(-3.5, 3.5));
      }
      scratch.copy(fly.group.position);
      fly.group.position.lerp(fly.target, 0.12);
      fly.group.position.y += Math.sin(now * 0.02) * 0.004;
      if (scratch.distanceTo(fly.group.position) > 0.01) fly.group.rotation.y = Math.atan2(fly.target.x - scratch.x, fly.target.z - scratch.z);
      fly.wings.forEach((wing, side) => { wing.rotation.y = Math.sin(now * 0.09 + side) * 0.25; });
    });

    butterflies.forEach((butterfly, index) => {
      if (!butterfly.placed || butterfly.base.distanceTo(focus) > 30) {
        const angle = random() * Math.PI * 2;
        butterfly.base.set(focus.x + Math.cos(angle) * between(6, 12), 0, focus.z + Math.sin(angle) * between(6, 12));
        butterfly.placed = true;
      }
      const t = now * 0.001;
      butterfly.last.copy(butterfly.group.position);
      const x = butterfly.base.x + Math.sin(t * 0.31 + butterfly.phase) * 5 + Math.sin(t * 1.7 + index) * 0.6;
      const z = butterfly.base.z + Math.cos(t * 0.23 + butterfly.phase) * 5 + Math.cos(t * 1.3 + index) * 0.6;
      butterfly.group.position.set(x, world.groundHeight(x, z) + 0.8 + Math.sin(t * 2.6 + index) * 0.35, z);
      butterfly.group.rotation.y = Math.atan2(x - butterfly.last.x, z - butterfly.last.z);
      const beat = Math.sin(now * 0.025 + index) * 1.1;
      butterfly.left.rotation.z = beat;
      butterfly.right.rotation.z = -beat;
    });
  }

  /**
   * What's about near the walker: creatures to walk round. Creatures that are
   * startled by you move off a little.
   */
  function around(walker: THREE.Vector3, obstacles: Obstacle[]) {
    const flat = (at: THREE.Vector3) => Math.hypot(at.x - walker.x, at.z - walker.z);
    obstacles.push({ x: heron.position.x, z: heron.position.z, r: 0.7 });
    ducks.forEach((duck) => {
      obstacles.push({ x: duck.group.position.x, z: duck.group.position.z, r: 0.45 });
      // Ducks keep a polite distance, paddling out of your way.
      if (flat(duck.group.position) < 2.8) duck.side += Math.sign(duck.side || 1) * 0.04 * (Math.abs(duck.side) < halfWidth - 0.8 ? 1 : -1);
    });
    if (kingfisher.group.visible && flat(kingfisher.group.position) < 4) kingfisherStartle = walker.clone();
    if (rabbitNow) {
      obstacles.push({ x: rabbitNow.position.x, z: rabbitNow.position.z, r: 0.35 });
      rabbitStartle = flat(rabbitNow.position) < 4.5 ? walker.clone() : null;
    }
  }

  /** Place the always-about creatures once, for a still (reduced-motion) glade. */
  function settle(focus: THREE.Vector3) {
    update(performance.now(), 0, focus);
  }

  return { update, settle, around };
}

// --- The walker ---------------------------------------------------------------------

/**
 * You: a small, deliberately unremarkable figure. A loose knee-length smock in
 * faded blue over dark trousers, a round straw hat and a satchel for books.
 * Nothing about them says who they are; they are just someone out walking.
 */
export function makeWalker(keep: <T extends { dispose: () => void }>(thing: T) => T) {
  const lambert = (color: string) => keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }));
  const smock = lambert("#7f97a6");
  const trousers = lambert("#3a2a1c");
  const skin = lambert("#b98a62");
  const straw = lambert("#d4b26a");
  const satchelCloth = lambert("#9a6a3a");
  const limb = keep(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 8));
  limb.translate(0, -0.39, 0);
  const arm = keep(new THREE.CylinderGeometry(0.065, 0.055, 0.6, 8));
  arm.translate(0, -0.3, 0);
  const round = keep(new THREE.SphereGeometry(1, 14, 10));

  const figure = new THREE.Group();
  // A touch larger than life, so you can always find yourself in the painting.
  figure.scale.setScalar(1.6);
  const body = new THREE.Group();
  body.position.y = 0.8;
  figure.add(body);

  // An A-line smock from shoulders to knees: no waist, no shape that reads as anyone in particular.
  const tunic = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.19, 0.3, 0.95, 12)), smock);
  tunic.position.y = 0.26;
  const head = new THREE.Mesh(round, skin);
  head.scale.setScalar(0.14);
  head.position.y = 0.88;
  const brim = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.31, 0.31, 0.025, 18)), straw);
  brim.position.y = 0.97;
  const crown = new THREE.Mesh(round, straw);
  crown.scale.set(0.15, 0.09, 0.15);
  crown.position.y = 1.0;
  // A satchel on the hip, its strap across the body.
  const satchel = new THREE.Mesh(keep(new THREE.BoxGeometry(0.08, 0.24, 0.3)), satchelCloth);
  satchel.position.set(0.3, 0.12, 0);
  const strap = new THREE.Mesh(keep(new THREE.TorusGeometry(0.28, 0.018, 4, 24)), satchelCloth);
  strap.rotation.set(0, Math.PI / 2, 0.75);
  strap.position.set(0.02, 0.42, 0);
  body.add(tunic, head, brim, crown, satchel, strap);

  const legs = [-0.1, 0.1].map((x) => {
    const leg = new THREE.Mesh(limb, trousers);
    leg.position.set(x, -0.08, 0);
    body.add(leg);
    return leg;
  });
  const arms = [-0.24, 0.24].map((x) => {
    const piece = new THREE.Mesh(arm, smock);
    piece.position.set(x, 0.66, 0);
    body.add(piece);
    return piece;
  });

  let stride = 0;
  return {
    figure,
    /** Animate a walking (or standing) step; speed is how fast they're moving. */
    step(dt: number, speed: number, now: number) {
      stride += dt * speed * 3.2;
      const swing = Math.min(1, speed / 2) * 0.6;
      legs[0].rotation.x = Math.sin(stride) * swing;
      legs[1].rotation.x = -Math.sin(stride) * swing;
      arms[0].rotation.x = -Math.sin(stride) * swing * 0.8;
      arms[1].rotation.x = Math.sin(stride) * swing * 0.8;
      body.position.y = 0.8 + Math.abs(Math.cos(stride)) * 0.05 * Math.min(1, speed) + Math.sin(now * 0.002) * 0.005;
      // Standing still, they look about a little.
      const look = speed < 0.1 ? Math.sin(now * 0.0005) * 0.4 : 0;
      head.rotation.y = look;
      brim.rotation.y = look;
    },
  };
}
