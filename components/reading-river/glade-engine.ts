/**
 * The glade: a river running through a sunlit clearing, painted in oils.
 *
 * Drawn with three.js, then passed through a painterly filter (a Kuwahara
 * filter, which flattens colour into brush-like daubs, plus canvas weave,
 * stroke texture and a warm grade). You can turn all the way round it.
 *
 * Colours come from two of Repin's water paintings: the hazy sky, sand-gold
 * banks, umber and single red of "Barge Haulers on the Volga", and the
 * wind-driven blue-green water and cream foam of "What Freedom!".
 *
 * The pieces afloat are ordinary HTML buttons, so they stay accessible. The
 * engine works out where each one's raft is on the river at this moment,
 * projects it to the screen and moves the list item there. React owns their
 * content and state; the engine reads the data attributes React writes:
 *
 *   data-id     stable identity
 *   data-seq    the piece's place in the stream (0 is furthest downstream)
 *   data-state  "" | "leaving" | "lifted", and in the eddies also
 *               "drifting" (out to the river) | "sailing" (finished, off to sea)
 *
 * and the list's data-gen, which changes when a different stream is shown.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLSL_NOISE, noise2, paintLook, seeded, smoothBlob } from "./glade-paint";
import { createLife, makeWalker, type Obstacle } from "./glade-life";
import { addConstable } from "./glade-constable";
import { addGallery, type Oxbow } from "./glade-gallery";
import type { GladeSurroundings } from "./glade-sound";
import { addWanders } from "./glade-wanders";
import { addRiverside } from "./glade-riverside";
import { GLADE_LEAVE_MS } from "./glade-timing";

export { GLADE_LEAVE_MS };

const C = {
  // Constable's blue between the clouds.
  skyTop: "#86a6c2",
  skyMid: "#c9d6d6",
  haze: "#ebdfc2",
  sun: "#fff0cf",
  sand: "#dcbf86",
  sandPale: "#ead7a8",
  wetSand: "#a58a60",
  ochre: "#c4974f",
  grass: "#9c9350",
  grassDeep: "#66652f",
  umber: "#5b3e25",
  umberDeep: "#3c2a1b",
  // "What Freedom!": wind-driven teal water and cream foam.
  waterDeep: "#3f6a70",
  water: "#6f9a96",
  waterPale: "#a9c0b6",
  foam: "#f4eedd",
  // Repin's olive and Constable's deep, wet English greens.
  leaf: ["#6d6a37", "#7f7a41", "#5a5a2f", "#8c7f46", "#74683a", "#93894b", "#4b5a2d", "#3f4d28", "#56662f"],
  rock: ["#6b5d4f", "#7d6c5a", "#584b40"],
  hills: "#9fadb0",
  red: "#b8432f",
  cream: "#efe3c6",
};

/**
 * After Cole's The Oxbow: upstream, the river swings out away from the eddies
 * round a great loop and comes back almost to where it left, wrapping a
 * peninsula of fields with a narrow neck of land. Drawn as a turtle walks:
 * a bend out, most of a circle round, and a bend back into line.
 */
const OXBOW_LOOP_RADIUS = 20;
/** The middle of the oxbow loop, filled in as the loop is drawn. */
const OXBOW_CENTRE: [number, number] = [0, 0];
function oxbowLoop(start: [number, number]): [number, number][] {
  const NECK_BEND = 9;
  const SWING = 147;
  const points: [number, number][] = [start];
  let [x, z] = start;
  let heading = 0;
  const walk = (length: number, turn: number) => {
    const steps = Math.max(3, Math.round(length / 2.5));
    for (let step = 0; step < steps; step += 1) {
      heading += THREE.MathUtils.degToRad(turn) / steps;
      x += Math.sin(heading) * (length / steps);
      z += Math.cos(heading) * (length / steps);
      points.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10]);
    }
  };
  const arc = (radius: number, turn: number) => walk(radius * THREE.MathUtils.degToRad(Math.abs(turn)), turn);
  walk(12, 0);
  arc(NECK_BEND, -SWING);
  OXBOW_CENTRE[0] = x + Math.cos(heading) * OXBOW_LOOP_RADIUS;
  OXBOW_CENTRE[1] = z - Math.sin(heading) * OXBOW_LOOP_RADIUS;
  arc(OXBOW_LOOP_RADIUS, SWING * 2);
  arc(NECK_BEND, -SWING);
  walk(12, 0);
  return points;
}

/** The river's centre line, from the far haze upstream to the far haze downstream. */
const RIVER_POINTS: [number, number][] = [
  [-4, -300], [6, -230], [-2, -175], [-7, -158], ...oxbowLoop([-1, -135]), [-0.5, -45],
  [3.5, -27], [-2.6, -12], [2.4, 2], [-2.2, 15], [1.5, 28], [-5, 44], [-4, 64],
  [6, 95], [-5, 130], [3, 175], [-8, 230], [0, 300],
];
const RIVER_HALF_WIDTH = 4.4;

/** The middle of the glade, where the scenery is gathered. */
const ORBIT_CENTER = new THREE.Vector3(0, 0.4, -8);
/** The camera circles the walker from this far, and this high. */
const ORBIT_RADIUS = 24;
const ORBIT_PITCH = 0.42;

/** The eddy pool sits off the river here, and the footbridge crosses here. */
const POOL_Z = -27;
const POOL_RADIUS = 6;
/** Bank between the river and the pool, and the half-width of the inlet joining them. */
const POOL_SET_BACK = 7;
const INLET_HALF_WIDTH = 0.9;
const BRIDGE_Z = -7;
/** How high the middle of the bridge rises above the banks. */
const BRIDGE_RISE = 2.7;
const POOL_SPEED = 0.05;

/** The walker's pace, in units a second, and how far from the glade they may go. */
const WALK_SPEED = 3.4;
/** How far from the middle of the glade you can wander: far enough to find what is further along. */
const WALK_LIMIT = 165;
/** A piece opens up when the walker is this close to it, and closes again beyond the second. */
const NEAR_OPEN = 10;
const NEAR_GONE = 13.5;

/** Very slow: a fifth of a unit a second, a few minutes to pass by. */
const STREAM_SPEED = 0.2;
const STREAM_SPACING = 17;
/** Pieces wrap round out of sight, this far up and down from the centre. */
const STREAM_MIN_WINDOW = 170;
/** Cards fade out with distance from the viewer. */
const CARD_FADE_START = 52;
const CARD_FADE_END = 70;

type FloatState = {
  bornAt: number;
  leaveAt: number | null;
  /** Stream seconds this piece has been held still (lifted, hovered or focused). */
  heldFor: number;
  hold: number;
};

type Options = {
  floats: () => HTMLElement | null;
  /** The list of pieces in the eddies; the scene moves them round the pool. */
  pool: () => HTMLElement | null;
  animate: () => boolean;
  /** Called when the set of pieces you can see changes. */
  onVisible: (ids: string[]) => void;
  /** Called a few times a second with how near you are to the water and the rain, for the sound. */
  onSurroundings?: (surroundings: GladeSurroundings) => void;
};

export type GladeControls = {
  turn: (radians: number) => void;
  /** Walk to the nearest piece not already in reach. Returns its id, if there was one. */
  walkToNext: () => string | null;
  face: () => void;
  dispose: () => void;
};

const mod = (value: number, size: number) => ((value % size) + size) % size;

export function createGlade(host: HTMLElement, options: Options): GladeControls {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  // Reduce costly Retina fill rate; the painted image masks subpixel detail.
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "glade-gl";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const hazeColor = new THREE.Color(C.haze);
  scene.background = hazeColor.clone();
  scene.fog = new THREE.Fog(hazeColor, 50, 210);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 700);

  // Light: a warm, high summer sun from the left, and the sky's pale fill.
  scene.add(new THREE.HemisphereLight(new THREE.Color("#eef0e4"), new THREE.Color("#8a6a3e"), 1.2));
  const sun = new THREE.DirectionalLight(new THREE.Color(C.sun), 2.1);
  sun.position.set(-30, 42, 24);
  scene.add(sun);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(thing: T) => { disposables.push(thing); return thing; };
  const wind = { value: 0 };
  const gust = { value: 0 };
  /** Where the walker stands, so trees in the way can step aside. */
  const sightLine = { value: new THREE.Vector3() };
  const random = seeded(42);

  // --- The river's line --------------------------------------------------
  const curve = new THREE.CatmullRomCurve3(
    RIVER_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    "centripetal",
  );
  const SAMPLES = 1200;
  const samples = curve.getSpacedPoints(SAMPLES);
  const riverLength = curve.getLength();

  function riverDistance(x: number, z: number) {
    let best = Infinity;
    for (let index = 0; index < samples.length; index += 3) {
      const point = samples[index];
      const dx = point.x - x;
      const dz = point.z - z;
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /** Arc distance from the upstream end to the river point nearest this z. */
  // Where the river runs down the valley rather than round the oxbow loop, so a
  // place given by its z alone lands on the main channel.
  const downValley = samples.map((_, index) => curve.getTangentAt(index / SAMPLES).z > 0.6);
  function arcAtZ(z: number) {
    let best = 0;
    let bestDistance = Infinity;
    samples.forEach((point, index) => {
      if (!downValley[index]) return;
      const d = Math.abs(point.z - z);
      if (d < bestDistance) { bestDistance = d; best = index; }
    });
    return (best / SAMPLES) * riverLength;
  }

  // --- The eddies: a round pool opening off the river -------------------------
  const poolArc = arcAtZ(POOL_Z);
  // It sits back from the river across a strip of bank, joined by a narrow inlet,
  // so the pieces in the eddies and the pieces passing by keep apart.
  const poolCentre = new THREE.Vector3();
  const poolInlet = new THREE.Vector3();
  const poolMouth = new THREE.Vector3();
  const riverEdge = new THREE.Vector3();
  {
    const u = poolArc / riverLength;
    const point = curve.getPointAt(u);
    const along = curve.getTangentAt(u);
    const across = new THREE.Vector3(-along.z, 0, along.x).normalize();
    poolCentre.copy(point).addScaledVector(across, -(RIVER_HALF_WIDTH + POOL_RADIUS + POOL_SET_BACK));
    poolInlet.copy(poolCentre).addScaledVector(across, POOL_RADIUS - 0.8);
    riverEdge.copy(point).addScaledVector(across, -(RIVER_HALF_WIDTH - 0.6));
    poolMouth.copy(point).addScaledVector(across, -(RIVER_HALF_WIDTH - 1.6));
  }
  // After The Hay Wain: a wain in the ford downstream, a cottage on the far bank.
  const ford = new THREE.Vector3();
  const fordAcross = new THREE.Vector3();
  const cottageAt = new THREE.Vector3();
  {
    const u = arcAtZ(36) / riverLength;
    const point = curve.getPointAt(u);
    const along = curve.getTangentAt(u);
    fordAcross.set(-along.z, 0, along.x).normalize();
    ford.copy(point).addScaledVector(fordAcross, -(RIVER_HALF_WIDTH - 2.2));
    const v = arcAtZ(44) / riverLength;
    const bank = curve.getPointAt(v);
    const bankAlong = curve.getTangentAt(v);
    cottageAt.copy(bank).addScaledVector(new THREE.Vector3(-bankAlong.z, 0, bankAlong.x).normalize(), -(RIVER_HALF_WIDTH + 9));
  }
  // The land the oxbow loop wraps round: Cole's peninsula of fields.
  const oxbow: Oxbow = {
    centre: new THREE.Vector3(OXBOW_CENTRE[0], 0, OXBOW_CENTRE[1]),
    radius: OXBOW_LOOP_RADIUS - RIVER_HALF_WIDTH - 2.5,
  };
  const poolDistance = (x: number, z: number) => Math.hypot(x - poolCentre.x, z - poolCentre.z);
  const inletLine = new THREE.Line3(poolInlet.clone(), riverEdge.clone());
  const inletPoint = new THREE.Vector3();
  function inletDistance(x: number, z: number) {
    inletLine.closestPointToPoint(inletPoint.set(x, 0, z), true, inletPoint);
    return Math.hypot(x - inletPoint.x, z - inletPoint.z);
  }

  /** Distance to open water (river, eddy pool or the inlet between), measured as if to the river's centre. */
  function distanceToRiver(x: number, z: number) {
    return Math.min(
      riverDistance(x, z),
      poolDistance(x, z) - POOL_RADIUS + RIVER_HALF_WIDTH,
      inletDistance(x, z) - INLET_HALF_WIDTH + RIVER_HALF_WIDTH * 0.8,
    );
  }

  // --- A footbridge across the river ---------------------------------------
  const bridgeArc = arcAtZ(BRIDGE_Z);
  const bridgeCentre = curve.getPointAt(bridgeArc / riverLength);
  const bridgeAlong = curve.getTangentAt(bridgeArc / riverLength).clone();
  const bridgeAcross = new THREE.Vector3(-bridgeAlong.z, 0, bridgeAlong.x).normalize();
  const BRIDGE_SPAN = (RIVER_HALF_WIDTH + 3.5) * 2;
  const BRIDGE_WIDTH = 2.2;
  /** The deck's height at a distance along the span from the middle: a high, round arch. */
  function deckHeight(along: number) {
    const t = THREE.MathUtils.clamp((2 * along) / BRIDGE_SPAN, -1, 1);
    return 0.3 + BRIDGE_RISE * (1 - t * t);
  }
  /** Where x, z sits relative to the bridge: along its span, and across its width. */
  function bridgeLocal(x: number, z: number) {
    const dx = x - bridgeCentre.x;
    const dz = z - bridgeCentre.z;
    return { along: dx * bridgeAcross.x + dz * bridgeAcross.z, across: dx * bridgeAlong.x + dz * bridgeAlong.z };
  }
  const onBridgeFootprint = (local: { along: number; across: number }) =>
    Math.abs(local.across) < BRIDGE_WIDTH / 2 && Math.abs(local.along) < BRIDGE_SPAN / 2;
  /** One end of the bridge (-1 or 1), a little way out on to the bank. */
  function bridgeEnd(end: number, beyond = 0) {
    return bridgeCentre.clone().addScaledVector(bridgeAcross, end * (BRIDGE_SPAN / 2 + beyond)).setY(0);
  }

  function groundHeight(x: number, z: number, d = distanceToRiver(x, z)) {
    const n = noise2(x * 0.08, z * 0.08);
    if (d < RIVER_HALF_WIDTH) return -1.1 + (d / RIVER_HALF_WIDTH) * 0.6;
    if (d < RIVER_HALF_WIDTH + 3) return -0.5 + ((d - RIVER_HALF_WIDTH) / 3) * 0.85;
    const away = Math.hypot(x - ORBIT_CENTER.x, z - ORBIT_CENTER.z);
    return 0.35 + Math.min(1, (d - RIVER_HALF_WIDTH - 3) / 18) * (n * 1.6) + Math.max(0, away - 110) * 0.06;
  }

  const centreArc = arcAtZ(ORBIT_CENTER.z);
  const nearArc = arcAtZ(9);

  // --- Sky ---------------------------------------------------------------
  const skyMaterial = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(C.skyTop) },
      uMid: { value: new THREE.Color(C.skyMid) },
      uHaze: { value: hazeColor },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHaze; uniform float uTime;
      varying vec3 vDir;
      ${GLSL_NOISE}
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHaze, uMid, smoothstep(0.0, 0.16, h));
        col = mix(col, uTop, smoothstep(0.14, 0.62, h));
        // Constable's heaped summer cumulus: sunlit white tops, grey bellies,
        // drifting slowly across a deep blue.
        vec2 p = vDir.xz / max(vDir.y + 0.12, 0.05);
        vec2 drift = vec2(uTime * 0.006, uTime * 0.002);
        float cloud = fbm(p * 0.42 + drift);
        float lit = fbm(p * 0.42 + drift + vec2(-0.07, 0.05));
        float body = smoothstep(0.44, 0.72, cloud) * smoothstep(0.02, 0.22, h);
        col = mix(col, vec3(1.0, 0.98, 0.93), body * 0.85);
        float belly = clamp((cloud - lit) * 5.0 + 0.35, 0.0, 1.0);
        col = mix(col, vec3(0.6, 0.6, 0.6), belly * body * 0.5);
        col = mix(col, vec3(1.0, 0.95, 0.84), smoothstep(0.62, 0.85, lit) * body * 0.25);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }));
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(500, 32, 16)), skyMaterial));

  // --- Ground: banks, sand and the glade's grass, all the way round -------------
  const groundGeometry = keep(new THREE.PlaneGeometry(640, 640, 300, 300));
  groundGeometry.rotateX(-Math.PI / 2);
  groundGeometry.translate(0, 0, -10);
  {
    const position = groundGeometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const sand = new THREE.Color(C.sand);
    const sandPale = new THREE.Color(C.sandPale);
    const wet = new THREE.Color(C.wetSand);
    const ochre = new THREE.Color(C.ochre);
    const grass = new THREE.Color(C.grass);
    const grassDeep = new THREE.Color(C.grassDeep);
    const color = new THREE.Color();
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const d = distanceToRiver(x, z);
      const n = noise2(x * 0.08, z * 0.08);
      const n2 = noise2(x * 0.3 + 11, z * 0.3 - 4);
      position.setY(index, groundHeight(x, z, d));

      if (d < RIVER_HALF_WIDTH + 0.9) color.copy(wet);
      else if (d < RIVER_HALF_WIDTH + 6 + n * 4) color.copy(sand).lerp(sandPale, n2 * 0.7);
      else {
        const grassy = THREE.MathUtils.smoothstep(d, 9 + n * 6, 18 + n * 8);
        color.copy(ochre).lerp(sand, n2 * 0.5).lerp(grass, grassy * 0.85).lerp(grassDeep, grassy * n * 0.55);
      }
      color.offsetHSL(0, 0, (n2 - 0.5) * 0.06);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    groundGeometry.computeVertexNormals();
  }
  const groundMaterial = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  paintLook(groundMaterial, { wind, dapple: 0.16, dappleScale: 0.35 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  scene.add(ground);

  // --- Rocks in the stream, for the water to break white around -------------------
  const rockSpots: THREE.Vector4[] = [];
  const tangent = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  const rockGeometry = keep(smoothBlob(3));
  {
    const position = rockGeometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      v.fromBufferAttribute(position, index);
      v.multiplyScalar(0.8 + noise2(v.x * 2.1 + 3, v.z * 2.1 + v.y * 1.7) * 0.45);
      v.y *= 0.7;
      position.setXYZ(index, v.x, v.y, v.z);
    }
    rockGeometry.computeVertexNormals();
  }
  const ROCKS: [number, number, number][] = [
    [-46, 2.6, 1.3], [-36, 3.2, 0.9], [-15, -2.4, 1.1], [2, -3.2, 0.8],
    [13, 3.1, 0.9], [26, -2.4, 1], [38, 3.3, 0.8], [52, -3, 1.2],
  ];
  const rockMaterial = keep(new THREE.MeshLambertMaterial());
  paintLook(rockMaterial, { wind, dapple: 0.3, dappleScale: 1.6 });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, ROCKS.length);
  {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const tint = new THREE.Color();
    ROCKS.forEach(([z, side, size], index) => {
      const u = arcAtZ(z) / riverLength;
      const point = curve.getPointAt(u);
      curve.getTangentAt(u, tangent);
      lateral.set(-tangent.z, 0, tangent.x).normalize();
      point.addScaledVector(lateral, side);
      point.y = -0.55;
      scale.set(size * 1.3, size, size * 1.1);
      quaternion.setFromEuler(new THREE.Euler(0, random() * 6, 0));
      matrix.compose(point, quaternion, scale);
      rocks.setMatrixAt(index, matrix);
      rocks.setColorAt(index, tint.set(C.rock[index % C.rock.length]));
      rockSpots.push(new THREE.Vector4(point.x, point.z, size * 1.15, 0));
    });
  }
  scene.add(rocks);

  // --- Water ---------------------------------------------------------------
  const ACROSS = 12;
  const ALONG = 900;
  const waterPositions: number[] = [];
  const waterUvs: number[] = [];
  const waterIndex: number[] = [];
  for (let i = 0; i <= ALONG; i += 1) {
    const u = i / ALONG;
    const point = curve.getPointAt(u);
    curve.getTangentAt(u, tangent);
    lateral.set(-tangent.z, 0, tangent.x).normalize();
    for (let j = 0; j <= ACROSS; j += 1) {
      const s = j / ACROSS;
      const offset = (s - 0.5) * 2 * (RIVER_HALF_WIDTH + 0.7);
      waterPositions.push(point.x + lateral.x * offset, -0.32, point.z + lateral.z * offset);
      waterUvs.push(s, u * riverLength);
    }
  }
  for (let i = 0; i < ALONG; i += 1) {
    for (let j = 0; j < ACROSS; j += 1) {
      const a = i * (ACROSS + 1) + j;
      const b = a + ACROSS + 1;
      waterIndex.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const waterGeometry = keep(new THREE.BufferGeometry());
  waterGeometry.setAttribute("position", new THREE.Float32BufferAttribute(waterPositions, 3));
  waterGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(waterUvs, 2));
  waterGeometry.setIndex(waterIndex);

  const waterUniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(C.waterDeep) },
    uWater: { value: new THREE.Color(C.water) },
    uPale: { value: new THREE.Color(C.waterPale) },
    uFoam: { value: new THREE.Color(C.foam) },
    uSand: { value: new THREE.Color(C.wetSand) },
    uFog: { value: hazeColor },
    uFogNear: { value: 50 },
    uFogFar: { value: 210 },
    uRocks: { value: rockSpots },
  };
  const waterMaterial = keep(new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: waterUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv; varying float vDepth; varying vec2 vWorld;
      void main() {
        vUv = uv;
        vec3 p = position;
        // Wind-driven chop moving downstream.
        p.y += sin(uv.y * 1.3 - uTime * 1.6 + uv.x * 5.0) * 0.06 + sin(uv.y * 0.45 - uTime * 0.8) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        vWorld = p.xz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uWater; uniform vec3 uPale; uniform vec3 uFoam; uniform vec3 uSand;
      uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform vec4 uRocks[${ROCKS.length}];
      varying vec2 vUv; varying float vDepth; varying vec2 vWorld;
      ${GLSL_NOISE}
      void main() {
        float across = abs(vUv.x - 0.5) * 2.0;
        // uv.y grows downstream, so subtracting time carries patterns with the current.
        float along = vUv.y - uTime * 1.5;
        vec3 col = mix(uDeep, uWater, smoothstep(0.05, 0.8, across));
        float body = fbm(vec2(vUv.x * 3.0, along * 0.07));
        col = mix(col, uDeep, (body - 0.45) * 0.7);
        col = mix(col, uPale, smoothstep(0.55, 0.85, fbm(vec2(vUv.x * 5.0 + 3.0, along * 0.12))) * 0.45);
        // Wave crests catching the light, and a few whitecaps.
        float crest = noise(vec2(vUv.x * 12.0 + sin(along * 0.05) * 2.0, along * 0.3));
        col = mix(col, uPale, smoothstep(0.62, 0.9, crest) * (1.0 - across * 0.6) * 0.6);
        float foam = smoothstep(0.8, 0.95, fbm(vec2(vUv.x * 9.0, along * 0.5))) * (1.0 - across) * 0.7;
        // Foam where the water breaks round rocks, and lapping at the banks.
        for (int i = 0; i < ${ROCKS.length}; i++) {
          vec2 toRock = vWorld - uRocks[i].xy;
          float d = length(toRock) - uRocks[i].z;
          float broken = 0.55 + 0.6 * noise(vWorld * 2.2 - vec2(0.0, uTime * 2.5));
          foam += smoothstep(1.6, 0.0, d) * broken;
        }
        float lap = smoothstep(0.74, 0.86, across) * smoothstep(0.98, 0.86, across);
        foam += lap * (0.4 + 0.6 * noise(vec2(vUv.y * 1.6 - uTime * 1.2, across * 8.0)));
        col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * 0.85);
        // The shallows show the sand through them.
        col = mix(col, uSand, smoothstep(0.86, 1.0, across) * 0.5);
        float alpha = 1.0 - smoothstep(0.9, 1.0, across);
        float cloudShade = smoothstep(0.55, 0.72, fbm(vWorld * 0.012 + vec2(uTime * 0.012, uTime * 0.004)));
        col *= 1.0 - cloudShade * 0.18;
        col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDepth) * 0.92);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }));
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.renderOrder = 1;
  scene.add(water);

  // The eddy pool: still, slowly turning water with a ring of foam where it meets the bank.
  const poolGeometry = keep(new THREE.CircleGeometry(POOL_RADIUS + 0.6, 72));
  poolGeometry.rotateX(-Math.PI / 2);
  const poolMaterial = keep(new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { ...waterUniforms, uCentre: { value: new THREE.Vector2(poolCentre.x, poolCentre.z) }, uRadius: { value: POOL_RADIUS } },
    vertexShader: /* glsl */ `
      varying vec2 vWorld; varying float vDepth;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xz;
        vec4 mv = viewMatrix * world;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uWater; uniform vec3 uPale; uniform vec3 uFoam; uniform vec3 uSand;
      uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform vec2 uCentre; uniform float uRadius;
      varying vec2 vWorld; varying float vDepth;
      ${GLSL_NOISE}
      void main() {
        vec2 offset = vWorld - uCentre;
        float r = length(offset) / uRadius;
        float a = atan(offset.y, offset.x);
        // Slow turning swirls, tighter toward the middle.
        float swirl = fbm(vec2(a * 2.0 + uTime * 0.12 - r * 2.5, r * 3.0));
        vec3 col = mix(uDeep, uWater, smoothstep(0.0, 0.9, r));
        col = mix(col, uPale, smoothstep(0.55, 0.85, swirl) * 0.5);
        float ring = smoothstep(0.82, 0.95, r) * smoothstep(1.08, 0.95, r);
        col = mix(col, uFoam, ring * (0.35 + 0.5 * noise(vec2(a * 6.0 - uTime * 0.3, r * 10.0))));
        col = mix(col, uSand, smoothstep(0.95, 1.08, r) * 0.5);
        float cloudShade = smoothstep(0.55, 0.72, fbm(vWorld * 0.012 + vec2(uTime * 0.012, uTime * 0.004)));
        col *= 1.0 - cloudShade * 0.18;
        col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDepth) * 0.92);
        gl_FragColor = vec4(col, 1.0 - smoothstep(1.0, 1.1, r));
      }
    `,
  }));
  const pool = new THREE.Mesh(poolGeometry, poolMaterial);
  pool.position.set(poolCentre.x, -0.31, poolCentre.z);
  pool.renderOrder = 1;
  scene.add(pool);

  // The inlet: a narrow run of water from the pool to the river.
  {
    const length = poolInlet.distanceTo(riverEdge);
    const inletGeometry = keep(new THREE.PlaneGeometry(INLET_HALF_WIDTH * 2 + 0.8, length + 1.2, 4, 12));
    inletGeometry.rotateX(-Math.PI / 2);
    const inletMaterial = keep(new THREE.ShaderMaterial({
      transparent: true,
      uniforms: waterUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec2 vWorld; varying float vDepth;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xz;
          vec4 mv = viewMatrix * world;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uDeep; uniform vec3 uWater; uniform vec3 uPale; uniform vec3 uFoam; uniform vec3 uSand;
        uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
        varying vec2 vUv; varying vec2 vWorld; varying float vDepth;
        ${GLSL_NOISE}
        void main() {
          float across = abs(vUv.x - 0.5) * 2.0;
          vec3 col = mix(uWater, uPale, smoothstep(0.3, 0.9, across) * 0.4);
          col = mix(col, uPale, smoothstep(0.6, 0.9, noise(vec2(vUv.x * 6.0, vUv.y * 10.0 - uTime * 0.4))) * 0.4);
          col = mix(col, uSand, smoothstep(0.7, 1.0, across) * 0.5);
          col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDepth) * 0.92);
          gl_FragColor = vec4(col, 1.0 - smoothstep(0.75, 1.0, across));
        }
      `,
    }));
    const inlet = new THREE.Mesh(inletGeometry, inletMaterial);
    const middle = poolInlet.clone().add(riverEdge).multiplyScalar(0.5);
    inlet.position.set(middle.x, -0.32, middle.z);
    inlet.rotation.y = Math.atan2(riverEdge.x - poolInlet.x, riverEdge.z - poolInlet.z);
    inlet.renderOrder = 1;
    scene.add(inlet);
  }

  // The footbridge, after Monet's Japanese bridge at Giverny: a high, gentle
  // arch painted green, its deck boarded across, with a lattice of slender
  // balusters under a top rail and a middle rail each side.
  const bridge = new THREE.Group();
  {
    const greenWood = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#5f8150") }));
    paintLook(greenWood, { wind, dapple: 0.22, dappleScale: 2.2 });
    const deckWood = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#6f7d4c") }));
    paintLook(deckWood, { wind, dapple: 0.3, dappleScale: 2.5 });
    const half = BRIDGE_SPAN / 2;
    const deckAt = (x: number) => deckHeight(x);
    const PLANKS = 34;
    const plank = keep(new THREE.BoxGeometry(BRIDGE_SPAN / PLANKS * 0.9, 0.12, BRIDGE_WIDTH));
    const planks = new THREE.InstancedMesh(plank, deckWood, PLANKS);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    for (let index = 0; index < PLANKS; index += 1) {
      const x = (((index + 0.5) / PLANKS) * 2 - 1) * half;
      const slope = Math.atan((deckAt(x + 0.05) - deckAt(x - 0.05)) / 0.1);
      q.setFromEuler(new THREE.Euler(0, 0, slope));
      m.compose(new THREE.Vector3(x, deckAt(x) - 0.06, 0), q, one);
      planks.setMatrixAt(index, m);
    }
    bridge.add(planks);

    const railAt = (lift: number) => new THREE.CatmullRomCurve3(
      Array.from({ length: 25 }, (_, index) => {
        const x = ((index / 24) * 2 - 1) * half;
        return new THREE.Vector3(x, deckAt(x) + lift, 0);
      }),
    );
    const topRail = keep(new THREE.TubeGeometry(railAt(1.05), 48, 0.06, 6));
    const midRail = keep(new THREE.TubeGeometry(railAt(0.55), 48, 0.035, 5));
    const stringer = keep(new THREE.TubeGeometry(railAt(-0.12), 48, 0.09, 6));
    const baluster = keep(new THREE.CylinderGeometry(0.028, 0.028, 1, 5));
    const endPost = keep(new THREE.CylinderGeometry(0.09, 0.1, 1.35, 6));
    const BALUSTERS = 30;
    const side = BRIDGE_WIDTH / 2 - 0.05;
    [-side, side].forEach((z) => {
      [topRail, midRail, stringer].forEach((geometry) => {
        const rail = new THREE.Mesh(geometry, greenWood);
        rail.position.z = z;
        bridge.add(rail);
      });
      const balusters = new THREE.InstancedMesh(baluster, greenWood, BALUSTERS);
      for (let index = 0; index < BALUSTERS; index += 1) {
        const x = (((index + 0.5) / BALUSTERS) * 2 - 1) * half;
        m.compose(new THREE.Vector3(x, deckAt(x) + 0.52, z), q.identity(), new THREE.Vector3(1, 1.05, 1));
        balusters.setMatrixAt(index, m);
      }
      bridge.add(balusters);
      [-half, half].forEach((x) => {
        const post = new THREE.Mesh(endPost, greenWood);
        post.position.set(x, deckAt(x) + 0.6, z);
        bridge.add(post);
      });
    });
    // Slim piles under the arch, standing in the water.
    const pile = keep(new THREE.CylinderGeometry(0.1, 0.12, 1, 6));
    [-0.55, 0.55].forEach((t) => [-side, side].forEach((z) => {
      const x = t * half;
      const leg = new THREE.Mesh(pile, greenWood);
      const top = deckAt(x) - 0.12;
      leg.scale.y = top + 1.2;
      leg.position.set(x, (top - 1.2) / 2, z);
      bridge.add(leg);
    }));
    bridge.position.copy(bridgeCentre);
    bridge.position.y = 0;
    bridge.rotation.y = Math.atan2(-bridgeAcross.z, bridgeAcross.x);
    scene.add(bridge);
  }

  // --- Distant hills all round, like the far bank in the painting -----------------
  const hillMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.hills) }));
  const hillGeometry = keep(new THREE.SphereGeometry(1, 24, 12));
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2 + random() * 0.3;
    // Leave the river's two ends open to the haze.
    if (Math.abs(Math.sin(angle)) < 0.35) continue;
    const radius = 220 + random() * 60;
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    hill.position.set(Math.sin(angle) * radius, -2, ORBIT_CENTER.z + Math.cos(angle) * radius);
    hill.scale.set(40 + random() * 40, 7 + random() * 9, 22 + random() * 14);
    hill.rotation.y = angle + Math.PI / 2;
    scene.add(hill);
  }

  // --- Soft shadows -----------------------------------------------------------------
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  {
    const context = shadowCanvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(60,40,22,0.55)");
      gradient.addColorStop(1, "rgba(60,40,22,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
  }
  const shadowTexture = keep(new THREE.CanvasTexture(shadowCanvas));
  const shadowGeometry = keep(new THREE.PlaneGeometry(1, 1));
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadowMaterial = keep(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));

  // --- Trees ringing the glade --------------------------------------------------------
  type Tree = { x: number; z: number; s: number };
  // Slim, modest trees, set back from the river so they frame the glade
  // without walling in the view as you turn round.
  const trees: Tree[] = [
    { x: -30, z: 12, s: 2.2 }, { x: 31, z: 6, s: 2 }, { x: -33, z: -6, s: 1.9 }, { x: 34, z: -16, s: 2.1 },
    { x: 30, z: -40, s: 2 }, { x: -30, z: -34, s: 1.9 },
  ];
  for (let attempt = 0; attempt < 2400 && trees.length < 300; attempt += 1) {
    const x = (random() - 0.5) * 300;
    const z = ORBIT_CENTER.z + (random() - 0.5) * 300;
    if (distanceToRiver(x, z) < 11) continue;
    // Keep the clearing open round the river.
    const fromCentre = Math.hypot(x - ORBIT_CENTER.x, z - ORBIT_CENTER.z);
    if (fromCentre < 28) continue;
    if (Math.hypot(x - cottageAt.x, z - cottageAt.z) < 8) continue;
    // Cole's peninsula stays open fields.
    if (Math.hypot(x - oxbow.centre.x, z - oxbow.centre.z) < oxbow.radius + 3) continue;
    if (random() > 0.2 + THREE.MathUtils.smoothstep(fromCentre, 28, 70) * 0.8) continue;
    trees.push({ x, z, s: 1.1 + random() * 1.2 });
  }

  const trunkGeometry = keep(new THREE.CylinderGeometry(0.11, 0.2, 3, 8));
  trunkGeometry.translate(0, 1.5, 0);
  const crownGeometry = keep(smoothBlob(3, 1.4));
  {
    const position = crownGeometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      v.fromBufferAttribute(position, index);
      v.multiplyScalar(0.82 + noise2(v.x * 1.3 + v.y * 0.7 + 5, v.z * 1.3 - v.y * 0.7) * 0.36);
      position.setXYZ(index, v.x, v.y, v.z);
    }
    crownGeometry.computeVertexNormals();
  }
  const trunkMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.umberDeep) }));
  paintLook(trunkMaterial, { wind, dapple: 0.1, nearFade: 14, sightTo: sightLine });
  const crownMaterial = keep(new THREE.MeshLambertMaterial());
  paintLook(crownMaterial, { wind, gust, nearFade: 14, sightTo: sightLine, strength: 0.05, dapple: 0.45, dappleScale: 0.9 });
  const CROWNS = 4;
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, trees.length * CROWNS);
  const treeShadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, trees.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const place = new THREE.Vector3();
  const tint = new THREE.Color();
  trees.forEach((tree, index) => {
    const groundY = groundHeight(tree.x, tree.z);
    place.set(tree.x, groundY - 0.1, tree.z);
    scale.set(tree.s, tree.s, tree.s);
    matrix.compose(place, quaternion.identity(), scale);
    trunks.setMatrixAt(index, matrix);
    place.set(tree.x + 1.2 * tree.s, groundY + 0.05, tree.z + 0.6 * tree.s);
    scale.set(tree.s * 5.5, 1, tree.s * 4.2);
    matrix.compose(place, quaternion.identity(), scale);
    treeShadows.setMatrixAt(index, matrix);
    const base = C.leaf[Math.floor(random() * C.leaf.length)];
    for (let k = 0; k < CROWNS; k += 1) {
      const angle = random() * Math.PI * 2;
      const spread = k === 0 ? 0 : 0.75 + random() * 0.35;
      place.set(
        tree.x + Math.cos(angle) * spread * tree.s,
        groundY + tree.s * (3 + (k === 0 ? 0.4 : random() * 1.1)),
        tree.z + Math.sin(angle) * spread * tree.s,
      );
      // Narrower than they are tall: slim, upright crowns.
      const s = tree.s * (k === 0 ? 1.15 : 0.7 + random() * 0.25);
      scale.set(s * 0.72, s * (0.95 + random() * 0.25), s * 0.72);
      quaternion.setFromEuler(new THREE.Euler(random(), random() * 6, random()));
      matrix.compose(place, quaternion, scale);
      crowns.setMatrixAt(index * CROWNS + k, matrix);
      crowns.setColorAt(index * CROWNS + k, tint.set(base).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.4) * 0.12));
    }
  });
  scene.add(treeShadows, trunks, crowns);

  // --- Tufts of grass and reeds along the banks --------------------------------------
  const bladeParts: THREE.BufferGeometry[] = [];
  for (let blade = 0; blade < 6; blade += 1) {
    const part = new THREE.ConeGeometry(0.06, 1, 4);
    part.translate(0, 0.5, 0);
    part.rotateZ((blade - 2.5) * 0.18);
    part.rotateY(blade * 1.1);
    part.scale(1, 0.7 + (blade % 3) * 0.2, 1);
    bladeParts.push(part);
  }
  const tuftGeometry = keep(mergeGeometries(bladeParts));
  bladeParts.forEach((part) => part.dispose());
  const tuftMaterial = keep(new THREE.MeshLambertMaterial());
  paintLook(tuftMaterial, { wind, gust, strength: 0.18, dapple: 0.25, dappleScale: 0.5 });
  const TUFTS = 2600;
  const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, TUFTS);
  const tuftColors = [C.grass, "#a99a55", C.ochre, "#b4a25c", "#8f8547"];
  let tuftCount = 0;
  for (let attempt = 0; attempt < TUFTS * 5 && tuftCount < TUFTS; attempt += 1) {
    const x = ORBIT_CENTER.x + (random() - 0.5) * 150;
    const z = ORBIT_CENTER.z + (random() - 0.5) * 150;
    const d = distanceToRiver(x, z);
    if (d < RIVER_HALF_WIDTH + 1.2) continue;
    const reed = d < RIVER_HALF_WIDTH + 2.6;
    if (!reed && d < RIVER_HALF_WIDTH + 7 && random() > 0.15) continue;
    if (noise2(x * 0.3, z * 0.3) < (reed ? 0.42 : 0.48)) continue;
    const height = reed ? 1.2 + random() * 1 : 0.45 + random() * 0.6;
    place.set(x, groundHeight(x, z, d) - 0.05, z);
    const width = 0.8 + random() * 0.8;
    scale.set(width, height, width);
    quaternion.setFromEuler(new THREE.Euler(0, random() * 6, 0));
    matrix.compose(place, quaternion, scale);
    tufts.setMatrixAt(tuftCount, matrix);
    tufts.setColorAt(tuftCount, tint.set(reed ? (random() > 0.5 ? C.grassDeep : C.grass) : tuftColors[Math.floor(random() * tuftColors.length)]));
    tuftCount += 1;
  }
  tufts.count = tuftCount;
  scene.add(tufts);

  // --- Lily pads, bulrushes, wildflowers, pebbles, willows and a fallen log --------
  const riverside = addRiverside({
    scene, keep, random, wind, gust, centre: ORBIT_CENTER, halfWidth: RIVER_HALF_WIDTH, groundHeight,
    distanceToWater: distanceToRiver,
    riverPoint: (arc, side) => {
      const u = THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999);
      const at = curve.getPointAt(u);
      const along = curve.getTangentAt(u);
      return at.addScaledVector(new THREE.Vector3(-along.z, 0, along.x).normalize(), side);
    },
    arcAt: arcAtZ,
    pool: { centre: poolCentre, radius: POOL_RADIUS },
    bridgeArc,
  });

  // --- A barge far upstream, with its red flag ------------------------------------
  const barge = new THREE.Group();
  const bargeMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.umber) }));
  const sailMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.cream), side: THREE.DoubleSide }));
  const flagMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.red), side: THREE.DoubleSide }));
  const hull = new THREE.Mesh(keep(new THREE.BoxGeometry(4.4, 0.9, 1.5)), bargeMaterial);
  hull.position.y = 0.2;
  const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.08, 6.5, 5)), bargeMaterial);
  mast.position.set(0.2, 3.6, 0);
  const sail = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6, 3.4)), sailMaterial);
  sail.position.set(-1.1, 3.6, 0);
  const flag = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 0.45)), flagMaterial);
  flag.position.set(0.7, 6.6, 0);
  barge.add(hull, mast, sail, flag);
  {
    const point = curve.getPointAt(arcAtZ(-150) / riverLength);
    barge.position.set(point.x + 1.2, -0.3, point.z);
    barge.rotation.y = 0.5;
  }
  scene.add(barge);

  const constable = addConstable({ scene, keep, groundHeight: (x, z) => groundHeight(x, z), ford, across: fordAcross, cottage: cottageAt, wind });

  // Cole's oxbow, Seurat's parasols, a model Temeraire under tow, and the Lady of Shalott's boat.
  const gallery = addGallery({
    scene, keep, groundHeight: (x, z) => groundHeight(x, z), wind, oxbow,
    halfWidth: RIVER_HALF_WIDTH, arcAt: arcAtZ,
    riverPoint: (arc, side) => {
      const u = THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999);
      const at = curve.getPointAt(u);
      const along = curve.getTangentAt(u);
      return at.addScaledVector(new THREE.Vector3(-along.z, 0, along.x).normalize(), side);
    },
    riverTangent: (arc) => curve.getTangentAt(THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999)),
  });

  // Further along, for those who walk: more creatures, and more water paintings.
  const wanders = addWanders({
    scene, keep, groundHeight: (x, z) => groundHeight(x, z), wind,
    halfWidth: RIVER_HALF_WIDTH, arcAt: arcAtZ,
    riverPoint: (arc, side) => {
      const u = THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999);
      const at = curve.getPointAt(u);
      const along = curve.getTangentAt(u);
      return at.addScaledVector(new THREE.Vector3(-along.z, 0, along.x).normalize(), side);
    },
    riverTangent: (arc) => curve.getTangentAt(THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999)),
    ripple: (at, size) => ripple(at, size),
    tugAt: gallery.tugAt,
  });

  // --- Rafts for the pieces afloat, and ripples --------------------------------
  const plankGeometry = keep(new THREE.BoxGeometry(0.42, 0.16, 1.6));
  const poleGeometry = keep(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 5));
  const raftWood = ["#8a6339", "#a77a45", "#6e4c2b"];
  // Bake six rigid wooden pieces into one vertex-coloured draw call per raft.
  // The flag and shadow remain separate so they can still animate normally.
  const raftBodyMaterial = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const raftBodyGeometry = (() => {
    const pieces: THREE.BufferGeometry[] = [];
    const add = (geometry: THREE.BufferGeometry, colour: string, position: THREE.Vector3,
      rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1)) => {
      const part = geometry.clone();
      const matrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      part.applyMatrix4(matrix);
      const tint = new THREE.Color(colour);
      const count = part.getAttribute("position").count;
      const colours = new Float32Array(count * 3);
      for (let index = 0; index < count; index += 1) {
        colours[index * 3] = tint.r;
        colours[index * 3 + 1] = tint.g;
        colours[index * 3 + 2] = tint.b;
      }
      part.setAttribute("color", new THREE.BufferAttribute(colours, 3));
      pieces.push(part);
    };
    for (let plank = 0; plank < 4; plank += 1) {
      add(plankGeometry, raftWood[plank % 3], new THREE.Vector3((plank - 1.5) * 0.44, 0, (plank % 2) * 0.08));
    }
    add(plankGeometry, raftWood[2], new THREE.Vector3(0, 0.1, 0),
      new THREE.Euler(0, Math.PI / 2, 0), new THREE.Vector3(0.6, 0.8, 1.15));
    add(poleGeometry, raftWood[2], new THREE.Vector3(0.3, 0.6, 0.3));
    const merged = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!merged) throw new Error("Unable to batch the raft geometry");
    return keep(merged);
  })();
  const rafts: THREE.Group[] = [];
  const pennantGeometry = keep(new THREE.PlaneGeometry(0.42, 0.22));
  pennantGeometry.translate(0.21, 0, 0);
  const pennantMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.cream), side: THREE.DoubleSide }));
  function raftAt(index: number) {
    while (rafts.length <= index) {
      const raft = new THREE.Group();
      raft.add(new THREE.Mesh(raftBodyGeometry, raftBodyMaterial));
      const pennant = new THREE.Mesh(pennantGeometry, pennantMaterial);
      pennant.position.set(0.3, 1.02, 0.3);
      pennant.name = "pennant";
      raft.add(pennant);
      const shade = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shade.scale.set(3, 1, 3.2);
      shade.position.y = -0.08;
      raft.add(shade);
      raft.visible = false;
      scene.add(raft);
      rafts.push(raft);
    }
    return rafts[index];
  }

  // A finished piece's raft becomes a little ship, ready for the sea: a
  // tarred hull, a mast with a cream sail and jib, and a gold pennant.
  const hullGeometry = (() => {
    const geometry = new THREE.BoxGeometry(0.95, 0.42, 2.3, 4, 2, 8);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const bow = THREE.MathUtils.smoothstep(z, 0.1, 1.15);
      const stern = THREE.MathUtils.smoothstep(-z, 0.7, 1.15) * 0.25;
      const keel = y < 0 ? 0.55 : 1;
      position.setX(index, x * (1 - bow * 0.92 - stern) * keel);
      position.setY(index, y + bow * bow * 0.18 + (y < 0 ? -Math.abs(x) * 0.15 : 0));
    }
    geometry.computeVertexNormals();
    return keep(geometry);
  })();
  const hullMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#5a3a22") }));
  const trimMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(C.ochre) }));
  const shipSailMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#f4ead2"), side: THREE.DoubleSide }));
  const goldMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#e0b24a"), side: THREE.DoubleSide, emissive: new THREE.Color("#5a3d08") }));
  const mainSailGeometry = (() => {
    const geometry = new THREE.PlaneGeometry(1.25, 1.35, 6, 6);
    geometry.rotateY(Math.PI / 2);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const z = position.getZ(index);
      // Bellied out by the wind.
      position.setX(index, Math.cos(z * 2.2) * Math.cos(y * 1.9) * 0.22);
    }
    geometry.computeVertexNormals();
    return keep(geometry);
  })();
  const jibGeometry = (() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 1.25, 0, 0, 0, 1.05], 3));
    geometry.computeVertexNormals();
    return keep(geometry);
  })();
  const mastGeometry = keep(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 6));
  const flagGeometry = keep(new THREE.PlaneGeometry(0.46, 0.18));
  flagGeometry.translate(0.23, 0, 0);
  function makeShip() {
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.05;
    const trim = new THREE.Mesh(plankGeometry, trimMaterial);
    trim.scale.set(1.9, 0.35, 1.25);
    trim.position.y = 0.3;
    const mast = new THREE.Mesh(mastGeometry, hullMaterial);
    mast.position.set(0, 1.35, 0.05);
    const sail = new THREE.Mesh(mainSailGeometry, shipSailMaterial);
    sail.position.set(0, 1.25, -0.25);
    sail.name = "sail";
    const jib = new THREE.Mesh(jibGeometry, shipSailMaterial);
    jib.position.set(0, 0.35, 0.15);
    const flag = new THREE.Mesh(flagGeometry, goldMaterial);
    flag.position.set(0, 2.38, 0.05);
    flag.name = "flag";
    const shade = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shade.scale.set(2.2, 1, 3.4);
    shade.position.y = -0.08;
    ship.add(hull, trim, mast, sail, jib, flag, shade);
    ship.visible = false;
    scene.add(ship);
    return ship;
  }

  const ringGeometry = keep(new THREE.RingGeometry(0.86, 1, 48));
  ringGeometry.rotateX(-Math.PI / 2);
  type Ripple = { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; start: number; size: number };
  const ripples: Ripple[] = Array.from({ length: 20 }, () => {
    const material = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(C.foam), transparent: true, opacity: 0, depthWrite: false }));
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    return { mesh, material, start: -1, size: 1 };
  });
  let rippleIndex = 0;
  function ripple(at: THREE.Vector3, size = 1, now = performance.now()) {
    const next = ripples[rippleIndex % ripples.length];
    rippleIndex += 1;
    next.mesh.position.set(at.x, -0.24, at.z);
    next.start = now;
    next.size = size;
    next.mesh.visible = true;
  }

  // --- Motes of dust in the sunlight ---------------------------------------------
  const MOTES = 180;
  const motePositions = new Float32Array(MOTES * 3);
  const moteSeeds = new Float32Array(MOTES);
  for (let index = 0; index < MOTES; index += 1) {
    motePositions[index * 3] = ORBIT_CENTER.x + (random() - 0.5) * 50;
    motePositions[index * 3 + 1] = 0.5 + random() * 9;
    motePositions[index * 3 + 2] = ORBIT_CENTER.z + (random() - 0.5) * 50;
    moteSeeds[index] = random() * 100;
  }
  const moteBase = motePositions.slice();
  const moteGeometry = keep(new THREE.BufferGeometry());
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  scene.add(new THREE.Points(moteGeometry, keep(new THREE.PointsMaterial({
    color: new THREE.Color("#fff3d6"), size: 0.16, transparent: true, opacity: 0.7, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))));

  // --- Life in the glade, and you -----------------------------------------------------
  function arcNear(x: number, z: number) {
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < samples.length; index += 2) {
      const point = samples[index];
      const d = (point.x - x) ** 2 + (point.z - z) ** 2;
      if (d < bestDistance) { bestDistance = d; best = index; }
    }
    return (best / SAMPLES) * riverLength;
  }

  const life = createLife({
    scene, curve, riverLength, halfWidth: RIVER_HALF_WIDTH, groundHeight, distanceToRiver, arcNear,
    ripple, random, keep, trees, gust,
    pool: { centre: poolCentre, radius: POOL_RADIUS },
    lilyPads: riverside.lilyPads,
  });

  // Solid things on the ground the walker goes round.
  const fixedObstacles: Obstacle[] = [
    ...trees.map((tree) => ({ x: tree.x, z: tree.z, r: 0.2 * tree.s + 0.25 })),
    ...riverside.willows.map((at) => ({ x: at.x, z: at.z, r: 0.8 })),
    ...riverside.logPoints.map((at) => ({ x: at.x, z: at.z, r: 0.65 })),
    ...rockSpots.map((rock) => ({ x: rock.x, z: rock.y, r: rock.z * 1.1 })),
    ...constable.obstacles,
    ...gallery.obstacles,
    ...wanders.obstacles,
  ];
  const nearbyObstacles: Obstacle[] = [];
  let lookAroundAt = 0;

  /** Which creatures are near enough to step round? Checked a few times a second. */
  function lookAround(now: number) {
    if (now < lookAroundAt) return;
    lookAroundAt = now + 250;
    nearbyObstacles.length = 0;
    life.around(walkerAt, nearbyObstacles);
    options.onSurroundings?.({
      river: Math.max(0, distanceToRiver(walkerAt.x, walkerAt.z) - RIVER_HALF_WIDTH),
      rain: Math.hypot(walkerAt.x - wanders.showerAt.x, walkerAt.z - wanders.showerAt.z),
    });
  }

  /**
   * Keep the walker out of trees, rocks, the log and any creature in the way.
   * Bumping into something, they edge round it toward where they were going.
   */
  function stepAround(position: THREE.Vector3, headingX: number, headingZ: number, step: number) {
    for (const list of [fixedObstacles, nearbyObstacles]) {
      for (const obstacle of list) {
        const dx = position.x - obstacle.x;
        const dz = position.z - obstacle.z;
        const gap = obstacle.r + 0.45;
        const distance = Math.hypot(dx, dz);
        if (distance >= gap || distance === 0) continue;
        const nx = dx / distance;
        const nz = dz / distance;
        // Sidestep along the obstacle's edge, on the side that leads onward.
        let tx = -nz;
        let tz = nx;
        if (tx * headingX + tz * headingZ < 0) { tx = -tx; tz = -tz; }
        position.x = obstacle.x + nx * gap + tx * step;
        position.z = obstacle.z + nz * gap + tz * step;
      }
    }
  }

  const walker = makeWalker(keep);
  scene.add(walker.figure);
  const walkerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  walkerShadow.scale.set(1.8, 1, 1.8);
  scene.add(walkerShadow);
  const walkerAt = new THREE.Vector3();
  {
    // Start on the bank beside the first piece's place in the stream.
    const u = nearArc / riverLength;
    curve.getPointAt(u, walkerAt);
    curve.getTangentAt(u, tangent);
    lateral.set(-tangent.z, 0, tangent.x).normalize();
    walkerAt.addScaledVector(lateral, RIVER_HALF_WIDTH + 2.6);
  }
  const walkTarget = walkerAt.clone();
  /** Points still to walk through after the current target, e.g. along the bridge. */
  const walkPath: THREE.Vector3[] = [];
  let onDeck = false;
  let blockedFor = 0;
  let walkerSpeed = 0;
  let wadeRippleAt = 0;
  let fordRippleAt = 0;
  const focus = walkerAt.clone();
  focus.y = 0.6;

  function clampToGlade(point: THREE.Vector3) {
    const offset = new THREE.Vector2(point.x - ORBIT_CENTER.x, point.z - ORBIT_CENTER.z);
    if (offset.length() > WALK_LIMIT) offset.setLength(WALK_LIMIT);
    return new THREE.Vector3(ORBIT_CENTER.x + offset.x, 0, ORBIT_CENTER.z + offset.y);
  }

  /**
   * Walk to x, z. The bridge is only climbed from its ends: aiming for the
   * deck goes round by the nearer end, and leaving it goes off the end on the
   * side you're heading for. Anywhere else you simply walk (or wade, or pass
   * underneath the arch).
   */
  function walkTo(x: number, z: number, ontoBridge = false) {
    const goal = clampToGlade(new THREE.Vector3(x, 0, z));
    const route: THREE.Vector3[] = [];
    const here = bridgeLocal(walkerAt.x, walkerAt.z);
    if (ontoBridge && !onDeck) {
      const end = Math.sign(here.along) || 1;
      route.push(bridgeEnd(end, 1.2), bridgeEnd(end, -0.4));
    } else if (!ontoBridge && onDeck) {
      const there = bridgeLocal(goal.x, goal.z);
      const end = Math.sign(there.along) || 1;
      route.push(bridgeEnd(end, -0.4), bridgeEnd(end, 1.2));
    }
    route.push(goal);
    walkTarget.copy(route.shift()!);
    walkPath.splice(0, walkPath.length, ...route);
  }

  // --- The oil-paint pass ------------------------------------------------------------
  // The scene is drawn into a texture, then repainted: a Kuwahara filter flattens
  // it into daubs, a slow wobble breaks up edges like a loaded brush, and canvas
  // weave, stroke texture, a warm grade and a soft vignette finish it.
  const paintTarget = keep(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 2 }));
  const paintUniforms = {
    tScene: { value: paintTarget.texture },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
  };
  const paintMaterial = keep(new THREE.ShaderMaterial({
    uniforms: paintUniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene; uniform vec2 uTexel; uniform vec2 uResolution; uniform float uTime;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main() {
        vec2 uv = vUv;
        // A loaded brush: edges wander a little, slowly.
        vec2 wobble = vec2(noise(uv * vec2(70.0, 45.0) + uTime * 0.02), noise(uv * vec2(45.0, 70.0) + 9.0 - uTime * 0.02)) - 0.5;
        uv += wobble * uTexel * 5.0;

        // Kuwahara: of four quadrants round each pixel, keep the calmest one's mean.
        vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);
        vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);
        // Sampling every 1.6 texels makes the daubs broader, like a wide brush.
        for (int j = -3; j <= 3; j++) {
          for (int i = -3; i <= 3; i++) {
            vec3 c = texture2D(tScene, uv + vec2(float(i), float(j)) * uTexel * 1.6).rgb;
            vec3 c2 = c * c;
            if (i <= 0 && j <= 0) { m0 += c; s0 += c2; }
            if (i >= 0 && j <= 0) { m1 += c; s1 += c2; }
            if (i >= 0 && j >= 0) { m2 += c; s2 += c2; }
            if (i <= 0 && j >= 0) { m3 += c; s3 += c2; }
          }
        }
        float n = 16.0;
        m0 /= n; m1 /= n; m2 /= n; m3 /= n;
        float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
        float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
        float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
        float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
        vec3 col = m0; float best = v0;
        if (v1 < best) { best = v1; col = m1; }
        if (v2 < best) { best = v2; col = m2; }
        if (v3 < best) { best = v3; col = m3; }

        // Strokes: short directional streaks of light and dark in the paint.
        vec2 px = vUv * uResolution;
        float angle = noise(px * 0.004) * 3.14159;
        mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 sp = turn * px;
        float stroke = noise(vec2(sp.x * 0.025, sp.y * 0.22)) - 0.5;
        col *= 1.0 + stroke * 0.09;
        // Canvas weave and grain.
        float weave = sin(px.x * 1.9) * sin(px.y * 1.9);
        col *= 1.0 + weave * 0.018 + (hash(px) - 0.5) * 0.025;
        // A warm varnish: golden lights, richer colour, umber at the edges.
        col = mix(col, col * vec3(1.06, 1.0, 0.9), 0.5);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, 1.08);
        vec2 q = vUv - 0.5;
        float vignette = smoothstep(0.85, 0.25, length(q * vec2(1.0, 1.25)));
        col = mix(col * vec3(0.78, 0.68, 0.55), col, vignette);
        gl_FragColor = vec4(max(col, 0.0), 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
  const paintScene = new THREE.Scene();
  const paintCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  paintScene.add(new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), paintMaterial));

  // --- Looking round: drag to orbit, wheel to step closer --------------------------
  const orbit = { yaw: 0, pitch: ORBIT_PITCH, radius: ORBIT_RADIUS, spin: 0, target: null as number | null };
  function placeCamera() {
    const flat = Math.cos(orbit.pitch) * orbit.radius;
    camera.position.set(
      focus.x + Math.sin(orbit.yaw) * flat,
      focus.y + Math.sin(orbit.pitch) * orbit.radius,
      focus.z + Math.cos(orbit.yaw) * flat,
    );
    camera.lookAt(focus);
    camera.updateMatrixWorld();
  }
  placeCamera();
  // --- Sizing -------------------------------------------------------------------
  let width = 1;
  let height = 1;
  let dirty = true;
  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    // The paint pass works on a slightly smaller picture; the daubs hide it.
    // Broad brush strokes hide a lower-resolution paint texture.
    const paintScale = Math.min(pixelRatio, 1.25) * 0.72;
    const targetWidth = Math.max(1, Math.round(width * paintScale));
    const targetHeight = Math.max(1, Math.round(height * paintScale));
    paintTarget.setSize(targetWidth, targetHeight);
    paintUniforms.uTexel.value.set(1 / targetWidth, 1 / targetHeight);
    paintUniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    camera.aspect = width / height;
    // Narrow screens see more of the river by widening the lens.
    camera.fov = camera.aspect < 0.7 ? 64 : camera.aspect < 1.1 ? 56 : 46;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  resize();
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(host);
  window.addEventListener("resize", resize);

  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag: { x: number; y: number; startX: number; startY: number; id: number; moved: boolean } | null = null;
  function onPointerDown(event: PointerEvent) {
    drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, id: event.pointerId, moved: false };
    orbit.spin = 0;
    orbit.target = null;
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* not a live pointer */ }
  }
  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
    if (!drag.moved) return;
    orbit.yaw -= dx * 0.0055;
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.004, 0.12, 0.8);
    orbit.spin = -dx * 0.0055;
    canvas.classList.add("glade-gl-turning");
    dirty = true;
  }
  function onPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    canvas.classList.remove("glade-gl-turning");
    if (!drag.moved) {
      // A tap walks you there; a tap on the water also sends out ripples.
      const rect = canvas.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([water, ground, bridge], true)[0];
      if (hit) {
        if (hit.object === water) {
          ripple(hit.point, 1.2);
          ripple(hit.point, 0.6, performance.now() + 180);
        }
        let part: THREE.Object3D | null = hit.object;
        while (part && part !== bridge) part = part.parent;
        walkTo(hit.point.x, hit.point.z, part === bridge);
      }
    }
    if (!options.animate()) orbit.spin = 0;
    drag = null;
    dirty = true;
  }
  function onWheel(event: WheelEvent) {
    event.preventDefault();
    orbit.radius = THREE.MathUtils.clamp(orbit.radius * (1 + event.deltaY * 0.001), 10, 55);
    dirty = true;
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // Arrow keys (or WASD) walk you about too, relative to where the camera looks.
  const KEY_DIRECTIONS: Record<string, [number, number]> = {
    ArrowUp: [0, 1], KeyW: [0, 1],
    ArrowDown: [0, -1], KeyS: [0, -1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const keysHeld = new Set<string>();
  function typingInto(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  }
  function onKeyDown(event: KeyboardEvent) {
    if (!(event.code in KEY_DIRECTIONS) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (typingInto(event.target)) return;
    event.preventDefault();
    keysHeld.add(event.code);
  }
  function onKeyUp(event: KeyboardEvent) {
    if (keysHeld.delete(event.code) && keysHeld.size === 0) {
      walkTarget.copy(walkerAt);
      walkPath.length = 0;
    }
  }
  function onBlur() {
    keysHeld.clear();
  }
  /** While keys are held, keep a target a little ahead in the direction they point. */
  function steerByKeys() {
    if (keysHeld.size === 0) return;
    let side = 0;
    let ahead = 0;
    keysHeld.forEach((code) => {
      side += KEY_DIRECTIONS[code][0];
      ahead += KEY_DIRECTIONS[code][1];
    });
    const length = Math.hypot(side, ahead);
    if (length === 0) return;
    side /= length;
    ahead /= length;
    const sin = Math.sin(orbit.yaw);
    const cos = Math.cos(orbit.yaw);
    const x = -sin * ahead + cos * side;
    const z = -cos * ahead - sin * side;
    const goal = clampToGlade(new THREE.Vector3(walkerAt.x + x * 1.2, 0, walkerAt.z + z * 1.2));
    walkTarget.copy(goal);
    walkPath.length = 0;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // --- The stream -------------------------------------------------------------------
  const states = new Map<string, FloatState>();
  const worldPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let generation: string | null = null;
  let streamTime = 0;
  let streamWindow = STREAM_MIN_WINDOW;
  let lastVisible: string | null = null;
  /** Where each piece's raft was last frame, for "walk to the next piece". */
  const raftSpots: { id: string; seq: number; at: THREE.Vector3; side: THREE.Vector3; open: boolean }[] = [];
  /** Where each river piece was last seen, so one opened can be seen making for the eddies. */
  const lastSpots = new Map<string, { at: THREE.Vector3; arc: number; side: number }>();
  /** The piece "walk to the next piece" last went to, so it moves on round them all. */
  let walkedTo: { id: string; seq: number } | null = null;

  /** The first clear line below the title and chips along the top. */
  function topClearance() { return clearTop; }

  // Read card geometry together, before positioning changes any styles.
  // Previously each placeCard read offsetWidth/Height after writing the previous
  // card's transform, repeatedly forcing browser layout during a frame.
  type CardMeasurement = {
    firstChild: Element | null;
    cardHeight: number;
    boxWidth: number;
    boxHeight: number;
  };
  const cardMeasurements = new Map<HTMLElement, CardMeasurement>();
  let clearTop = 110;
  let measuredAt = -Infinity;
  let measuredWidth = -1;
  let measuredHeight = -1;
  function measureCardGeometry(now: number) {
    const elements: HTMLElement[] = [];
    for (const list of [options.floats(), options.pool()]) {
      if (list) elements.push(...Array.from(list.children) as HTMLElement[]);
    }
    // Existing article labels rarely change size. Avoid layout reads on every
    // frame, but measure immediately when a card becomes a lifted sheet or the
    // viewport changes. Periodic checks handle late font/layout changes.
    const unchanged = elements.length === cardMeasurements.size
      && elements.every((element) => cardMeasurements.get(element)?.firstChild === element.firstElementChild);
    if (unchanged && measuredWidth === width && measuredHeight === height && now - measuredAt < 180) return;
    cardMeasurements.clear();
    for (const element of elements) {
      const child = element.firstElementChild as HTMLElement | null;
      cardMeasurements.set(element, {
        firstChild: child,
        cardHeight: child?.offsetHeight ?? 80,
        boxWidth: element.offsetWidth,
        boxHeight: element.offsetHeight,
      });
    }
    const chrome = host.closest(".glade-home-layout")?.querySelector(".glade-top")?.getBoundingClientRect();
    clearTop = chrome ? chrome.bottom - host.getBoundingClientRect().top + 10 : 110;
    measuredAt = now;
    measuredWidth = width;
    measuredHeight = height;
  }

  /** Move a card onto its raft on screen. Returns how visible it ended up. */
  function placeCard(element: HTMLElement, at: THREE.Vector3, fade: number, lifted: boolean,
    pinned?: { left: number; top: number; size: number }) {
    projected.copy(at);
    projected.y += 0.25;
    const distance = camera.position.distanceTo(projected);
    projected.project(camera);
    const behind = projected.z > 1;
    let opacity = fade * (1 - THREE.MathUtils.smoothstep(distance, CARD_FADE_START, CARD_FADE_END));
    if (lifted) opacity = 1;
    const x = (projected.x + 1) / 2 * width;
    const y = (1 - projected.y) / 2 * height;

    const { cardHeight, boxWidth, boxHeight } = cardMeasurements.get(element)
      ?? { cardHeight: 80, boxWidth: 200, boxHeight: 80 };
    // Depth: far pieces are smaller, hazier and lean back with the water;
    // near ones come up large and clear.
    const size = lifted ? 1 : THREE.MathUtils.clamp(24 / distance, 0.52, 1.12);
    const margin = 12;
    let left = pinned ? pinned.left : x - boxWidth / 2;
    let top = pinned ? pinned.top : y - cardHeight - 6;
    if (lifted) {
      left = THREE.MathUtils.clamp(left, margin, Math.max(margin, width - boxWidth - margin));
      const safeTop = topClearance();
      top = THREE.MathUtils.clamp(top, safeTop, Math.max(safeTop, height - boxHeight - margin));
    }
    const shown = lifted || (!behind && opacity > 0.02);
    const style = element.style;
    // Don't continuously reposition labels that cannot be seen. They will
    // receive a fresh transform on the first frame they become visible.
    const outsideView = !pinned && !lifted &&
      (x < -boxWidth || x > width + boxWidth || y < -boxHeight || y > height + boxHeight);
    if (!shown || outsideView) {
      if (style.visibility !== "hidden") style.visibility = "hidden";
      if (style.opacity !== "0") style.opacity = "0";
      return { opacity, onScreen: false };
    }

    const origin = `50% ${cardHeight + 6}px`;
    if (style.transformOrigin !== origin) style.transformOrigin = origin;
    let depth = "";
    if (!lifted && !pinned) {
      const far = THREE.MathUtils.smoothstep(distance, 16, 48);
      const seed = Number(element.dataset.seq ?? 0) * 1.7;
      // Each raft bobs and rocks a little on the current, more gently far off.
      const bob = Math.sin(time * 1.1 + seed) * (2.2 - far * 1.4);
      const rock = Math.sin(time * 0.7 + seed * 1.3) * (1.6 - far);
      // Looking down on the water, the labels lean back; off to the side they
      // turn a touch toward you.
      const lean = 10 + far * 16;
      const turn = THREE.MathUtils.clamp(-projected.x * 14, -14, 14);
      top += bob;
      depth = ` perspective(700px) rotateX(${lean.toFixed(1)}deg) rotateY(${turn.toFixed(1)}deg) rotate(${rock.toFixed(2)}deg)`;
      const farValue = (Math.round(far * 10) / 10).toFixed(1);
      if (style.getPropertyValue("--far") !== farValue) style.setProperty("--far", farValue);
    } else if (style.getPropertyValue("--far") !== "0") {
      style.setProperty("--far", "0");
    }
    const transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) scale(${(pinned && !lifted ? pinned.size : size).toFixed(3)})${depth}`;
    if (style.transform !== transform) style.transform = transform;
    const nextOpacity = opacity.toFixed(3);
    if (style.opacity !== nextOpacity) style.opacity = nextOpacity;
    const zIndex = String(lifted ? 2000 : Math.round(1000 - distance * 5));
    if (style.zIndex !== zIndex) style.zIndex = zIndex;
    if (style.visibility !== "visible") style.visibility = "visible";
    return { opacity, onScreen: opacity > 0.5 && x > 0 && x < width && y > 0 && y < height };
  }

  // The eddies: pieces you are reading turn slowly round the pool. One pushed
  // out by a newcomer slips through the mouth into the river and floats away.
  const poolRafts: THREE.Group[] = [];
  type PoolState = {
    bornAt: number;
    driftAt: number | null;
    from: THREE.Vector3 | null;
    /** Opened from the river: where its raft was, and when (in glade time) it set off for the eddies. */
    arriving: { arc: number; side: number; start: number } | null;
    /** Finished: when (in glade time) it began to turn into a ship. */
    sailAt: number | null;
    ship: THREE.Group | null;
    heading: number;
    /** Where it was last frame, to face the way it is going. */
    last: THREE.Vector3;
  };
  const poolStates = new Map<string, PoolState>();
  const poolPoint = new THREE.Vector3();
  const lastPoolPoint = new THREE.Vector3();
  /** Along the river at this arc, this far to the side. */
  function riverPoint(arc: number, side: number, out: THREE.Vector3) {
    const u = THREE.MathUtils.clamp(arc / riverLength, 0, 1);
    curve.getPointAt(u, out);
    curve.getTangentAt(u, tangent);
    lateral.set(-tangent.z, 0, tangent.x).normalize();
    return out.addScaledVector(lateral, side);
  }
  /** Out of the pool, along the inlet, and away downstream: t is seconds since setting off. */
  function outOfPool(from: THREE.Vector3, t: number, speed: number, out: THREE.Vector3) {
    if (t < 3) return out.lerpVectors(from, poolInlet, THREE.MathUtils.smoothstep(t, 0, 3));
    if (t < 6) return out.lerpVectors(poolInlet, poolMouth, THREE.MathUtils.smoothstep(t, 3, 6));
    // Ease from the mouth into the stream, then follow it down.
    const along = (t - 6) * speed;
    riverPoint(poolArc + along, -1.4, out);
    return out.lerp(poolMouth, Math.max(0, 1 - along / 3));
  }
  function layoutPool(now: number, animate: boolean) {
    const list = options.pool();
    const items = list ? Array.from(list.children) as HTMLElement[] : [];
    const settled = items.filter((element) => element.dataset.state !== "drifting" && element.dataset.state !== "sailing");
    const present = new Set<string>();
    while (poolRafts.length < items.length) {
      const raft = raftAt(rafts.length);
      rafts.splice(rafts.indexOf(raft), 1);
      poolRafts.push(raft);
    }
    poolRafts.forEach((raft) => { raft.visible = false; });

    // Close to the pool, its pieces stand in a tidy column above it, newest at
    // the top, rather than piling up on their rafts.
    const liftedHere = items.some((element) => element.dataset.state === "lifted");
    // The column stands just beside the pool, on whichever side has room.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    const toScreen = (point: THREE.Vector3) => {
      projected.copy(point).project(camera);
      return { x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height };
    };
    const centreOnScreen = toScreen(poolCentre.clone().setY(0.4));
    const rightRim = toScreen(poolCentre.clone().addScaledVector(right, POOL_RADIUS + 0.8).setY(0.4));
    const leftRim = toScreen(poolCentre.clone().addScaledVector(right, -(POOL_RADIUS + 0.8)).setY(0.4));
    const anchorY = centreOnScreen.y;
    const columnSize = 0.92;
    const gap = 6;
    const heights = settled.map((element) => (cardMeasurements.get(element)?.cardHeight ?? 44) * columnSize);
    const columnHeight = heights.reduce((sum, h) => sum + h + gap, 0);
    const safeTop = topClearance();
    let columnTop = THREE.MathUtils.clamp(anchorY - columnHeight / 2, safeTop, Math.max(safeTop, height - columnHeight - 90));
    const columnTops = heights.map((h) => { const top = columnTop; columnTop += h + gap; return top; });

    items.forEach((element, index) => {
      const id = element.dataset.id ?? String(index);
      present.add(id);
      const mode = element.dataset.state ?? "";
      let state = poolStates.get(id);
      if (!state) {
        // Opened from the river: its raft is seen making its way to the eddies.
        const spot = mode === "" ? lastSpots.get(id) : undefined;
        state = {
          bornAt: now, driftAt: null, from: null, ship: null, sailAt: null, heading: 0, last: new THREE.Vector3(),
          arriving: spot && animate ? { arc: spot.arc, side: spot.side, start: time } : null,
        };
        poolStates.set(id, state);
      }
      const lifted = mode === "lifted";
      let opacity = animate && !state.arriving ? Math.min(1, (now - state.bornAt) / 900) : 1;
      let shipGrown = 0;
      lastPoolPoint.copy(state.last);

      if (mode === "sailing") {
        // Finished. The raft turns into a ship, then sails out and away to sea.
        if (state.sailAt === null) {
          state.sailAt = time;
          state.from = (state.from ?? poolCentre).clone();
          state.ship = makeShip();
          ripple(state.from, 1.6, now);
        }
        const from = state.from ?? poolCentre;
        const age = animate ? time - state.sailAt : 60;
        shipGrown = THREE.MathUtils.smoothstep(age, 0.2, 1.4);
        if (animate && age > 0.5 && element.dataset.rippled !== "2") { element.dataset.rippled = "2"; ripple(from, 2.4, now); }
        if (animate && age > 1.1 && element.dataset.rippled !== "3") { element.dataset.rippled = "3"; ripple(from, 3.2, now); }
        if (age < 1.6) poolPoint.copy(from);
        else outOfPool(from, (age - 1.6) * 1.4, 3.4, poolPoint);
        opacity *= 1 - THREE.MathUtils.smoothstep(age, 14, 20);
      } else if (mode === "drifting") {
        if (state.driftAt === null) { state.driftAt = time; state.from = (state.from ?? poolCentre).clone(); }
        const age = animate ? time - state.driftAt : 60;
        // Across the pool to the inlet, along it to the river, and away downstream.
        outOfPool(state.from ?? poolInlet, age * 0.85, 1.1, poolPoint);
        opacity *= 1 - THREE.MathUtils.smoothstep(age, 20, 26);
      } else {
        const place = settled.indexOf(element);
        const angle = (animate ? time : 0) * POOL_SPEED + (place / Math.max(1, settled.length)) * Math.PI * 2;
        const ring = settled.length === 1 ? 0.8 : 3.1;
        poolPoint.set(poolCentre.x + Math.cos(angle) * ring, 0, poolCentre.z + Math.sin(angle) * ring);
        if (state.arriving) {
          // Up (or down) the river to the mouth, along the inlet, and into its place.
          const { arc, side, start } = state.arriving;
          const t = time - start;
          const riverTime = THREE.MathUtils.clamp(Math.abs(poolArc - arc) / 2.6, 1.5, 9);
          const ringPoint = poolPoint.clone();
          if (t < riverTime) {
            const k = THREE.MathUtils.smoothstep(t, 0, riverTime);
            riverPoint(THREE.MathUtils.lerp(arc, poolArc, k), THREE.MathUtils.lerp(side, -(RIVER_HALF_WIDTH - 1.6), k), poolPoint);
          } else if (t < riverTime + 2.5) {
            poolPoint.lerpVectors(poolMouth, poolInlet, THREE.MathUtils.smoothstep(t, riverTime, riverTime + 2.5));
          } else if (t < riverTime + 5) {
            poolPoint.lerpVectors(poolInlet, ringPoint, THREE.MathUtils.smoothstep(t, riverTime + 2.5, riverTime + 5));
          } else {
            state.arriving = null;
          }
          if (state.arriving && !animate) state.arriving = null;
          if (!state.arriving) poolPoint.copy(ringPoint);
        }
        state.from = poolPoint.clone();
      }
      poolPoint.y = -0.22 + (animate ? Math.sin(time * 0.9 + index) * 0.05 : 0);

      const raft = poolRafts[index];
      const travelling = mode === "sailing" || mode === "drifting" || Boolean(state.arriving);
      raft.visible = opacity > 0.02 && shipGrown < 1;
      raft.position.copy(poolPoint);
      raft.scale.setScalar(1 - shipGrown);
      if (travelling) {
        // Face the way it is going.
        const dx = poolPoint.x - lastPoolPoint.x;
        const dz = poolPoint.z - lastPoolPoint.z;
        if (Math.hypot(dx, dz) > 0.002) {
          const want = Math.atan2(dx, dz);
          const turn = Math.atan2(Math.sin(want - state.heading), Math.cos(want - state.heading));
          state.heading += turn * (animate ? 0.08 : 1);
        }
        raft.rotation.set(0, state.heading, 0);
      } else {
        raft.rotation.set(0, (animate ? time : 0) * POOL_SPEED * 2 + index, 0);
        state.heading = raft.rotation.y;
      }
      state.last.copy(poolPoint);
      if (state.ship) {
        const ship = state.ship;
        ship.visible = opacity > 0.02 && shipGrown > 0;
        ship.position.copy(poolPoint);
        // Grows up out of the raft with a little bounce, and heels in the breeze.
        const bounce = shipGrown < 1 ? Math.sin(shipGrown * Math.PI) * 0.18 : 0;
        ship.scale.setScalar(Math.max(0.001, shipGrown + bounce));
        ship.rotation.set(Math.sin(time * 1.3) * 0.05, state.heading, -0.1 + Math.sin(time * 0.9) * 0.04);
        const sail = ship.getObjectByName("sail");
        if (sail) sail.scale.set(1 + Math.sin(time * 2.4) * 0.08, THREE.MathUtils.smoothstep(shipGrown, 0.4, 1), 1);
        const flag = ship.getObjectByName("flag");
        if (flag) flag.rotation.y = Math.PI / 2 + Math.sin(time * 4) * 0.45;
        if (animate && mode === "sailing" && now > (Number(element.dataset.wakeAt) || 0) && shipGrown >= 1) {
          element.dataset.wakeAt = String(now + 450);
          ripple(poolPoint, 0.8, now);
        }
      }

      const reach = Math.hypot(poolPoint.x - walkerAt.x, poolPoint.z - walkerAt.z);
      const near = 1 - THREE.MathUtils.smoothstep(reach, NEAR_OPEN, NEAR_GONE);
      const place = settled.indexOf(element);
      if (place >= 0 && !lifted) {
        // While one is lifted, the rest step back so its actions have room.
        const elementWidth = cardMeasurements.get(element)?.boxWidth ?? 200;
        const columnWidth = elementWidth * columnSize;
        const fitsRight = rightRim.x + columnWidth + 12 < width;
        const wanted = fitsRight ? rightRim.x + 8 : leftRim.x - columnWidth - 8;
        const left = THREE.MathUtils.clamp(wanted, 12, Math.max(12, width - columnWidth - 12));
        // The column fades in and out as one, as you arrive at the pool.
        placeCard(element, poolPoint, liftedHere ? 0 : opacity * atPool, false,
          { left: left - (elementWidth - columnWidth) / 2, top: columnTops[place], size: columnSize });
      } else {
        placeCard(element, poolPoint, opacity * near, lifted);
      }
    });
    for (const [id, state] of poolStates) {
      if (present.has(id)) continue;
      if (state.ship) scene.remove(state.ship);
      poolStates.delete(id);
    }
    list?.setAttribute("data-placed", "");
  }

  /** 1 when you're standing at the eddy pool, 0 by the river, easing between. */
  let atPool = 0;
  function layoutFloats(now: number, dt: number, animate: boolean) {
    const fromPool = Math.hypot(poolCentre.x - walkerAt.x, poolCentre.z - walkerAt.z);
    atPool = 1 - THREE.MathUtils.smoothstep(fromPool, POOL_RADIUS + 3, POOL_RADIUS + 5.5);
    const list = options.floats();
    const items = list ? Array.from(list.children) as HTMLElement[] : [];
    const gen = list?.dataset.gen ?? "";

    // A different stream (another time choice, say) starts afresh in front of you.
    if (gen !== generation) {
      generation = gen;
      streamTime = 0;
      states.clear();
      streamWindow = Math.max(STREAM_MIN_WINDOW, (items.length + 4) * STREAM_SPACING);
    }
    const windowStart = centreArc - streamWindow / 2;
    // At the start, the first piece sits just in front of the viewer.
    const phase = nearArc - windowStart;

    const present = new Set<string>();
    const visible: string[] = [];
    rafts.forEach((raft) => { raft.visible = false; });
    raftSpots.length = 0;

    items.forEach((element, index) => {
      const id = element.dataset.id ?? String(index);
      const seq = Number(element.dataset.seq ?? index);
      const mode = element.dataset.state ?? "";
      present.add(id);

      let state = states.get(id);
      if (!state) {
        state = { bornAt: now, leaveAt: null, heldFor: 0, hold: 0 };
        states.set(id, state);
      }
      if (mode === "leaving") { if (state.leaveAt === null) state.leaveAt = now; }
      else state.leaveAt = null;

      const lifted = mode === "lifted";
      const holding = lifted || element.matches(":hover") || element.contains(document.activeElement);
      state.hold += ((holding ? 1 : 0) - state.hold) * (animate ? 0.08 : 1);
      if (animate) state.heldFor += dt * state.hold;
      const free = 1 - state.hold;

      // Where along the window this piece is now, wrapping round out of sight.
      const along = mod(phase + (streamTime - state.heldFor) * STREAM_SPEED - seq * STREAM_SPACING, streamWindow);
      let arc = windowStart + along;
      let opacity = THREE.MathUtils.smoothstep(Math.min(along, streamWindow - along), 0, 14);
      if (animate) opacity *= Math.min(1, (now - state.bornAt) / 900);
      if (state.leaveAt !== null) {
        // Removed: the current takes it, faster and faster, and it is gone.
        const p = animate ? Math.min(1, (now - state.leaveAt) / GLADE_LEAVE_MS) : 1;
        arc += p * p * 16;
        opacity *= 1 - THREE.MathUtils.smoothstep(p, 0.35, 1);
      }
      const u = THREE.MathUtils.clamp(arc / riverLength, 0.001, 0.999);

      curve.getPointAt(u, worldPoint);
      curve.getTangentAt(u, tangent);
      lateral.set(-tangent.z, 0, tangent.x).normalize();
      const sway = Math.sin((animate ? streamTime * 0.11 : 0) + seq * 1.7) * 1.3 * (animate ? free : 1);
      worldPoint.addScaledVector(lateral, sway);
      worldPoint.y = -0.22 + (animate ? Math.sin(streamTime * 0.9 + seq * 1.3) * 0.07 : 0);

      const raft = raftAt(index);
      raft.visible = opacity > 0.02;
      const pennant = raft.getObjectByName("pennant");
      if (pennant) pennant.rotation.y = Math.sin(time * 2.1 + seq) * 0.5;
      raft.position.copy(worldPoint);
      raft.rotation.set(
        Math.sin(streamTime * 0.8 + seq) * 0.04,
        Math.atan2(tangent.x, tangent.z) + Math.sin(streamTime * 0.1 + seq) * 0.3,
        Math.sin(streamTime * 0.6 + seq * 2) * 0.05,
      );

      // You have to walk over to see what a piece is.
      const reach = Math.hypot(worldPoint.x - walkerAt.x, worldPoint.z - walkerAt.z);
      const raftShown = opacity > 0.02;
      opacity *= 1 - THREE.MathUtils.smoothstep(reach, NEAR_OPEN, NEAR_GONE);
      // At the eddies, only the eddies' pieces show.
      opacity *= 1 - atPool;
      const placed = placeCard(element, worldPoint, opacity, lifted);
      if (raftShown) raftSpots.push({ id, seq, at: worldPoint.clone(), side: lateral.clone(), open: placed.opacity > 0.5 });
      const spot = lastSpots.get(id);
      if (spot) { spot.at.copy(worldPoint); spot.arc = arc; spot.side = sway; }
      else lastSpots.set(id, { at: worldPoint.clone(), arc, side: sway });

      if (placed.onScreen) visible.push(id);

      // A ripple when a piece is first lifted.
      if (lifted && element.dataset.rippled !== "1") {
        element.dataset.rippled = "1";
        ripple(worldPoint, 1.4, now);
      } else if (!lifted && element.dataset.rippled === "1") {
        delete element.dataset.rippled;
      }
    });

    for (const id of states.keys()) if (!present.has(id)) states.delete(id);
    // Keep a gone piece's spot a moment, in case it is on its way to the eddies.
    for (const id of lastSpots.keys()) if (!present.has(id) && !poolStates.has(id)) lastSpots.delete(id);
    list?.setAttribute("data-placed", "");

    const visibleKey = visible.sort().join();
    if (visibleKey !== lastVisible) {
      lastVisible = visibleKey;
      options.onVisible(visible);
    }
  }

  // --- The loop -------------------------------------------------------------------
  let time = 0;
  let last = performance.now();
  let lastStillRender = 0;
  let frameId = 0;

  function frame(now: number) {
    frameId = requestAnimationFrame(frame);
    const animate = options.animate();
    // A steady 60 fps is preferable to racing the display's 120 Hz refresh
    // and dropping frames when the GPU is busy. Keep the walker/river's delta
    // based on elapsed wall time so motion stays the same speed.
    const minFrameMs = 1000 / 60;
    if (now - last < minFrameMs - 0.75) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    measureCardGeometry(now);

    if (animate) {
      time += dt;
      streamTime += dt;
    }

    // Turning: inertia after a drag, or easing toward a turn the buttons asked for.
    if (!drag) {
      if (orbit.target !== null) {
        orbit.yaw += animate ? (orbit.target - orbit.yaw) * 0.07 : orbit.target - orbit.yaw;
        if (Math.abs(orbit.target - orbit.yaw) < 0.001) { orbit.yaw = orbit.target; orbit.target = null; }
        dirty = true;
      } else if (Math.abs(orbit.spin) > 0.0001) {
        orbit.yaw += orbit.spin;
        orbit.spin *= 0.93;
        dirty = true;
      }
    }
    // The walker heads for where you tapped (or where the arrow keys point),
    // wading if the way crosses the river.
    steerByKeys();
    let toTarget = new THREE.Vector2(walkTarget.x - walkerAt.x, walkTarget.z - walkerAt.z);
    if (toTarget.length() <= 0.15 && walkPath.length > 0) {
      walkTarget.copy(walkPath.shift()!);
      toTarget = new THREE.Vector2(walkTarget.x - walkerAt.x, walkTarget.z - walkerAt.z);
    }
    const remaining = toTarget.length();
    if (remaining > 0.15) {
      const step = animate ? Math.min(remaining, WALK_SPEED * dt) : remaining;
      const beforeX = walkerAt.x;
      const beforeZ = walkerAt.z;
      // Pushed out of anything solid, the walker slides round it.
      walkerAt.x += (toTarget.x / remaining) * step;
      walkerAt.z += (toTarget.y / remaining) * step;
      if (!onDeck) stepAround(walkerAt, toTarget.x / remaining, toTarget.y / remaining, step);
      const moved = Math.hypot(walkerAt.x - beforeX, walkerAt.z - beforeZ);
      walker.figure.rotation.y = Math.atan2(toTarget.x, toTarget.y);
      walkerSpeed = animate ? WALK_SPEED : 0;
      // Blocked (the spot is inside something): stop rather than tread on the spot.
      blockedFor = moved < step * 0.2 ? blockedFor + dt : 0;
      if (blockedFor > 0.5 || (!animate && moved < 0.01)) {
        walkTarget.copy(walkerAt);
        walkPath.length = 0;
        blockedFor = 0;
      }
      dirty = true;
    } else {
      walkerSpeed = 0;
    }
    // On to the deck only at an end, where it meets the bank; from the side
    // you stay below and pass under the arch.
    const local = bridgeLocal(walkerAt.x, walkerAt.z);
    const footprint = onBridgeFootprint(local);
    if (onDeck && Math.abs(local.across) > BRIDGE_WIDTH / 2 - 0.25 && Math.abs(local.along) < BRIDGE_SPAN / 2) {
      // On the deck, the rails keep you from stepping off the side.
      const limit = Math.sign(local.across) * (BRIDGE_WIDTH / 2 - 0.25);
      walkerAt.addScaledVector(bridgeAlong, limit - local.across).setY(0);
      local.across = limit;
    }
    if (onDeck && !onBridgeFootprint(local)) onDeck = false;
    else if (!onDeck && footprint && Math.abs(local.along) > BRIDGE_SPAN / 2 - 0.8) onDeck = true;
    const groundY = onDeck ? deckHeight(local.along) : groundHeight(walkerAt.x, walkerAt.z);
    walker.figure.position.set(walkerAt.x, groundY, walkerAt.z);
    walkerShadow.position.set(walkerAt.x, Math.max(groundY, -0.3) + 0.04, walkerAt.z);
    walker.step(dt, walkerSpeed, now);
    if (walkerSpeed > 0 && groundY < -0.35 && now > wadeRippleAt) {
      wadeRippleAt = now + 380;
      ripple(walkerAt.clone().setY(-0.3), 0.5, now);
    }
    // The view follows the walker, gently.
    const follow = animate ? 0.05 : 1;
    focus.x += (walkerAt.x - focus.x) * follow;
    focus.z += (walkerAt.z - focus.z) * follow;
    focus.y += (Math.max(groundY, -0.3) + 0.9 - focus.y) * follow;
    placeCamera();
    sightLine.value.set(walkerAt.x, groundY + 1.5, walkerAt.z);

    layoutFloats(now, dt, animate);
    layoutPool(now, animate);
    lookAround(now);
    if (animate) {
      life.update(now, dt, walkerAt);
      constable.update(now);
      gallery.update(now);
      wanders.update(now, dt, walkerAt);
      if (now > fordRippleAt) {
        fordRippleAt = now + 2600 + Math.random() * 2400;
        const wheel = constable.wheels[Math.floor(Math.random() * constable.wheels.length)];
        ripple(wheel.getWorldPosition(new THREE.Vector3()).setY(-0.3), 0.7, now);
      }
    }

    if (animate) {
      wind.value = time;
      for (let index = 0; index < MOTES; index += 1) {
        const seed = moteSeeds[index];
        motePositions[index * 3] = moteBase[index * 3] + Math.sin(now * 0.00012 + seed) * 1.6;
        motePositions[index * 3 + 1] = moteBase[index * 3 + 1] + Math.sin(now * 0.0002 + seed * 1.3) * 0.7;
        motePositions[index * 3 + 2] = moteBase[index * 3 + 2] + Math.cos(now * 0.0001 + seed) * 1.2;
      }
      moteGeometry.attributes.position.needsUpdate = true;
      barge.position.y = -0.3 + Math.sin(now * 0.0008) * 0.05;
      flag.rotation.y = Math.sin(now * 0.003) * 0.35;
    }

    waterUniforms.uTime.value = time;
    skyMaterial.uniforms.uTime.value = time;
    paintUniforms.uTime.value = time;

    let ripplesActive = false;
    ripples.forEach((entry) => {
      if (!entry.mesh.visible) return;
      const age = (now - entry.start) / 1600;
      if (age < 0) { entry.material.opacity = 0; ripplesActive = true; return; }
      if (age >= 1) { entry.mesh.visible = false; return; }
      ripplesActive = true;
      const s = entry.size * (0.4 + age * 2.6);
      entry.mesh.scale.set(s, 1, s);
      entry.material.opacity = (1 - age) * 0.7;
    });

    // With reduced motion the glade holds still; draw only when something changed.
    if (animate || dirty || ripplesActive || now - lastStillRender > 500) {
      renderer.setRenderTarget(paintTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(paintScene, paintCamera);
      dirty = false;
      lastStillRender = now;
    }
  }
  life.settle(walkerAt);
  frameId = requestAnimationFrame(frame);

  return {
    walkToNext() {
      // Each press goes on to the next piece afloat, in the order they came
      // down the river, and round to the first again after the last.
      if (raftSpots.length === 0) return null;
      const spots = [...raftSpots].sort((a, b) => a.seq - b.seq);
      const last = walkedTo;
      const next = (last && spots.find((spot) => spot.seq > last.seq && spot.id !== last.id))
        ?? spots.find((spot) => spot.id !== last?.id)
        ?? spots[0];
      walkedTo = { id: next.id, seq: next.seq };
      const side = Math.sign((walkerAt.x - next.at.x) * next.side.x + (walkerAt.z - next.at.z) * next.side.z) || 1;
      walkTo(next.at.x + next.side.x * side * (RIVER_HALF_WIDTH + 2.2), next.at.z + next.side.z * side * (RIVER_HALF_WIDTH + 2.2));
      dirty = true;
      return next.id;
    },
    turn(radians: number) {
      orbit.spin = 0;
      orbit.target = (orbit.target ?? orbit.yaw) + radians;
      dirty = true;
    },
    face() {
      orbit.spin = 0;
      orbit.target = Math.round(orbit.yaw / (Math.PI * 2)) * Math.PI * 2;
      orbit.pitch = ORBIT_PITCH;
      orbit.radius = ORBIT_RADIUS;
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      disposables.forEach((thing) => thing.dispose());
      [trunks, crowns, treeShadows, tufts, rocks].forEach((mesh) => mesh.dispose());
      riverside.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
