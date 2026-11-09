import type { ForestArticle } from "@/lib/reading-river/forest";
import * as THREE from "three";
import { seeded } from "./glade-paint";

export const TREE_SPACING = 16;
export type ForestTree = { x: number; z: number; s: number; article: ForestArticle };

/** A little extra room on leaving stops the memory flickering at its boundary. */
export function nearbyArticleTree(trees: ForestTree[], walker: { x: number; z: number }, currentId: string | null) {
  const distance = (tree: ForestTree) => Math.hypot(tree.x - walker.x, tree.z - walker.z);
  const current = trees.find((tree) => tree.article.id === currentId);
  if (current && distance(current) <= 9) return current;
  let nearest: ForestTree | null = null;
  let reach = 7;
  for (const tree of trees) {
    const gap = distance(tree);
    if (gap <= reach) { nearest = tree; reach = gap; }
  }
  return nearest;
}
type ForestEnvironment = {
  centre: { x: number; z: number };
  existing: { x: number; z: number }[];
  canPlant: (x: number, z: number) => boolean;
};

function articleSeed(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2147483646 + 1;
}

/** Best of several scattered spots; expand the meadow rather than reduce spacing. */
export function plantArticleTrees(articles: ForestArticle[], environment: ForestEnvironment): ForestTree[] {
  const cells = new Map<string, { x: number; z: number }[]>();
  const cellKey = (x: number, z: number) => `${x},${z}`;
  function occupy(point: { x: number; z: number }) {
    const key = cellKey(Math.floor(point.x / TREE_SPACING), Math.floor(point.z / TREE_SPACING));
    const cell = cells.get(key) ?? [];
    cell.push(point);
    cells.set(key, cell);
  }
  environment.existing.forEach(occupy);
  const planted: ForestTree[] = [];
  const seen = new Set<string>();
  let radius = 48;
  for (const article of [...articles].sort((a, b) => a.readAt.localeCompare(b.readAt) || a.id.localeCompare(b.id))) {
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    const random = seeded(articleSeed(article.id));
    let best: { x: number; z: number } | undefined;
    while (!best) {
      let bestGap = TREE_SPACING;
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * radius;
        const x = environment.centre.x + Math.cos(angle) * distance;
        const z = environment.centre.z + Math.sin(angle) * distance;
        if (!environment.canPlant(x, z)) continue;
        let gap = TREE_SPACING * 3;
        const cx = Math.floor(x / TREE_SPACING), cz = Math.floor(z / TREE_SPACING);
        for (let dx = -3; dx <= 3; dx += 1) {
          for (let dz = -3; dz <= 3; dz += 1) {
            for (const other of cells.get(cellKey(cx + dx, cz + dz)) ?? []) {
              gap = Math.min(gap, Math.hypot(x - other.x, z - other.z));
            }
          }
        }
        if (gap >= bestGap) { bestGap = gap; best = { x, z }; }
      }
      if (!best) radius *= 1.18;
    }
    const tree = { ...best, s: 1.25 + random() * 0.55, article };
    planted.push(tree);
    occupy(tree);
  }
  return planted;
}

type Tree = { x: number; z: number; s: number };
type TreeAssets = {
  trunkGeometry: THREE.BufferGeometry;
  crownGeometry: THREE.BufferGeometry;
  shadowGeometry: THREE.BufferGeometry;
  trunkMaterial: THREE.Material;
  crownMaterial: THREE.Material;
  shadowMaterial: THREE.Material;
  groundHeight: (x: number, z: number) => number;
  colors: string[];
};

/** Shared instanced geometry keeps even a long reading history to three draw calls. */
export function createTreeGrove(trees: Tree[], assets: TreeAssets) {
  const trunks = new THREE.InstancedMesh(assets.trunkGeometry, assets.trunkMaterial, trees.length);
  const crowns = new THREE.InstancedMesh(assets.crownGeometry, assets.crownMaterial, trees.length * 4);
  const shadows = new THREE.InstancedMesh(assets.shadowGeometry, assets.shadowMaterial, trees.length);
  trunks.userData.treeStride = 1;
  crowns.userData.treeStride = 4;
  const group = new THREE.Group();
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const place = new THREE.Vector3(), scale = new THREE.Vector3(), tint = new THREE.Color();
  trees.forEach((tree, index) => {
    const random = seeded(articleSeed(`${tree.x}:${tree.z}`));
    const y = assets.groundHeight(tree.x, tree.z);
    place.set(tree.x, y - 0.1, tree.z);
    scale.setScalar(tree.s);
    trunks.setMatrixAt(index, matrix.compose(place, quaternion.identity(), scale));
    place.set(tree.x + 1.2 * tree.s, y + 0.05, tree.z + 0.6 * tree.s);
    scale.set(tree.s * 5.5, 1, tree.s * 4.2);
    shadows.setMatrixAt(index, matrix.compose(place, quaternion, scale));
    const base = assets.colors[Math.floor(random() * assets.colors.length)];
    for (let k = 0; k < 4; k += 1) {
      const angle = random() * Math.PI * 2;
      const spread = k === 0 ? 0 : 0.75 + random() * 0.35;
      place.set(tree.x + Math.cos(angle) * spread * tree.s,
        y + tree.s * (3 + (k === 0 ? 0.4 : random() * 1.1)), tree.z + Math.sin(angle) * spread * tree.s);
      const s = tree.s * (k === 0 ? 1.15 : 0.7 + random() * 0.25);
      scale.set(s * 0.72, s * (0.95 + random() * 0.25), s * 0.72);
      quaternion.setFromEuler(new THREE.Euler(random(), random() * 6, random()));
      crowns.setMatrixAt(index * 4 + k, matrix.compose(place, quaternion, scale));
      crowns.setColorAt(index * 4 + k, tint.set(base).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.4) * 0.12));
    }
  });
  group.add(shadows, trunks, crowns);
  return {
    group,
    dispose() { group.removeFromParent(); [trunks, crowns, shadows].forEach((mesh) => mesh.dispose()); },
  };
}

/** Gold leaves and a little written page distinguish reading trees from the scenery. */
export function createArticleTreeGrove(trees: ForestTree[], assets: TreeAssets) {
  const grove = createTreeGrove(trees, { ...assets, colors: ["#d8b657", "#cda044", "#e2bd63", "#c5913e"] });
  const pageGeometry = new THREE.BoxGeometry(0.7, 0.9, 0.08);
  const inkGeometry = new THREE.BoxGeometry(0.44, 0.04, 0.1);
  const pageMaterial = new THREE.MeshLambertMaterial({ color: "#f4e8c9" });
  const inkMaterial = new THREE.MeshLambertMaterial({ color: "#68422e" });
  const pages = new THREE.InstancedMesh(pageGeometry, pageMaterial, trees.length);
  const lines = new THREE.InstancedMesh(inkGeometry, inkMaterial, trees.length * 3);
  pages.userData.treeStride = 1;
  lines.userData.treeStride = 3;
  const matrix = new THREE.Matrix4();
  trees.forEach((tree, index) => {
    const y = assets.groundHeight(tree.x, tree.z) + tree.s * 2;
    matrix.makeTranslation(tree.x, y, tree.z + tree.s * 0.2 + 0.08);
    pages.setMatrixAt(index, matrix);
    for (let line = 0; line < 3; line += 1) {
      matrix.makeTranslation(tree.x, y + 0.18 - line * 0.16, tree.z + tree.s * 0.2 + 0.11);
      lines.setMatrixAt(index * 3 + line, matrix);
    }
  });
  grove.group.add(pages, lines);
  return {
    group: grove.group,
    dispose() {
      grove.dispose();
      [pages, lines, pageGeometry, inkGeometry, pageMaterial, inkMaterial].forEach((part) => part.dispose());
    },
  };
}
