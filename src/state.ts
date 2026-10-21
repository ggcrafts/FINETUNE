import { clamp } from "./utils/clamp";
import { getViewport, prefersReducedMotion } from "./utils/device";

/**
 * Centralised DOM/WebGL state (spec §67).
 * One RAF orchestration path writes it; components subscribe to read it.
 * WebGL (Phase 02) reads the same object instead of attaching its own
 * scroll/pointer listeners.
 */
export type Quality = "low" | "medium" | "high" | "ultra";

export interface FineTuneState {
  /** normalised -1…1 (viewport centre origin, +y up) */
  pointer: { x: number; y: number };
  /** raw client coordinates in CSS px */
  pointerClient: { x: number; y: number };
  /** true while a fine pointer (mouse/pen) is over the page */
  pointerActive: boolean;
  /** seconds since boot — shared clock for ambient motion */
  time: number;
  scroll: number;
  heroProgress: number;
  /** 0…1 how much the next panel has covered the hero (stack transition) */
  heroCover: number;
  activeSection: string;
  viewport: { width: number; height: number; dpr: number };
  quality: Quality;
  reducedMotion: boolean;
  /** true while the "Let's talk" black hole plays: heavy effects stand still */
  hold: boolean;
}

export const state: FineTuneState = {
  pointer: { x: 0, y: 0 },
  pointerClient: { x: -9999, y: -9999 },
  pointerActive: false,
  time: 0,
  scroll: 0,
  heroProgress: 0,
  heroCover: 0,
  activeSection: "hero",
  viewport: getViewport(),
  quality: "high",
  reducedMotion: prefersReducedMotion(),
  hold: false,
};

/** Pause / resume every heavy effect (WebGL hero, light trails, line waves, reel, CSS loops). */
export function setHold(on: boolean): void {
  state.hold = on;
  document.documentElement.classList.toggle("is-hold", on);
  window.dispatchEvent(new CustomEvent("ft:hold", { detail: on }));
}

type Listener = (s: FineTuneState) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/**
 * Global tempo for continuous (ambient) motion. 0.5 = everything 50% slower
 * than the first pass, as requested in review. Interaction responses (hover,
 * scroll) are not scaled.
 */
export const TEMPO = 0.5;

/** Per-frame listeners run every frame (ambient motion); `subscribe` runs on change. */
type FrameListener = (s: FineTuneState, dt: number) => void;
const frameListeners = new Set<FrameListener>();

export function onFrame(fn: FrameListener): () => void {
  frameListeners.add(fn);
  return () => frameListeners.delete(fn);
}

let rafId = 0;
let dirty = true;
let lastNow = 0;

function tick(now: number): void {
  rafId = requestAnimationFrame(tick);
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  state.time += dt * TEMPO;
  if (dirty) {
    dirty = false;
    for (const fn of listeners) fn(state);
  }
  for (const fn of frameListeners) fn(state, dt);
}

/** Start the single orchestration loop + input listeners. */
export function startState(): void {
  const hero = document.querySelector<HTMLElement>("[data-section='hero']");

  const onScroll = (): void => {
    state.scroll = window.scrollY;
    if (hero) {
      const h = hero.offsetHeight || 1;
      state.heroProgress = clamp(window.scrollY / h, 0, 1);
    }
    dirty = true;
  };

  const onPointer = (event: PointerEvent): void => {
    // normalised -1 … 1, origin at viewport centre
    state.pointer.x = (event.clientX / state.viewport.width) * 2 - 1;
    state.pointer.y = -((event.clientY / state.viewport.height) * 2 - 1);
    state.pointerClient.x = event.clientX;
    state.pointerClient.y = event.clientY;
    state.pointerActive = event.pointerType !== "touch";
    dirty = true;
  };

  const onLeave = (): void => {
    state.pointerActive = false;
    dirty = true;
  };

  const onResize = (): void => {
    state.viewport = getViewport();
    onScroll();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave, { passive: true });
  window.addEventListener("blur", onLeave);
  window.addEventListener("resize", onResize, { passive: true });
  window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .addEventListener("change", (mq) => {
      state.reducedMotion = mq.matches;
      dirty = true;
    });

  onScroll();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

export function markDirty(): void {
  dirty = true;
}
