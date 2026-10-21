import type { Quality } from "../state";

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export function getViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 1.75), // spec §14: never default to DPR 2–3
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * First-pass adaptive quality estimate (spec §38). Phase 02 refines this
 * with a short FPS probe after the scene starts.
 */
export function estimateQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const width = window.screen.width;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  if (coarse && (memory <= 4 || cores <= 4)) return "low";
  if (coarse || width < 900) return "medium";
  if (cores >= 12 && memory >= 8 && width >= 1920) return "ultra";
  return "high";
}
