/**
 * Shared painting helpers for the glade: noise, the painted-material look
 * (dappled brushwork, wind sway, cloud shadows) and smooth lumpy shapes.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Small deterministic random so the glade looks the same on every visit.
export function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise2(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}


/** A sphere with shared vertices, so it can be lumped by noise and still shade smoothly. */
export function smoothBlob(detail: number, radius = 1) {
  const raw = new THREE.IcosahedronGeometry(radius, detail);
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const blob = mergeVertices(raw);
  raw.dispose();
  blob.computeVertexNormals();
  return blob;
}

export const GLSL_NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

export type PaintOptions = {
  wind?: { value: number };
  gust?: { value: number };
  strength?: number;
  dapple?: number;
  dappleScale?: number;
  /** Dissolve this material within this many units of the camera, so it never blocks the view. */
  nearFade?: number;
  /** Also dissolve it along the line from the camera to this point (the walker). */
  sightTo?: { value: THREE.Vector3 };
};

/**
 * Gives a material the painted look: dappled light and dark that the paint
 * pass turns into daubs, and (for trees and grass) a sway in the wind.
 */
export function paintLook(material: THREE.Material, { wind, gust, strength = 0, dapple = 0, dappleScale = 1, nearFade = 0, sightTo }: PaintOptions) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSightTo = sightTo ?? { value: new THREE.Vector3() };
    shader.uniforms.uWind = wind ?? { value: 0 };
    shader.uniforms.uGust = gust ?? { value: 0 };
    shader.vertexShader = `uniform float uWind;\nuniform float uGust;\nvarying vec3 vPaintPos;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 rootAt = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 rootAt = vec3(0.0);
      #endif
      float lift = max(position.y, 0.0);
      float gust = (0.6 + 0.4 * sin(uWind * 0.23 + rootAt.x * 0.02)) * (1.0 + uGust);
      transformed.x += sin(uWind * 0.9 + rootAt.x * 0.15 + rootAt.z * 0.1) * ${strength.toFixed(3)} * lift * gust;
      transformed.z += cos(uWind * 0.7 + rootAt.z * 0.13) * ${(strength * 0.6).toFixed(3)} * lift * gust;
      #ifdef USE_INSTANCING
        vPaintPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vPaintPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`,
    );
    shader.fragmentShader = `uniform float uWind;\nuniform vec3 uSightTo;\nvarying vec3 vPaintPos;\n${GLSL_NOISE}\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec3 pp = vPaintPos * ${dappleScale.toFixed(3)};
      float dab = fbm(pp.xz * 1.1 + vec2(pp.y * 1.7, -pp.y));
      ${nearFade > 0 ? `
      // Close to the camera, thin out with a dither so you can see past.
      float toCamera = distance(vPaintPos, cameraPosition);
      float keep = smoothstep(${(nearFade * 0.45).toFixed(1)}, ${nearFade.toFixed(1)}, toCamera);
      ${sightTo ? `
      // Anything standing between the camera and the walker steps aside too.
      vec3 sight = uSightTo - cameraPosition;
      float along = clamp(dot(vPaintPos - cameraPosition, sight) / dot(sight, sight), 0.0, 1.0);
      float offLine = distance(vPaintPos, cameraPosition + sight * along);
      keep = min(keep, mix(1.0, smoothstep(2.0, 4.5, offLine), step(0.04, along) * (1.0 - step(0.94, along))));` : ""}
      if (hash(floor(gl_FragCoord.xy / 2.0)) > keep) discard;` : ""}
      diffuseColor.rgb *= 1.0 + (dab - 0.5) * ${(dapple * 2).toFixed(3)};
      // Cloud shadows passing slowly over the glade.
      float cloudShade = smoothstep(0.55, 0.72, fbm(vPaintPos.xz * 0.012 + vec2(uWind * 0.012, uWind * 0.004)));
      diffuseColor.rgb *= 1.0 - cloudShade * 0.2;`,
    );
  };
}

