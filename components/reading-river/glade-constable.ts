import * as THREE from "three";
import type { Obstacle } from "./glade-life";
import { paintLook, smoothBlob } from "./glade-paint";

/**
 * After Constable's The Hay Wain: an empty wain standing in the ford with its
 * horses, the water round their legs, and a low cottage on the far bank with
 * a thread of smoke from its chimney.
 */
type ConstableWorld = {
  scene: THREE.Scene;
  keep: <T extends { dispose: () => void }>(thing: T) => T;
  groundHeight: (x: number, z: number) => number;
  /** Where the wain stands in the river, and which way is across. */
  ford: THREE.Vector3;
  across: THREE.Vector3;
  /** Where the cottage stands on the bank. */
  cottage: THREE.Vector3;
  wind: { value: number };
};

const WOOD = "#7b3e24";
const WOOD_DARK = "#4a2f1c";
const BAY = "#6a4329";
const GREY = "#cfc5b0";
const WALL = "#e0cfa8";
const ROOF = "#8a4a2c";
const BRICK = "#7a3a26";

export function addConstable(world: ConstableWorld) {
  const { scene, keep, groundHeight, ford, across, cottage, wind } = world;
  const material = (color: string, dapple = 0.25) => {
    const made = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }));
    paintLook(made, { wind, dapple, dappleScale: 1.4 });
    return made;
  };
  const wood = material(WOOD);
  const woodDark = material(WOOD_DARK, 0.15);
  const box = (w: number, h: number, d: number) => keep(new THREE.BoxGeometry(w, h, d));

  // --- The wain --------------------------------------------------------------------
  const wain = new THREE.Group();
  const bed = new THREE.Mesh(box(3.4, 0.28, 1.6), wood);
  bed.position.y = 1.15;
  const sideA = new THREE.Mesh(box(3.6, 0.42, 0.08), wood);
  sideA.position.set(0, 1.45, 0.8);
  sideA.rotation.x = -0.25;
  const sideB = sideA.clone();
  sideB.position.z = -0.8;
  sideB.rotation.x = 0.25;
  const tail = new THREE.Mesh(box(0.08, 0.5, 1.7), wood);
  tail.position.set(-1.75, 1.45, 0);
  wain.add(bed, sideA, sideB, tail);
  // Big spoked wheels behind, smaller in front.
  const wheels: THREE.Group[] = [];
  const spoke = box(0.05, 1, 0.05);
  for (const [x, radius] of [[-0.95, 0.78], [1.05, 0.58]] as const) {
    for (const side of [1, -1]) {
      const wheel = new THREE.Group();
      const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(radius, 0.07, 5, 18)), woodDark);
      wheel.add(rim);
      for (let index = 0; index < 8; index += 1) {
        const bar = new THREE.Mesh(spoke, woodDark);
        bar.scale.y = radius * 2;
        bar.rotation.z = (index / 8) * Math.PI;
        wheel.add(bar);
      }
      const hub = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8)), woodDark);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);
      wheel.position.set(x, radius, side * 0.92);
      wain.add(wheel);
      wheels.push(wheel);
    }
  }
  const shafts = new THREE.Mesh(box(2.6, 0.08, 0.08), woodDark);
  shafts.position.set(2.9, 1.0, 0.35);
  const shaftsB = shafts.clone();
  shaftsB.position.z = -0.35;
  wain.add(shafts, shaftsB);

  // --- Horses: a bay in the shafts and a grey in front ----------------------------------
  const horseBody = keep(smoothBlob(2, 1));
  const legGeometry = keep(new THREE.CylinderGeometry(0.07, 0.06, 1.05, 5));
  legGeometry.translate(0, -0.52, 0);
  const heads: THREE.Group[] = [];
  const tails: THREE.Mesh[] = [];
  function horse(color: string, x: number) {
    const coat = material(color, 0.2);
    const mane = material(WOOD_DARK, 0.1);
    const figure = new THREE.Group();
    const body = new THREE.Mesh(horseBody, coat);
    body.scale.set(0.9, 0.42, 0.36);
    body.position.y = 1.45;
    figure.add(body);
    for (const [lx, lz] of [[0.6, 0.18], [0.6, -0.18], [-0.6, 0.18], [-0.6, -0.18]]) {
      const leg = new THREE.Mesh(legGeometry, coat);
      leg.position.set(lx, 1.2, lz);
      figure.add(leg);
    }
    const head = new THREE.Group();
    const neck = new THREE.Mesh(box(0.7, 0.3, 0.24), coat);
    neck.position.set(0.3, 0.2, 0);
    neck.rotation.z = 0.8;
    const skull = new THREE.Mesh(box(0.55, 0.22, 0.2), coat);
    skull.position.set(0.68, 0.38, 0);
    skull.rotation.z = -0.5;
    const crest = new THREE.Mesh(box(0.6, 0.08, 0.1), mane);
    crest.position.set(0.22, 0.36, 0);
    crest.rotation.z = 0.8;
    head.add(neck, skull, crest);
    head.position.set(0.78, 1.55, 0);
    figure.add(head);
    heads.push(head);
    const tailMesh = new THREE.Mesh(box(0.08, 0.7, 0.08), mane);
    tailMesh.geometry = keep(tailMesh.geometry.clone().translate(0, -0.35, 0));
    tailMesh.position.set(-0.88, 1.6, 0);
    tailMesh.rotation.z = -0.25;
    figure.add(tailMesh);
    tails.push(tailMesh);
    figure.position.x = x;
    return figure;
  }
  wain.add(horse(BAY, 3.6), horse(GREY, 5.7));

  // Stand it in the ford, half across the river, wheels in the water.
  const heading = Math.atan2(-across.z, across.x);
  wain.position.set(ford.x, Math.min(groundHeight(ford.x, ford.z), -0.25) - 0.45, ford.z);
  wain.rotation.y = heading + 0.35;
  scene.add(wain);

  // --- The cottage on the far bank -----------------------------------------------------
  const house = new THREE.Group();
  const walls = new THREE.Mesh(box(5, 2.6, 3.4), material(WALL, 0.35));
  walls.position.y = 1.3;
  const roofGeometry = keep(new THREE.ConeGeometry(1, 1, 4, 1));
  roofGeometry.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeometry, material(ROOF, 0.3));
  roof.scale.set(4.2, 2.3, 2.9);
  roof.position.y = 2.6 + 1.15;
  const lean = new THREE.Mesh(box(2.4, 1.8, 2.6), material(WALL, 0.35));
  lean.position.set(-3.5, 0.9, 0.2);
  const leanRoof = new THREE.Mesh(box(2.7, 0.14, 3), material(ROOF, 0.3));
  leanRoof.position.set(-3.5, 1.95, 0.2);
  leanRoof.rotation.z = 0.28;
  const chimney = new THREE.Mesh(box(0.55, 1.8, 0.55), material(BRICK, 0.2));
  chimney.position.set(1.4, 4.1, 0.4);
  const windowMaterial = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color("#3b3326") }));
  const pane = keep(new THREE.PlaneGeometry(0.6, 0.55));
  for (const [x, y] of [[-1.3, 1.7], [1.2, 1.7], [-1.3, 0.75], [1.2, 0.75]]) {
    const glass = new THREE.Mesh(pane, windowMaterial);
    glass.position.set(x, y, 1.71);
    house.add(glass);
  }
  const door = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.7, 1.3)), windowMaterial);
  door.position.set(0, 0.65, 1.71);
  house.add(walls, roof, lean, leanRoof, chimney, door);
  house.position.set(cottage.x, groundHeight(cottage.x, cottage.z) - 0.1, cottage.z);
  // Face the river.
  house.rotation.y = Math.atan2(across.x, across.z) + Math.PI;
  scene.add(house);

  // A thread of smoke from the chimney.
  const smokeMaterial = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#e9e2d2"), transparent: true, depthWrite: false }));
  const puffGeometry = keep(smoothBlob(1, 0.5));
  const puffs = Array.from({ length: 7 }, (_, index) => {
    const puff = new THREE.Mesh(puffGeometry, smokeMaterial.clone());
    keep(puff.material as THREE.Material);
    puff.userData.phase = index / 7;
    scene.add(puff);
    return puff;
  });
  const chimneyTop = new THREE.Vector3(1.4, 5.1, 0.4);
  house.updateMatrixWorld();
  chimneyTop.applyMatrix4(house.matrixWorld);

  const toWorld = (local: THREE.Vector3) => local.applyMatrix4(wain.matrixWorld);
  wain.updateMatrixWorld();
  const obstacles: Obstacle[] = [
    ...[-1, 0.8, 3.6, 5.7].map((x) => { const at = toWorld(new THREE.Vector3(x, 0, 0)); return { x: at.x, z: at.z, r: x > 3 ? 0.75 : 1.25 }; }),
    ...[-3.5, -1.2, 1.2].map((x) => {
      const at = new THREE.Vector3(x, 0, 0).applyMatrix4(house.matrixWorld);
      return { x: at.x, z: at.z, r: 2.2 };
    }),
  ];

  function update(now: number) {
    const t = now / 1000;
    heads.forEach((head, index) => {
      head.rotation.z = Math.sin(t * 0.5 + index * 2) * 0.08 - (Math.sin(t * 0.13 + index) > 0.7 ? 0.35 : 0);
    });
    tails.forEach((tailMesh, index) => {
      tailMesh.rotation.x = Math.sin(t * 1.6 + index * 3) * 0.25;
    });
    puffs.forEach((puff) => {
      const age = (t * 0.06 + puff.userData.phase) % 1;
      puff.position.set(chimneyTop.x + age * 3.2 + Math.sin(age * 6 + puff.userData.phase * 9) * 0.3, chimneyTop.y + age * 6, chimneyTop.z + age * 1.2);
      puff.scale.setScalar(0.4 + age * 2.2);
      (puff.material as THREE.MeshBasicMaterial).opacity = Math.sin(age * Math.PI) * 0.45;
    });
  }
  update(0);

  return { obstacles, update, wainAt: wain.position.clone(), wheels };
}
