import * as THREE from "three";
import type { Obstacle } from "./glade-life";
import { paintLook, seeded, smoothBlob } from "./glade-paint";

/**
 * Further along the river, for those who walk: a few creatures and a few
 * more water paintings, each in its own stretch, far enough apart that
 * coming across one feels like a find. None is labelled.
 *
 * Upstream
 * - Courbet's The Source of the Loue: a dark cave in a rock face on the far
 *   bank, a spring running out of it into the river.
 * - A roe deer drinking on the bank across from the oxbow. She looks up as you
 *   come near and bounds off if you come closer, and is back later.
 * - A pair of swans gliding slowly round the oxbow loop.
 *
 * Downstream
 * - Monet and Renoir's La Grenouillère: the little round island with its one
 *   tree, a gangway to the bank, and rowboats tied up beside it.
 * - Cuyp's cows, standing in the shallows, flicking their tails.
 * - Van Gogh's Langlois Bridge at Arles: an ochre drawbridge, its arms and
 *   chains overhead. It lifts to let the towed Temeraire through.
 * - A fox sitting at the edge of the trees, who trots off if you come near.
 * - Hiroshige's Sudden Shower: one stretch of river under its own small dark
 *   cloud and slanting rain, the water pricked with drops.
 */

type WandersWorld = {
  scene: THREE.Scene;
  keep: <T extends { dispose: () => void }>(thing: T) => T;
  groundHeight: (x: number, z: number) => number;
  /** A point on the river this far along it, this far to the side (+ is away from the eddies). */
  riverPoint: (arc: number, side: number) => THREE.Vector3;
  riverTangent: (arc: number) => THREE.Vector3;
  /** The arc of the main channel at this z (it skips the oxbow loop). */
  arcAt: (z: number) => number;
  halfWidth: number;
  wind: { value: number };
  ripple: (at: THREE.Vector3, size?: number) => void;
  /** Where the tug towing the Temeraire is now, so the drawbridge can open for it. */
  tugAt: THREE.Vector3;
};

/** The surface of the water. */
const WATER_Y = -0.32;

export function addWanders(world: WandersWorld) {
  const { scene, keep, groundHeight, riverPoint, riverTangent, arcAt, halfWidth, wind, ripple, tugAt } = world;
  const random = seeded(1889);
  const between = (low: number, high: number) => low + random() * (high - low);
  const obstacles: Obstacle[] = [];
  const material = (color: string, dapple = 0.25, extra: THREE.MeshLambertMaterialParameters = {}) => {
    const made = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...extra }));
    paintLook(made, { wind, dapple, dappleScale: 1.4 });
    return made;
  };
  const blob = keep(smoothBlob(2, 1));
  const box = (w: number, h: number, d: number) => keep(new THREE.BoxGeometry(w, h, d));
  const cylinder = (top: number, bottom: number, height: number, sides = 6) => keep(new THREE.CylinderGeometry(top, bottom, height, sides));
  const stick = cylinder(1, 1, 1, 5);
  const mesh = (geometry: THREE.BufferGeometry, made: THREE.Material, x = 0, y = 0, z = 0) => {
    const part = new THREE.Mesh(geometry, made);
    part.position.set(x, y, z);
    return part;
  };
  /** A blob squashed to an ellipsoid, for bodies and heads. */
  const lump = (made: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0) => {
    const part = mesh(blob, made, x, y, z);
    part.scale.set(sx, sy, sz);
    return part;
  };
  /** A leg or post from y = top down to y = top - length. */
  const leg = (made: THREE.Material, radius: number, length: number, x: number, top: number, z: number) => {
    const part = mesh(stick, made, x, top - length / 2, z);
    part.scale.set(radius, length, radius);
    return part;
  };
  /** Facing along the river (downstream), at this arc. */
  const headingAt = (arc: number) => {
    const along = riverTangent(arc);
    return Math.atan2(along.x, along.z);
  };
  const flat = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
  const updates: ((now: number, dt: number, walker: THREE.Vector3) => void)[] = [];
  // Background tableaux keep their timed motion but need not update every
  // rendered frame when they are far from the reader.
  function addDistantUpdate(at: THREE.Vector3, update: (now: number, dt: number, walker: THREE.Vector3) => void) {
    let lastRun = -Infinity;
    updates.push((now, dt, walker) => {
      const distance = Math.hypot(at.x - walker.x, at.z - walker.z);
      const interval = distance > 130 ? 650 : distance > 65 ? 200 : 0;
      if (interval && now - lastRun < interval) return;
      const elapsed = Number.isFinite(lastRun) ? Math.min(0.05, (now - lastRun) / 1000) : dt;
      lastRun = now;
      update(now, interval ? elapsed : dt, walker);
    });
  }
  // Ripples are shared with the rest of the river, so only make them where you'd see them.
  const lastWalker = new THREE.Vector3(1e6, 0, 1e6);
  const splash = (at: THREE.Vector3, size?: number) => { if (flat(at, lastWalker) < 45) ripple(at, size); };

  // --- Courbet's Source of the Loue -------------------------------------------------
  {
    const arc = arcAt(-165);
    const side = -(halfWidth + 8);
    const mouth = riverPoint(arc, side);
    // The cave looks out over the river.
    const toRiver = new THREE.Vector3().subVectors(riverPoint(arc, 0), mouth);
    const facing = Math.atan2(toRiver.x, toRiver.z);
    const cliff = new THREE.Group();
    const rockTones = ["#7c6f5c", "#8f8068", "#6a5e4e", "#9a8b70"].map((tone) => material(tone, 0.4));
    // A curved wall of rock, piled high and leaning in over a dark mouth.
    for (let index = 0; index < 11; index += 1) {
      const t = index / 10;
      const angle = (t - 0.5) * 2.4;
      const reach = 4.2 + Math.sin(index * 2.3) * 0.5;
      const rock = lump(rockTones[index % rockTones.length], between(1.6, 2.4), between(2.2, 3.6), between(1.4, 2));
      rock.position.set(Math.sin(angle) * reach, between(1, 2.2), -Math.cos(angle) * reach * 0.7 - 1);
      rock.rotation.set(between(-0.3, 0.3), between(0, 6), between(-0.2, 0.2));
      cliff.add(rock);
    }
    for (let index = 0; index < 4; index += 1) {
      const cap = lump(rockTones[(index + 2) % rockTones.length], between(2.2, 3), 1.4, 1.8);
      cap.position.set((index - 1.5) * 2.2, 4.6 + between(0, 0.6), -2.6);
      cliff.add(cap);
    }
    // The cave: a deep shadow the eye falls into.
    const dark = new THREE.Mesh(keep(new THREE.CircleGeometry(1.9, 20, 0, Math.PI)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#171310") })));
    dark.position.set(0, 0.25, -1.9);
    dark.scale.set(1, 1.35, 1);
    cliff.add(dark);
    // Moss and a little scrub on the ledges.
    const moss = material("#5f7340", 0.4);
    for (let index = 0; index < 5; index += 1) {
      const tuft = lump(moss, between(0.5, 0.9), 0.35, between(0.4, 0.7));
      tuft.position.set(between(-4, 4), between(3.2, 5.4), between(-3, -1.6));
      cliff.add(tuft);
    }
    cliff.position.set(mouth.x, groundHeight(mouth.x, mouth.z) - 0.2, mouth.z);
    cliff.rotation.y = facing;
    scene.add(cliff);
    cliff.updateMatrixWorld();
    obstacles.push({ x: mouth.x, z: mouth.z, r: 4.5 });

    // The spring: a pale run of water from the cave to the river.
    const start = new THREE.Vector3(0, 0, -1.2).applyMatrix4(cliff.matrixWorld);
    const end = riverPoint(arc, -(halfWidth - 0.5));
    const run = new THREE.Vector3().subVectors(end, start);
    const length = Math.hypot(run.x, run.z);
    const streamGeometry = keep(new THREE.PlaneGeometry(1.4, length, 2, 16));
    streamGeometry.rotateX(-Math.PI / 2);
    const position = streamGeometry.attributes.position as THREE.BufferAttribute;
    const middle = start.clone().lerp(end, 0.5);
    const angle = Math.atan2(run.x, run.z);
    for (let index = 0; index < position.count; index += 1) {
      const local = new THREE.Vector3(position.getX(index), 0, position.getZ(index)).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const x = middle.x + local.x;
      const z = middle.z + local.z;
      // Sat a little proud of the ground, which is coarser than its height map.
      position.setY(index, Math.max(groundHeight(x, z) + 0.2, WATER_Y + 0.06));
      // A little wobble so it reads as a natural run.
      position.setX(index, position.getX(index) + Math.sin(position.getZ(index) * 0.9) * 0.25);
    }
    streamGeometry.computeVertexNormals();
    const streamMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#a9d2d6"), transparent: true, opacity: 0.85 }));
    paintLook(streamMaterial, { wind, dapple: 0.5, dappleScale: 2 });
    const stream = new THREE.Mesh(streamGeometry, streamMaterial);
    stream.position.set(middle.x, 0, middle.z);
    stream.rotation.y = angle;
    scene.add(stream);
    let rippleAt = 0;
    addDistantUpdate(riverPoint(arc, 0), (now) => {
      if (now < rippleAt) return;
      rippleAt = now + 900;
      splash(end.clone(), 0.6);
    });
  }

  // --- Swans round the oxbow ---------------------------------------------------------
  {
    const from = arcAt(-128);
    const to = arcAt(-76);
    const white = material("#f4f1e8", 0.15);
    const black = material("#1e1b18", 0.1);
    const orange = material("#d9772a", 0.1);
    const makeSwan = () => {
      const swan = new THREE.Group();
      const body = lump(white, 0.42, 0.3, 0.72, 0, 0.2, 0);
      const tail = lump(white, 0.24, 0.18, 0.3, 0, 0.32, -0.62);
      tail.rotation.x = -0.5;
      // The neck: an S rising from the breast, carried well back.
      const neckPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.3, 0.5), new THREE.Vector3(0, 0.7, 0.66), new THREE.Vector3(0, 1.05, 0.48), new THREE.Vector3(0, 1.22, 0.6),
      ]);
      const neck = new THREE.Mesh(keep(new THREE.TubeGeometry(neckPath, 14, 0.065, 6)), white);
      const head = lump(white, 0.1, 0.09, 0.16, 0, 1.24, 0.66);
      const beak = mesh(keep(new THREE.ConeGeometry(0.045, 0.2, 6)), orange, 0, 1.21, 0.83);
      beak.rotation.x = Math.PI / 2 + 0.25;
      const knob = lump(black, 0.04, 0.04, 0.05, 0, 1.25, 0.76);
      swan.add(body, tail, neck, head, beak, knob);
      swan.scale.setScalar(1.35);
      scene.add(swan);
      return swan;
    };
    const swans = [makeSwan(), makeSwan()];
    const span = to - from;
    let wakeAt = 0;
    addDistantUpdate(riverPoint((from + to) / 2, 0), (now) => {
      const t = now / 1000;
      swans.forEach((swan, index) => {
        // Unhurried, there and back round the loop, one a little behind the other.
        const cycle = ((t * 0.32 - index * 2.4) / span) % 2;
        const goingDown = (cycle + 2) % 2 < 1;
        const k = goingDown ? (cycle + 2) % 1 : 1 - ((cycle + 2) % 1);
        const arc = from + k * span;
        const side = Math.sin(t * 0.07 + index * 1.3) * 1.4 + (index ? 0.6 : -0.4);
        const at = riverPoint(arc, side);
        swan.position.set(at.x, WATER_Y - 0.12 + Math.sin(t * 1.2 + index) * 0.02, at.z);
        swan.rotation.y = headingAt(arc) + (goingDown ? 0 : Math.PI);
        if (now > wakeAt && index === 0) {
          wakeAt = now + 1600;
          swans.forEach((other) => splash(other.position.clone(), 0.5));
        }
      });
    });
  }

  // --- A roe deer --------------------------------------------------------------------
  {
    const arc = arcAt(-86);
    const home = riverPoint(arc, -(halfWidth + 1.6));
    home.y = groundHeight(home.x, home.z);
    const coat = material("#8f5a30", 0.3);
    const pale = material("#efe4cf", 0.2);
    const dark = material("#2a201a", 0.1);
    const deer = new THREE.Group();
    const body = lump(coat, 0.32, 0.3, 0.7, 0, 1.05, 0);
    const rump = lump(pale, 0.2, 0.2, 0.08, 0, 1.08, -0.68);
    const legs = [[-0.16, 0.42], [0.16, 0.42], [-0.16, -0.45], [0.16, -0.45]].map(([x, z]) => leg(coat, 0.045, 0.95, x, 1, z));
    // The neck and head turn together, from drinking to alert.
    const neck = new THREE.Group();
    neck.position.set(0, 1.2, 0.55);
    const neckBone = mesh(stick, coat, 0, 0.32, 0.08);
    neckBone.scale.set(0.1, 0.7, 0.1);
    neckBone.rotation.x = 0.35;
    const head = lump(coat, 0.13, 0.13, 0.24, 0, 0.7, 0.26);
    const nose = lump(dark, 0.05, 0.05, 0.05, 0, 0.66, 0.5);
    const ears = [-1, 1].map((sx) => {
      const ear = lump(coat, 0.05, 0.12, 0.03, sx * 0.1, 0.86, 0.18);
      ear.rotation.z = sx * 0.5;
      return ear;
    });
    neck.add(neckBone, head, nose, ...ears);
    deer.add(body, rump, ...legs, neck);
    deer.scale.setScalar(1.3);
    // Facing the water to drink.
    const towardWater = new THREE.Vector3().subVectors(riverPoint(arc, 0), home);
    const drinkHeading = Math.atan2(towardWater.x, towardWater.z);
    deer.position.copy(home);
    deer.rotation.y = drinkHeading;
    scene.add(deer);

    let mood: "drinking" | "alert" | "fleeing" | "away" = "drinking";
    let lift = 0;
    let fledAt = 0;
    const fleeFrom = new THREE.Vector3();
    addDistantUpdate(home, (now, dt, walker) => {
      const near = flat(walker, home);
      if (mood === "away") {
        if (now - fledAt > 60_000 && near > 28) {
          mood = "drinking";
          deer.visible = true;
          deer.position.copy(home);
          deer.rotation.y = drinkHeading;
          deer.scale.setScalar(1.3);
        }
        return;
      }
      if (mood !== "fleeing") {
        mood = near < 9 ? "fleeing" : near < 16 ? "alert" : "drinking";
        if (mood === "fleeing") { fledAt = now; fleeFrom.copy(walker); }
      }
      const t = now / 1000;
      if (mood === "drinking") {
        // Head down to the water, up now and then to look about.
        const look = Math.sin(t * 0.35) > 0.75 ? 1 : 0;
        lift += (look - lift) * Math.min(1, dt * 2);
      } else {
        lift += (1 - lift) * Math.min(1, dt * 5);
      }
      neck.rotation.x = THREE.MathUtils.lerp(1.6, 0, lift);
      if (mood === "alert") {
        const toWalker = Math.atan2(walker.x - deer.position.x, walker.z - deer.position.z);
        neck.rotation.y = THREE.MathUtils.clamp(Math.atan2(Math.sin(toWalker - deer.rotation.y), Math.cos(toWalker - deer.rotation.y)), -1.2, 1.2) * 0.8;
      }
      if (mood === "fleeing") {
        const since = (now - fledAt) / 1000;
        const away = new THREE.Vector3(deer.position.x - fleeFrom.x, 0, deer.position.z - fleeFrom.z).normalize();
        deer.rotation.y = Math.atan2(away.x, away.z);
        neck.rotation.y = 0;
        deer.position.addScaledVector(away, dt * 7);
        // Bounding: up and over in long springs.
        deer.position.y = groundHeight(deer.position.x, deer.position.z) + Math.abs(Math.sin(since * 6)) * 0.6;
        const fade = Math.max(0.001, 1 - since / 3);
        deer.scale.setScalar(1.3 * fade);
        if (since > 3) { mood = "away"; deer.visible = false; }
      }
    });
  }

  // --- La Grenouillère ---------------------------------------------------------------
  {
    const arc = arcAt(62);
    const side = -(halfWidth - 0.9);
    const at = riverPoint(arc, side);
    const heading = headingAt(arc);
    const island = new THREE.Group();
    const rim = mesh(cylinder(1.5, 1.6, 0.5, 18), material("#8a6a44", 0.3), 0, 0, 0);
    const turf = mesh(cylinder(1.45, 1.45, 0.12, 18), material("#7fa04f", 0.45), 0, 0.28, 0);
    const trunk = mesh(cylinder(0.08, 0.14, 2.2, 6), material("#5a4632", 0.2), 0.2, 1.4, 0.1);
    const crownMaterial = material("#6f8f45", 0.45);
    const crown = lump(crownMaterial, 1.1, 0.95, 1.05, 0.15, 2.8, 0.05);
    const crown2 = lump(crownMaterial, 0.7, 0.6, 0.7, -0.5, 2.5, 0.4);
    island.add(rim, turf, trunk, crown, crown2);
    // Bathers' bright clothes left on the grass.
    ["#e2e5ee", "#d86a4f", "#2f4f7a"].forEach((tone, index) => {
      const cloth = mesh(box(0.35, 0.05, 0.25), material(tone, 0.2), Math.cos(index * 2.1) * 0.9, 0.36, Math.sin(index * 2.1) * 0.9);
      cloth.rotation.y = index;
      island.add(cloth);
    });
    island.position.set(at.x, WATER_Y - 0.05, at.z);
    island.rotation.y = heading;
    scene.add(island);

    // A plank gangway to the bank.
    const bank = riverPoint(arc, -(halfWidth + 1.8));
    const gangway = new THREE.Vector3().subVectors(bank, at);
    const gangLength = Math.hypot(gangway.x, gangway.z);
    const plank = mesh(box(0.7, 0.08, gangLength), material("#a07e55", 0.25));
    plank.position.set((at.x + bank.x) / 2, 0.2, (at.z + bank.z) / 2);
    plank.rotation.y = Math.atan2(gangway.x, gangway.z);
    scene.add(plank);

    // Rowboats tied up downstream of it, in summer colours.
    const boats = ["#e9e2d1", "#3e6a8a", "#c25a3c"].map((tone, index) => {
      const boat = rowboat(tone);
      const boatArc = arc + 2.4 + index * 1.6;
      const spot = riverPoint(boatArc, side + 0.3 + (index % 2) * 0.6);
      boat.position.set(spot.x, WATER_Y, spot.z);
      boat.rotation.y = headingAt(boatArc) + Math.PI / 2 + between(-0.25, 0.25);
      boat.userData.phase = index * 1.7;
      scene.add(boat);
      return boat;
    });
    addDistantUpdate(riverPoint(arc, 0), (now) => {
      const t = now / 1000;
      boats.forEach((boat) => {
        boat.position.y = WATER_Y - 0.02 + Math.sin(t * 1.3 + boat.userData.phase) * 0.03;
        boat.rotation.z = Math.sin(t * 1.1 + boat.userData.phase) * 0.04;
      });
    });
  }

  /** A small open rowboat, its bow along local +z. */
  function rowboat(tone: string) {
    const boat = new THREE.Group();
    const hullMaterial = material(tone, 0.2);
    const inside = material("#6b4a2e", 0.2);
    const geometry = box(0.7, 0.28, 2, );
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index += 1) {
      const z = position.getZ(index);
      const y = position.getY(index);
      const taper = THREE.MathUtils.smoothstep(Math.abs(z), 0.3, 1);
      position.setX(index, position.getX(index) * (1 - taper * (z > 0 ? 0.9 : 0.45)) * (y < 0 ? 0.7 : 1));
      if (y > 0) position.setY(index, y + taper * 0.08);
    }
    geometry.computeVertexNormals();
    const hull = mesh(geometry, hullMaterial, 0, 0.1, 0);
    const well = mesh(box(0.5, 0.05, 1.3), inside, 0, 0.2, -0.05);
    const thwart = mesh(box(0.62, 0.05, 0.16), inside, 0, 0.26, 0.1);
    const oars = [-1, 1].map((sx) => {
      const oar = mesh(stick, inside, sx * 0.3, 0.27, -0.1);
      oar.scale.set(0.025, 1.7, 0.025);
      oar.rotation.set(Math.PI / 2 - 0.1, 0, sx * 0.12);
      return oar;
    });
    boat.add(hull, well, thwart, ...oars);
    return boat;
  }

  // --- Cuyp's cows -------------------------------------------------------------------
  {
    const arc = arcAt(84);
    const coats = [
      { hide: "#8a4a2a", patch: "#e8dcc4" },
      { hide: "#e6dac2", patch: "#7c4426" },
      { hide: "#3a2e26", patch: "#e8dcc4" },
    ];
    const horn = material("#e8dfc8", 0.1);
    const cows = coats.map((coat, index) => {
      const hide = material(coat.hide, 0.3);
      const patch = material(coat.patch, 0.3);
      const cow = new THREE.Group();
      const body = lump(hide, 0.46, 0.45, 0.95, 0, 1.0, 0);
      const flank = lump(patch, 0.3, 0.3, 0.38, index % 2 ? 0.2 : -0.2, 1.08, -0.1);
      const legs = [[-0.24, 0.56], [0.24, 0.56], [-0.24, -0.6], [0.24, -0.6]].map(([x, z]) => leg(hide, 0.07, 0.85, x, 0.85, z));
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.18, 0.92);
      const head = lump(hide, 0.2, 0.2, 0.32, 0, 0, 0.18);
      const muzzle = lump(patch, 0.15, 0.12, 0.12, 0, -0.06, 0.44);
      const horns = [-1, 1].map((sx) => {
        const piece = mesh(stick, horn, sx * 0.2, 0.16, 0.08);
        piece.scale.set(0.03, 0.22, 0.03);
        piece.rotation.z = -sx * 1.0;
        return piece;
      });
      headGroup.add(head, muzzle, ...horns);
      const tail = new THREE.Group();
      tail.position.set(0, 1.25, -0.95);
      const tailPiece = mesh(stick, hide, 0, -0.35, 0);
      tailPiece.scale.set(0.025, 0.7, 0.025);
      tail.add(tailPiece);
      cow.add(body, flank, ...legs, headGroup, tail);
      // Two stand in the water, one on the bank above them.
      const inWater = index < 2;
      const cowArc = arc + index * 2.6;
      const spot = riverPoint(cowArc, inWater ? halfWidth - 1.2 - index * 0.5 : halfWidth + 2.2);
      const ground = groundHeight(spot.x, spot.z);
      cow.position.set(spot.x, inWater ? Math.max(ground, -1) + 0.05 : ground, spot.z);
      cow.rotation.y = headingAt(cowArc) + (index === 1 ? Math.PI * 0.8 : -Math.PI * 0.4);
      // Bigger than you are, as cows are.
      cow.scale.setScalar(1.55);
      cow.userData = { phase: index * 2.3, headGroup, tail, inWater };
      scene.add(cow);
      obstacles.push({ x: spot.x, z: spot.z, r: 1.6 });
      return cow;
    });
    let rippleAt = 0;
    addDistantUpdate(riverPoint(arc, 0), (now) => {
      const t = now / 1000;
      cows.forEach((cow) => {
        const { phase, headGroup, tail } = cow.userData as { phase: number; headGroup: THREE.Group; tail: THREE.Group };
        tail.rotation.z = Math.sin(t * 2.2 + phase) * 0.35 * (Math.sin(t * 0.3 + phase) > 0.2 ? 1 : 0.15);
        headGroup.rotation.x = 0.25 + Math.max(0, Math.sin(t * 0.12 + phase)) * 0.6;
      });
      if (now > rippleAt) {
        rippleAt = now + 2800;
        const cow = cows[Math.floor(random() * 2)];
        splash(cow.position.clone(), 0.8);
      }
    });
  }

  // --- Van Gogh's Langlois Bridge ----------------------------------------------------
  {
    const arc = arcAt(104);
    const centre = riverPoint(arc, 0);
    const along = riverTangent(arc);
    const across = new THREE.Vector3(-along.z, 0, along.x).normalize();
    const bridge = new THREE.Group();
    bridge.position.set(centre.x, 0, centre.z);
    // Local x runs across the river, local z along it.
    bridge.rotation.y = Math.atan2(-across.z, across.x);
    scene.add(bridge);
    const ochre = material("#d8a53c", 0.25);
    const timber = material("#9b7337", 0.25);
    const stone = material("#bcae8e", 0.35);
    const reach = halfWidth + 0.6;
    const DECK_Y = 0.95;
    const halves = [1, -1].map((sx) => {
      // A stone pier on the bank, and the timber frame above it.
      const pier = mesh(box(2.4, 1.6, 3.2), stone, sx * (reach + 1.2), 0.2, 0);
      const posts = [-1.2, 1.2].map((z) => leg(ochre, 0.09, 3.6, sx * (reach + 0.3), DECK_Y + 3.6, z));
      const beam = mesh(box(0.2, 0.2, 2.8), ochre, sx * (reach + 0.3), DECK_Y + 3.6, 0);
      bridge.add(pier, ...posts, beam);
      // The leaf: hinged at the pier, reaching to meet its partner mid-river.
      const leaf = new THREE.Group();
      leaf.position.set(sx * reach, DECK_Y, 0);
      const deck = mesh(box(reach, 0.16, 2.2), timber, -sx * reach / 2, 0, 0);
      const rails = [-1.05, 1.05].map((z) => mesh(box(reach, 0.08, 0.06), ochre, -sx * reach / 2, 0.55, z));
      const railPosts = [0.25, 0.5, 0.75].flatMap((k) => [-1.05, 1.05].map((z) => leg(ochre, 0.03, 0.55, -sx * reach * k, 0.55, z)));
      leaf.add(deck, ...rails, ...railPosts);
      bridge.add(leaf);
      // The lifting arm: a long beam across the top, counterweighted at the back.
      const arm = new THREE.Group();
      arm.position.set(sx * (reach + 0.3), DECK_Y + 3.75, 0);
      const armBeam = mesh(box(reach + 2.2, 0.16, 0.16), ochre, -sx * (reach - 2.2) / 2, 0, 0);
      const weight = mesh(box(0.6, 0.5, 0.5), timber, sx * 1.6, -0.1, 0);
      arm.add(armBeam, weight);
      bridge.add(arm);
      const chain = new THREE.Line(
        keep(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3))),
        keep(new THREE.LineBasicMaterial({ color: new THREE.Color("#3b2e22") })),
      );
      bridge.add(chain);
      const pierAt = centre.clone().addScaledVector(across, sx * (reach + 1.2));
      obstacles.push({ x: pierAt.x, z: pierAt.z, r: 1.6 });
      return { sx, leaf, arm, chain };
    });
    let lift = 0;
    const tip = new THREE.Vector3();
    const armTip = new THREE.Vector3();
    const place = () => {
      halves.forEach(({ sx, leaf, arm, chain }) => {
        leaf.rotation.z = -sx * lift * 1.25;
        arm.rotation.z = -sx * lift * 0.55;
        leaf.updateMatrix();
        arm.updateMatrix();
        tip.set(-sx * reach * 0.92, 0.1, 0).applyMatrix4(leaf.matrix);
        armTip.set(-sx * (reach - 0.2), 0, 0).applyMatrix4(arm.matrix);
        const positions = chain.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, armTip.x, armTip.y, armTip.z);
        positions.setXYZ(1, tip.x, tip.y, tip.z);
        positions.needsUpdate = true;
      });
    };
    place();
    addDistantUpdate(centre, (now, dt) => {
      // Up for the Temeraire and her tug, down again once they're through.
      const open = flat(tugAt, centre) < 22 ? 1 : 0;
      const next = lift + (open - lift) * Math.min(1, dt * 0.6);
      if (Math.abs(next - lift) < 0.0005) return;
      lift = next;
      place();
    });
  }

  // --- A fox -------------------------------------------------------------------------
  {
    const arc = arcAt(120);
    const home = riverPoint(arc, halfWidth + 9);
    home.y = groundHeight(home.x, home.z);
    const red = material("#c4652a", 0.3);
    const white = material("#f2ebdd", 0.15);
    const black = material("#231c17", 0.1);
    const fox = new THREE.Group();
    const body = lump(red, 0.2, 0.24, 0.42, 0, 0.42, -0.05);
    body.rotation.x = -0.5;
    const chest = lump(white, 0.13, 0.17, 0.1, 0, 0.5, 0.2);
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0.18);
    const skull = lump(red, 0.13, 0.12, 0.14);
    const snout = lump(white, 0.06, 0.05, 0.12, 0, -0.03, 0.15);
    const nose = lump(black, 0.025, 0.025, 0.025, 0, -0.02, 0.27);
    const ears = [-1, 1].map((sx) => {
      const ear = mesh(keep(new THREE.ConeGeometry(0.05, 0.13, 4)), black, sx * 0.07, 0.13, -0.02);
      ear.rotation.z = -sx * 0.25;
      return ear;
    });
    head.add(skull, snout, nose, ...ears);
    const legs = [-0.07, 0.07].map((x) => leg(red, 0.025, 0.4, x, 0.4, 0.16));
    const paws = [-0.07, 0.07].map((x) => lump(black, 0.035, 0.025, 0.05, x, 0.02, 0.18));
    // The brush, curled round the paws, with its white tip.
    const tail = new THREE.Group();
    tail.position.set(0, 0.12, -0.28);
    const brush = lump(red, 0.09, 0.08, 0.32, 0.12, 0, 0.1);
    brush.rotation.y = 0.9;
    const tipPiece = lump(white, 0.06, 0.06, 0.08, 0.32, 0, 0.32);
    tail.add(brush, tipPiece);
    fox.add(body, chest, head, ...legs, ...paws, tail);
    fox.scale.setScalar(1.5);
    const towardRiver = new THREE.Vector3().subVectors(riverPoint(arc, 0), home);
    const sitHeading = Math.atan2(towardRiver.x, towardRiver.z);
    fox.position.copy(home);
    fox.rotation.y = sitHeading;
    scene.add(fox);

    let mood: "sitting" | "trotting" | "away" = "sitting";
    let leftAt = 0;
    const away = new THREE.Vector3();
    addDistantUpdate(home, (now, dt, walker) => {
      const near = flat(walker, home);
      const t = now / 1000;
      if (mood === "away") {
        if (now - leftAt > 45_000 && near > 30) {
          mood = "sitting";
          fox.visible = true;
          fox.position.copy(home);
          fox.rotation.y = sitHeading;
          fox.scale.setScalar(1.5);
        }
        return;
      }
      if (mood === "sitting") {
        // Watching you, ears up, the tail-tip twitching.
        const toWalker = Math.atan2(walker.x - fox.position.x, walker.z - fox.position.z);
        const turn = Math.atan2(Math.sin(toWalker - fox.rotation.y), Math.cos(toWalker - fox.rotation.y));
        head.rotation.y += (THREE.MathUtils.clamp(near < 30 ? turn : Math.sin(t * 0.2) * 0.6, -1.1, 1.1) - head.rotation.y) * Math.min(1, dt * 3);
        tail.rotation.y = Math.sin(t * 1.7) * 0.08;
        if (near < 10) {
          mood = "trotting";
          leftAt = now;
          away.set(fox.position.x - walker.x, 0, fox.position.z - walker.z).normalize();
        }
        return;
      }
      const since = (now - leftAt) / 1000;
      fox.rotation.y = Math.atan2(away.x, away.z);
      head.rotation.y = 0;
      fox.position.addScaledVector(away, dt * 4.5);
      fox.position.y = groundHeight(fox.position.x, fox.position.z) + Math.abs(Math.sin(since * 9)) * 0.08;
      fox.scale.setScalar(1.5 * Math.max(0.001, 1 - since / 2.6));
      if (since > 2.6) { mood = "away"; fox.visible = false; }
    });
  }

  // --- Hiroshige's Sudden Shower -----------------------------------------------------
  const showerCentre = riverPoint(arcAt(134), 0);
  {
    const SIZE = 11;
    const HEIGHT = 9;
    const cloudMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#5f6670"), transparent: true, opacity: 0.82 }));
    paintLook(cloudMaterial, { wind, dapple: 0.3, dappleScale: 0.8 });
    const cloud = new THREE.Group();
    for (let index = 0; index < 7; index += 1) {
      const puff = lump(cloudMaterial, between(2.4, 3.6), between(1.1, 1.6), between(2, 3), between(-4, 4), between(-0.3, 0.4), between(-3, 3));
      cloud.add(puff);
    }
    cloud.position.set(showerCentre.x, HEIGHT + 1.2, showerCentre.z);
    scene.add(cloud);
    // Fine dark streaks slanting down, as in the print. Each is a pair of
    // crossed slivers, so it reads from any side and survives the paint.
    const COUNT = 420;
    const SLANT = new THREE.Vector3(0.35, -1, 0.12).normalize();
    const streakGeometry = (() => {
      const one = new THREE.PlaneGeometry(0.06, 1.5);
      const two = one.clone().rotateY(Math.PI / 2);
      const merged = new THREE.BufferGeometry();
      const positions = [...one.attributes.position.array, ...two.attributes.position.array];
      merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      merged.setIndex([...(one.index?.array ?? []), ...Array.from(two.index?.array ?? [], (index) => index + one.attributes.position.count)]);
      one.dispose();
      two.dispose();
      return keep(merged);
    })();
    const rain = new THREE.InstancedMesh(
      streakGeometry,
      keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#35404d"), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })),
      COUNT,
    );
    rain.frustumCulled = false;
    scene.add(rain);
    const seeds = Array.from({ length: COUNT }, () => ({ x: between(-SIZE / 2, SIZE / 2), z: between(-SIZE / 2, SIZE / 2), phase: random() }));
    const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), SLANT);
    const streak = new THREE.Matrix4();
    const streakAt = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    let dropAt = 0;
    addDistantUpdate(showerCentre, (now) => {
      const t = now / 1000;
      seeds.forEach((seed, index) => {
        const fall = (seed.phase + t * 0.9) % 1;
        const y = HEIGHT - fall * (HEIGHT - WATER_Y);
        const x = seed.x + (HEIGHT - y) * (SLANT.x / -SLANT.y) - 2;
        const z = seed.z + (HEIGHT - y) * (SLANT.z / -SLANT.y);
        streakAt.set(showerCentre.x + x, y, showerCentre.z + z);
        rain.setMatrixAt(index, streak.compose(streakAt, tilt, one));
      });
      rain.instanceMatrix.needsUpdate = true;
      cloud.position.x = showerCentre.x + Math.sin(t * 0.05) * 0.8;
      // Drops pricking the water.
      if (now > dropAt) {
        dropAt = now + 170;
        const at = riverPoint(arcAt(134) + between(-SIZE / 2, SIZE / 2), between(-halfWidth + 0.5, halfWidth - 0.5));
        splash(at, between(0.25, 0.5));
      }
    });
  }

  function update(now: number, dt: number, walker: THREE.Vector3) {
    lastWalker.copy(walker);
    updates.forEach((step) => step(now, dt, walker));
  }

  return {
    obstacles,
    update,
    /** Where the rain falls, so you can hear it as you come near. */
    showerAt: showerCentre,
  };
}
