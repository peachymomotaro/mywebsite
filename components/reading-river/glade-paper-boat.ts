import * as THREE from "three";

/** A folded sheet with pointed ends, an open hull, and the raised centre fold. */
export function createPaperBoatGeometry() {
  type Point = [number, number, number];
  const bow: Point = [0, 0.7, 2.45];
  const stern: Point = [0, 0.7, -2.45];
  const left: Point = [-1.2, 0.65, 0];
  const right: Point = [1.2, 0.65, 0];
  const keelBow: Point = [0, -0.05, 1.35];
  const keelStern: Point = [0, -0.05, -1.35];
  const inside: Point = [0, 0.2, 0];
  const positions: number[] = [];
  const colors: number[] = [];
  const tint = new THREE.Color();
  const face = (a: Point, b: Point, c: Point, color: string) => {
    positions.push(...a, ...b, ...c);
    tint.set(color);
    for (let i = 0; i < 3; i += 1) colors.push(tint.r, tint.g, tint.b);
  };

  face(bow, left, keelBow, "#f4e6c8");
  face(left, keelStern, keelBow, "#ead7b3");
  face(left, stern, keelStern, "#f8ecd2");
  face(right, bow, keelBow, "#fff5df");
  face(keelStern, right, keelBow, "#f7e8c9");
  face(stern, right, keelStern, "#f4e4c0");
  face(bow, inside, left, "#d9c6a0");
  face(left, inside, stern, "#e3d0aa");
  face(right, inside, bow, "#f1dfbb");
  face(stern, inside, right, "#dfcba5");
  // The two sides of the central fold meet along a crisp paper ridge.
  const peak: Point = [0, 1.9, 0];
  const foldBow: Point = [0, 0.25, 1.6];
  const foldStern: Point = [0, 0.25, -1.6];
  face(foldBow, peak, [-0.17, 0.25, 0], "#fff8e7");
  face(peak, foldStern, [-0.17, 0.25, 0], "#f6e7c8");
  face(peak, foldBow, [0.17, 0.25, 0], "#f8edda");
  face(foldStern, peak, [0.17, 0.25, 0], "#e6d4b0");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
