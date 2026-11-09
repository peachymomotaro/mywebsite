"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { GladeSurroundings } from "./glade-sound";
import type { GladeControls } from "./glade-engine";
import type { ForestArticle } from "@/lib/reading-river/forest";

type GladeSceneProps = {
  animate: boolean;
  forest: ForestArticle[];
  /** The list of pieces afloat; the scene moves its items onto their rafts. */
  floatsRef: RefObject<HTMLElement | null>;
  /** The pieces in the eddies, which turn slowly round the pool. */
  poolRef: RefObject<HTMLElement | null>;
  treeMemoryRef: RefObject<HTMLElement | null>;
  /** Called with false when WebGL isn't available, so the page can lay pieces out itself. */
  onReady: (ready: boolean) => void;
  /** Called with the pieces you can see whenever that changes. */
  onVisible: (ids: string[]) => void;
  onArticleTree: (article: ForestArticle | null) => void;
  /** How near you are to the water and the rain, for the sound. */
  onSurroundings?: (surroundings: GladeSurroundings) => void;
  /** Filled in once the scene is up, so buttons can turn the view. */
  controlsRef: MutableRefObject<Omit<GladeControls, "dispose"> | null>;
};

function canUseWebGL() {
  if (typeof window === "undefined" || typeof window.WebGLRenderingContext === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

/** The 3D glade. three.js loads only in the browser, after the page is up. */
export function GladeScene({ animate, forest, floatsRef, poolRef, treeMemoryRef, onReady, onVisible, onSurroundings, onArticleTree, controlsRef }: GladeSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const animateRef = useRef(animate);
  const readyRef = useRef(onReady);
  const visibleRef = useRef(onVisible);
  const surroundingsRef = useRef(onSurroundings);
  const articleTreeRef = useRef(onArticleTree);
  articleTreeRef.current = onArticleTree;
  const forestRef = useRef(forest);
  forestRef.current = forest;
  surroundingsRef.current = onSurroundings;
  animateRef.current = animate;
  readyRef.current = onReady;
  visibleRef.current = onVisible;

  useEffect(() => { controlsRef.current?.setForest(forest); }, [forest, controlsRef]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !canUseWebGL()) {
      readyRef.current(false);
      return;
    }
    let cancelled = false;
    let dispose = () => {};
    import("./glade-engine")
      .then(({ createGlade }) => {
        if (cancelled) return;
        const glade = createGlade(host, {
          floats: () => floatsRef.current,
          pool: () => poolRef.current,
          treeMemory: () => treeMemoryRef.current,
          animate: () => animateRef.current,
          onVisible: (ids) => visibleRef.current(ids),
          onArticleTree: (article) => articleTreeRef.current(article),
          onSurroundings: (surroundings) => surroundingsRef.current?.(surroundings),
        });
        dispose = glade.dispose;
        controlsRef.current = glade;
        glade.setForest(forestRef.current);
        readyRef.current(true);
      })
      .catch((error: unknown) => {
        console.warn("The glade couldn't start, so the river is shown flat.", error);
        if (!cancelled) readyRef.current(false);
      });
    return () => {
      cancelled = true;
      controlsRef.current = null;
      dispose();
    };
  }, [floatsRef, poolRef, treeMemoryRef, controlsRef]);

  return <div ref={hostRef} className="glade-canvas" aria-hidden="true" />;
}
