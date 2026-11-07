import * as THREE from "three";
import type { Obstacle } from "./glade-life";
import { paintLook, seeded, smoothBlob } from "./glade-paint";

/**
 * Four more river paintings, quoted along the banks:
 *
 * - Thomas Cole's The Oxbow: upstream the river itself swings round a great
 *   loop, wrapping a peninsula of patchwork fields, with a storm-broken tree
 *   on the near bank looking out over it.
 * - Seurat's A Sunday on La Grande Jatte: parasols planted in the grass on the
 *   bank, their canopies painted in dots of complementary colour.
 * - Turner's The Fighting Temeraire: a hobbyist's model of the old warship,
 *   pale as a ghost, towed downstream by a little black steam tug.
 * - Waterhouse's The Lady of Shalott: just her boat, moored in the reeds, with
 *   its tapestry over the side and three candles at the prow, one still lit.
 */

/** The land inside the river's oxbow loop: its middle, and how far it reaches. */
export type Oxbow = {
  centre: THREE.Vector3;
  radius: number;
};

type GalleryWorld = {
  scene: THREE.Scene;
  keep: <T extends { dispose: () => void }>(thing: T) => T;
  groundHeight: (x: number, z: number) => number;
  /** A point on the river this far along it, this far to the side (+ is away from the eddies). */
  riverPoint: (arc: number, side: number) => THREE.Vector3;
  riverTangent: (arc: number) => THREE.Vector3;
  arcAt: (z: number) => number;
  halfWidth: number;
  oxbow: Oxbow;
  wind: { value: number };
};

export function addGallery(world: GalleryWorld) {
  const { scene, keep, groundHeight, riverPoint, riverTangent, arcAt, halfWidth, oxbow, wind } = world;
  const random = seeded(1834);
  const obstacles: Obstacle[] = [];
  const material = (color: string, dapple = 0.25, extra: THREE.MeshLambertMaterialParameters = {}) => {
    const made = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...extra }));
    paintLook(made, { wind, dapple, dappleScale: 1.4 });
    return made;
  };
  const box = (w: number, h: number, d: number, sw = 1, sh = 1, sd = 1) => keep(new THREE.BoxGeometry(w, h, d, sw, sh, sd));
  const cylinder = (top: number, bottom: number, height: number, sides = 6) => keep(new THREE.CylinderGeometry(top, bottom, height, sides));
  const shadowMaterial = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#3a2a14"), transparent: true, opacity: 0.18, depthWrite: false }));
  const shadowGeometry = keep(new THREE.CircleGeometry(1, 20));
  shadowGeometry.rotateX(-Math.PI / 2);

  /** A hull: a box drawn to a point at the bow (+x), and a little at the stern. */
  function hullGeometry(length: number, height: number, width: number, { bow = 0.92, stern = 0.3, sheer = 0 } = {}) {
    const geometry = new THREE.BoxGeometry(length, height, width, 10, 2, 2);
    const position = geometry.attributes.position;
    const half = length / 2;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const toBow = THREE.MathUtils.smoothstep(x, half * 0.25, half);
      const toStern = THREE.MathUtils.smoothstep(-x, half * 0.6, half);
      const keel = y < 0 ? 0.6 : 1;
      position.setZ(index, z * (1 - toBow * bow - toStern * stern) * keel);
      // The sheer: ends sweep up.
      if (y > 0) position.setY(index, y + (toBow * toBow + toStern * toStern * 0.6) * sheer);
    }
    geometry.computeVertexNormals();
    return keep(geometry);
  }

  // --- The Oxbow ---------------------------------------------------------------------
  {
    // The peninsula's patchwork: strips of wheat, stubble and pasture laid
    // over the ground, as Cole painted the cleared land inside the bend.
    const tones = ["#c9b25e", "#94a556", "#b88a4a", "#a9b86c", "#d6c27a", "#7f9850"];
    const lay = Math.atan2(oxbow.centre.z, oxbow.centre.x) + 0.4;
    const span = oxbow.radius * 1.5;
    const across = span / 3;
    let tone = 0;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const width = span / 2 - 0.5;
        const depth = across - 0.5;
        const geometry = keep(new THREE.PlaneGeometry(width, depth, 6, 4));
        geometry.rotateX(-Math.PI / 2);
        geometry.rotateY(lay);
        const offset = new THREE.Vector3((column - 0.5) * (span / 2), 0, (row - 1) * across).applyAxisAngle(new THREE.Vector3(0, 1, 0), lay);
        const middle = oxbow.centre.clone().add(offset);
        if (Math.hypot(offset.x, offset.z) + Math.max(width, depth) / 2 > oxbow.radius + 1.5) continue;
        const position = geometry.attributes.position as THREE.BufferAttribute;
        for (let index = 0; index < position.count; index += 1) {
          const x = middle.x + position.getX(index);
          const z = middle.z + position.getZ(index);
          position.setY(index, groundHeight(x, z) + 0.05);
        }
        geometry.computeVertexNormals();
        const field = new THREE.Mesh(geometry, material(tones[tone % tones.length], 0.35, { polygonOffset: true, polygonOffsetFactor: -2 }));
        tone += 1;
        field.position.set(middle.x, 0, middle.z);
        scene.add(field);
      }
    }

    // Cole's storm-broken tree, on the near bank downstream of the loop, so
    // from the glade you look past it and out over the bend.
    const treeAt = oxbow.centre.clone().add(new THREE.Vector3(-6, 0, oxbow.radius + 22));
    const bark = material("#5b4a38", 0.15);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(cylinder(0.18, 0.42, 4.2, 7), bark);
    trunk.position.y = 2.1;
    trunk.rotation.z = 0.12;
    tree.add(trunk);
    // Snapped branches, bare, reaching off to one side.
    for (const [y, length, tilt, spin] of [[3.4, 2.2, 1.0, 0.4], [2.6, 1.6, -1.15, 2.2], [3.9, 1.2, 0.7, 3.6], [1.9, 1.1, 1.3, 5.1]]) {
      const branch = new THREE.Mesh(cylinder(0.04, 0.12, length, 5), bark);
      branch.geometry = keep(branch.geometry.clone().translate(0, length / 2, 0));
      branch.position.set(0, y, 0);
      branch.rotation.set(0, spin, tilt);
      tree.add(branch);
    }
    // A last ragged scrap of autumn leaves.
    const leaves = new THREE.Mesh(keep(smoothBlob(2, 1.1)), material("#9a6a2a", 0.4));
    leaves.scale.set(1.1, 0.7, 0.9);
    leaves.position.set(-1.2, 4.3, 0.3);
    tree.add(leaves);
    tree.position.set(treeAt.x, groundHeight(treeAt.x, treeAt.z) - 0.1, treeAt.z);
    scene.add(tree);
    obstacles.push({ x: treeAt.x, z: treeAt.z, r: 0.6 });
  }

  // --- Seurat's parasols --------------------------------------------------------------
  {
    // Each canopy is a colour laid down in dots of itself and its complement.
    const schemes: [string, string[]][] = [
      ["#c8502e", ["#e8873e", "#7a2c22", "#3d6fa8", "#f0c070"]],
      ["#2f4f8a", ["#4f78b8", "#1e2f5a", "#e08a3a", "#9ab0d8"]],
      ["#ece3cc", ["#ffffff", "#d8c49a", "#9ab0d8", "#e8a070"]],
      ["#6a4a8a", ["#9a72b8", "#3e2a5a", "#d8c050", "#c8a8d8"]],
      ["#d8b040", ["#f0d070", "#a8802a", "#6a4a9a", "#fff0b0"]],
    ];
    const canopies = schemes.map(([base, dots]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = base;
        context.fillRect(0, 0, 128, 64);
        for (let index = 0; index < 900; index += 1) {
          context.fillStyle = dots[index % dots.length];
          context.beginPath();
          context.arc(random() * 128, random() * 64, 1.1 + random() * 1.3, 0, Math.PI * 2);
          context.fill();
        }
      }
      const texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      return keep(new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }));
    });
    const canopyGeometry = keep(new THREE.ConeGeometry(1.25, 0.5, 14, 1, true));
    const poleGeometry = cylinder(0.025, 0.03, 2.2, 5);
    const pole = material("#3a2a1c", 0.1);
    const finialGeometry = keep(new THREE.SphereGeometry(0.06, 6, 4));
    const spots: THREE.Vector3[] = [];
    for (let attempt = 0; attempt < 60 && spots.length < 7; attempt += 1) {
      const arc = arcAt(14 + random() * 22);
      const at = riverPoint(arc, halfWidth + 4 + random() * 9);
      if (spots.some((other) => other.distanceTo(at) < 3.2)) continue;
      spots.push(at);
    }
    spots.forEach((at, index) => {
      const parasol = new THREE.Group();
      const stick = new THREE.Mesh(poleGeometry, pole);
      stick.position.y = 1.1;
      const canopy = new THREE.Mesh(canopyGeometry, canopies[index % canopies.length]);
      canopy.position.y = 2.25;
      const finial = new THREE.Mesh(finialGeometry, pole);
      finial.position.y = 2.52;
      parasol.add(stick, canopy, finial);
      // Planted at a slant, as if dropped into the grass for the afternoon.
      parasol.rotation.set((random() - 0.5) * 0.5, random() * Math.PI * 2, (random() - 0.5) * 0.5);
      parasol.position.set(at.x, groundHeight(at.x, at.z) - 0.05, at.z);
      scene.add(parasol);
      const shade = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shade.scale.setScalar(1.15);
      shade.position.set(at.x + 0.3, groundHeight(at.x, at.z) + 0.03, at.z + 0.2);
      scene.add(shade);
      obstacles.push({ x: at.x, z: at.z, r: 0.35 });
    });
  }

  // --- A model of the Fighting Temeraire, under tow -------------------------------------
  const ghost = material("#e2d6b6", 0.2);
  const ghostDark = material("#8a7a5a", 0.15);
  const spar = material("#a89a78", 0.1);
  const temeraire = new THREE.Group();
  {
    const hull = new THREE.Mesh(hullGeometry(2.1, 0.46, 0.6, { bow: 0.85, stern: 0.15, sheer: 0.12 }), ghost);
    hull.position.y = 0.2;
    temeraire.add(hull);
    // Gun decks: two dark bands down each side.
    for (const y of [0.18, 0.33]) {
      for (const side of [1, -1]) {
        const band = new THREE.Mesh(box(1.35, 0.05, 0.02), ghostDark);
        band.position.set(-0.15, y, side * 0.29);
        temeraire.add(band);
      }
    }
    // A high stern castle.
    const castle = new THREE.Mesh(box(0.42, 0.24, 0.5), ghost);
    castle.position.set(-0.86, 0.55, 0);
    temeraire.add(castle);
    const bowsprit = new THREE.Mesh(cylinder(0.022, 0.035, 0.9, 5), spar);
    bowsprit.position.set(1.25, 0.55, 0);
    bowsprit.rotation.z = -1.15;
    temeraire.add(bowsprit);
    // Three masts, their yards crossed and sails furled: she sails no more.
    const rigging: number[] = [];
    for (const [x, height] of [[0.6, 1.75], [0, 2.05], [-0.55, 1.45]]) {
      const mast = new THREE.Mesh(cylinder(0.03, 0.045, height, 5), spar);
      mast.position.set(x, 0.42 + height / 2, 0);
      temeraire.add(mast);
      for (let yard = 0; yard < 3; yard += 1) {
        const width = (0.82 - yard * 0.2) * (height / 2);
        const y = 0.42 + height * (0.42 + yard * 0.22);
        const arm = new THREE.Mesh(cylinder(0.02, 0.02, width * 2, 4), spar);
        arm.rotation.x = Math.PI / 2;
        arm.position.set(x, y, 0);
        const furled = new THREE.Mesh(cylinder(0.055, 0.055, width * 1.7, 5), ghost);
        furled.rotation.x = Math.PI / 2;
        furled.position.set(x - 0.01, y - 0.03, 0);
        temeraire.add(arm, furled);
      }
      const top = 0.42 + height;
      rigging.push(x, top, 0, 1.6, 0.8, 0, x, top, 0, -1.05, 0.45, 0);
    }
    const lines = new THREE.LineSegments(
      keep(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(rigging, 3))),
      keep(new THREE.LineBasicMaterial({ color: new THREE.Color("#7a6a50"), transparent: true, opacity: 0.7 })),
    );
    temeraire.add(lines);
  }
  const tug = new THREE.Group();
  const smokeFrom = new THREE.Vector3(0.15, 1.05, 0);
  {
    const black = material("#2a2420", 0.1);
    const hull = new THREE.Mesh(hullGeometry(1.0, 0.3, 0.42, { bow: 0.8, stern: 0.25, sheer: 0.04 }), black);
    hull.position.y = 0.12;
    const house = new THREE.Mesh(box(0.34, 0.16, 0.26), material("#5a3a26", 0.15));
    house.position.set(-0.1, 0.36, 0);
    const funnel = new THREE.Mesh(cylinder(0.07, 0.08, 0.62, 8), black);
    funnel.position.set(0.15, 0.62, 0);
    const band = new THREE.Mesh(cylinder(0.083, 0.083, 0.08, 8), material("#c4572a", 0.1));
    band.position.set(0.15, 0.78, 0);
    tug.add(hull, house, funnel, band);
    // Paddle boxes either side.
    for (const side of [1, -1]) {
      const paddle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10, 1, false, 0, Math.PI)), black);
      paddle.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      paddle.rotation.order = "YXZ";
      paddle.position.set(0, 0.2, side * 0.25);
      tug.add(paddle);
    }
  }
  scene.add(temeraire, tug);
  // Smoke and sparks streaming back from the tug's funnel.
  const puffGeometry = keep(smoothBlob(1, 0.5));
  const puffs = Array.from({ length: 8 }, (_, index) => {
    const puffMaterial = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(index % 4 === 0 ? "#c86a34" : "#4a3e36"), transparent: true, depthWrite: false }));
    const puff = new THREE.Mesh(puffGeometry, puffMaterial);
    puff.userData.phase = index / 8;
    scene.add(puff);
    return puff;
  });
  const towline = new THREE.Line(
    keep(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(10 * 3), 3))),
    keep(new THREE.LineBasicMaterial({ color: new THREE.Color("#3a2c1e") })),
  );
  scene.add(towline);
  const towStart = arcAt(-165);
  const towEnd = arcAt(70);
  const towSpan = towEnd - towStart;
  const towFirst = arcAt(4) - towStart;
  // Just off the middle: clear of the moored boat on this side and the wain in the ford on the other.
  const TOW_SIDE = 1.2;
  /** Big enough to make out from the bank, still plainly a model. */
  const MODEL_SCALE = 1.35;
  const TOW_GAP = 3.1 * MODEL_SCALE;
  const bowAt = new THREE.Vector3();
  const sternAt = new THREE.Vector3();
  const sag = new THREE.Vector3();

  function sailAt(boat: THREE.Group, arc: number, t: number, seed: number, scale: number) {
    const at = riverPoint(arc, TOW_SIDE + Math.sin(arc * 0.05) * 0.4);
    const along = riverTangent(arc);
    boat.position.set(at.x, -0.28 + Math.sin(t * 1.6 + seed) * 0.025, at.z);
    boat.rotation.set(Math.sin(t * 1.1 + seed) * 0.04, Math.atan2(-along.z, along.x), Math.sin(t * 0.8 + seed) * 0.03);
    boat.scale.setScalar(scale * MODEL_SCALE);
  }

  // --- The Lady of Shalott's boat ----------------------------------------------------
  const flames: THREE.Mesh[] = [];
  {
    // Upstream, below the oxbow: well clear of the heron.
    const arc = arcAt(-56);
    const at = riverPoint(arc, halfWidth - 1.3);
    const along = riverTangent(arc);
    const boat = new THREE.Group();
    const wood = material("#6a4428", 0.2);
    const shape = hullGeometry(3.4, 0.42, 1.0, { bow: 0.9, stern: 0.7, sheer: 0.5 });
    const hull = new THREE.Mesh(shape, wood);
    hull.position.y = 0.15;
    // Open inside: a dark well within the gunwale, so it reads as a boat, not a block.
    const well = new THREE.Mesh(shape, material("#2a1a10", 0.1));
    well.scale.set(0.86, 0.12, 0.74);
    well.position.y = 0.15 + 0.21 - 0.02;
    const seat = new THREE.Mesh(box(0.22, 0.05, 0.78), wood);
    seat.position.set(-0.75, 0.4, 0);
    boat.add(hull, well, seat);
    // The tapestry she wove, draped over the side and trailing in the water.
    {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#a8362a";
        context.fillRect(0, 0, 128, 64);
        context.strokeStyle = "#c8a24a";
        context.lineWidth = 3;
        context.strokeRect(4, 4, 120, 56);
        for (let index = 0; index < 5; index += 1) {
          const x = 14 + index * 25;
          context.fillStyle = index % 2 ? "#2f4a7a" : "#c8a24a";
          context.beginPath();
          context.ellipse(x, 32, 8, 14, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#e8d8b0";
          context.fillRect(x - 2, 24, 4, 16);
        }
      }
      const texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      // Spread inside the boat, over the gunwale on the bank side, and trailing on the water.
      const geometry = new THREE.PlaneGeometry(2.0, 2.0, 10, 14);
      const position = geometry.attributes.position;
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const k = (1 - position.getY(index)) / 2;
        let y: number;
        let z: number;
        if (k < 0.32) { y = 0.4; z = -0.2 + (k / 0.32) * 0.64; }
        else if (k < 0.62) { const j = (k - 0.32) / 0.3; y = 0.4 - j * 0.42; z = 0.46 + j * 0.08; }
        else { const j = (k - 0.62) / 0.38; y = -0.02; z = 0.54 + j * 0.75; }
        position.setXYZ(index, x, y + Math.sin(x * 5 + k * 3) * 0.02, z);
      }
      geometry.computeVertexNormals();
      const tapestry = new THREE.Mesh(keep(geometry), keep(new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide })));
      tapestry.position.x = -0.35;
      boat.add(tapestry);
    }
    // Three candles at the prow; two have gone out.
    const wax = material("#efe6cf", 0.1);
    const flameMaterial = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd27a") }));
    const flameGeometry = keep(new THREE.ConeGeometry(0.06, 0.2, 6));
    const glowMaterial = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcf70"), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    [[1.05, 0.16, 0.42], [0.92, -0.14, 0.34], [1.2, -0.02, 0.5]].forEach(([x, z, height], index) => {
      const candle = new THREE.Mesh(cylinder(0.045, 0.045, height, 6), wax);
      candle.position.set(x, 0.42 + height / 2, z);
      boat.add(candle);
      if (index === 2) {
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(x, 0.42 + height + 0.1, z);
        const glow = new THREE.Mesh(keep(new THREE.SphereGeometry(0.28, 10, 8)), glowMaterial);
        glow.position.copy(flame.position);
        boat.add(flame, glow);
        flames.push(flame, glow);
      }
    });
    // A lantern on its post, and a little cross.
    const brass = material("#a8843a", 0.1);
    const post = new THREE.Mesh(cylinder(0.035, 0.035, 0.75, 5), wood);
    post.position.set(1.5, 0.75, 0);
    const lantern = new THREE.Mesh(box(0.2, 0.26, 0.2), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#e8c070") })));
    lantern.position.set(1.5, 1.13, 0);
    const lanternCap = new THREE.Mesh(keep(new THREE.ConeGeometry(0.17, 0.12, 4)), brass);
    lanternCap.position.set(1.5, 1.32, 0);
    const cross = new THREE.Group();
    const upright = new THREE.Mesh(box(0.04, 0.3, 0.04), brass);
    const bar = new THREE.Mesh(box(0.04, 0.04, 0.18), brass);
    bar.position.y = 0.04;
    cross.add(upright, bar);
    cross.position.set(0.95, 0.55, 0.22);
    boat.add(post, lantern, lanternCap, cross);
    // Her name on the prow would be here; instead a chain runs to the bank.
    const shore = riverPoint(arc + 1.5, halfWidth + 1.2);
    boat.position.set(at.x, -0.32, at.z);
    boat.rotation.y = Math.atan2(-along.z, along.x) + 0.12;
    scene.add(boat);
    boat.updateMatrixWorld();
    const prow = new THREE.Vector3(1.7, 0.5, 0).applyMatrix4(boat.matrixWorld);
    const stake = new THREE.Mesh(cylinder(0.05, 0.06, 0.9, 5), wood);
    stake.position.set(shore.x, groundHeight(shore.x, shore.z) + 0.35, shore.z);
    scene.add(stake);
    const chainPoints: number[] = [];
    for (let index = 0; index <= 8; index += 1) {
      const k = index / 8;
      chainPoints.push(
        THREE.MathUtils.lerp(prow.x, shore.x, k),
        THREE.MathUtils.lerp(prow.y, groundHeight(shore.x, shore.z) + 0.7, k) - Math.sin(k * Math.PI) * 0.35,
        THREE.MathUtils.lerp(prow.z, shore.z, k),
      );
    }
    scene.add(new THREE.Line(
      keep(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(chainPoints, 3))),
      keep(new THREE.LineBasicMaterial({ color: new THREE.Color("#5a4a3a") })),
    ));
    const middle = new THREE.Vector3(0, 0, 0).applyMatrix4(boat.matrixWorld);
    obstacles.push({ x: middle.x, z: middle.z, r: 1.1 }, { x: prow.x, z: prow.z, r: 0.6 });
    obstacles.push({ x: shore.x, z: shore.z, r: 0.3 });
  }

  function update(now: number) {
    const t = now / 1000;
    // Towed slowly downstream to the breaker's yard, then round again.
    // It starts just below the bridge, heading off past the parasols, and later
    // comes round again from far upstream, through the oxbow loop.
    const along = (t * 0.42 + towFirst) % towSpan;
    const tugArc = towStart + along;
    const shipArc = tugArc - TOW_GAP;
    const fade = Math.min(1, along / 6, (towSpan - along) / 6);
    const scale = Math.max(0.001, THREE.MathUtils.smoothstep(fade, 0, 1));
    sailAt(tug, tugArc, t, 1, scale);
    sailAt(temeraire, Math.max(towStart, shipArc), t, 2.7, scale * (along > TOW_GAP ? 1 : 0.001));
    tug.updateMatrixWorld();
    temeraire.updateMatrixWorld();
    sternAt.set(-0.5, 0.25, 0).applyMatrix4(tug.matrixWorld);
    bowAt.set(1.55, 0.65, 0).applyMatrix4(temeraire.matrixWorld);
    const positions = towline.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < 10; index += 1) {
      const k = index / 9;
      sag.lerpVectors(sternAt, bowAt, k);
      sag.y -= Math.sin(k * Math.PI) * 0.12;
      positions.setXYZ(index, sag.x, sag.y, sag.z);
    }
    positions.needsUpdate = true;
    towline.visible = along > TOW_GAP && scale > 0.05;
    const funnelTop = smokeFrom.clone().applyMatrix4(tug.matrixWorld);
    const back = new THREE.Vector3(-1, 0, 0).transformDirection(tug.matrixWorld);
    puffs.forEach((puff) => {
      const age = (t * 0.5 + puff.userData.phase) % 1;
      puff.position.copy(funnelTop).addScaledVector(back, age * 1.6).setY(funnelTop.y + age * 0.9);
      puff.scale.setScalar((0.08 + age * 0.3) * scale);
      (puff.material as THREE.MeshBasicMaterial).opacity = Math.sin(age * Math.PI) * 0.6;
    });
    // The one candle still alight flickers.
    flames.forEach((flame, index) => {
      const flicker = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
      if (index % 2 === 0) flame.scale.set(1, flicker, 1);
      else flame.scale.setScalar(0.8 + flicker * 0.25);
    });
  }
  update(0);

  return { obstacles, update, tugAt: tug.position };
}
