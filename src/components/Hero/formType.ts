import { onFrame, state } from "../../state";

/**
 * "form" — a word that keeps calibrating itself between four type states:
 *
 *   1  Thin               wght 100 · wdth 100
 *   2  Ultra Bold Stroke  wght 1000 · wdth 112 · outline only
 *   3  Regular Wide       wght 400 · wdth 151
 *   4  Black Narrow       wght 860 · wdth 45 (open counters, legible)
 *
 * Each change travels through the letters as a wave and oscillates (a damped
 * wobble of weight and width) before it settles; on arrival a short glitch
 * "approves" the state (the readout flashes "Approved" with sparks), it holds,
 * then calibrates towards the next one.
 *
 * Uses Roboto Flex (self-hosted by scripts/sync-fonts.mjs) for real weight and
 * width axes. Without it, Space Grotesk emulates the states (weight 300–700,
 * width by horizontal scale).
 *
 * `refreshFormWord()` re-reads the letters (used when the language changes).
 */

export type FormStatus = "calibrating" | "approved" | "resetting";

export interface FormSnapshot {
  seed: number;      // state index 0…3
  iteration: number;
  status: FormStatus;
  weight: number;    // average current weight
  outline: number;   // average width, normalised 0…1 (25 → 151)
  progress: number;  // transition progress 0…1
  stateLabel: string;
  stateCount: number;
}

interface TypeState {
  label: string;
  w: number;
  wd: number;
  fill: number;
  sw: number; // stroke, em
}

export const FORM_STATES: TypeState[] = [
  { label: "Thin", w: 100, wd: 100, fill: 1, sw: 0 },
  { label: "Ultra Bold Stroke", w: 1000, wd: 112, fill: 0, sw: 0.018 },
  { label: "Regular Wide", w: 400, wd: 151, fill: 1, sw: 0 },
  { label: "Black Narrow", w: 860, wd: 45, fill: 1, sw: 0 },
];

const STAGGER = 0.09;  // s between letters
const MORPH = 1.15;    // s per letter, incl. the oscillation
const GLITCH = 0.26;   // s
const HOLD = 1.5;      // s
const WOBBLE_W = 170;  // weight amplitude of the oscillation
const WOBBLE_WD = 18;  // width amplitude

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let letters: HTMLElement[] = [];
let word: HTMLElement | null = null;
let flex = false;

export function refreshFormWord(): void {
  word = document.querySelector<HTMLElement>("[data-form-word]");
  letters = word ? Array.from(word.querySelectorAll<HTMLElement>("[data-l]")) : [];
  word?.classList.toggle("has-flex", flex);
}

/** Resolve the variable font; the fallback stays until it is ready. Retries a
 *  few times, since the @font-face rule may arrive after this runs. */
function detectFlex(tries = 4): void {
  if (!("fonts" in document) || tries <= 0) return;
  document.fonts
    .load('400 1em "FT Form"')
    .then((faces) => {
      flex = faces.length > 0;
      word?.classList.toggle("has-flex", flex);
      if (!flex) window.setTimeout(() => detectFlex(tries - 1), 700);
    })
    .catch(() => undefined);
}

export function initFormType(listener?: (s: FormSnapshot) => void): void {
  refreshFormWord();
  if (!word || letters.length === 0) return;
  detectFlex();

  const snapshot: FormSnapshot = {
    seed: 0, iteration: 1, status: "calibrating", weight: 400, outline: 0.6, progress: 0,
    stateLabel: FORM_STATES[0].label, stateCount: FORM_STATES.length,
  };

  const set = (el: HTMLElement, w: number, wd: number, fill: number, sw: number, tx = 0, sk = 0, clip = ""): void => {
    let weight = w;
    let sx = 1;
    let mx = 0;
    if (!flex) {
      // emulate on Space Grotesk: weight 300–700, width by scale
      weight = 300 + (clamp01((w - 100) / 900)) * 400;
      sx = 0.55 + clamp01((wd - 25) / 126) * 0.75;
      mx = (sx - 1) * 0.2;
    }
    el.style.setProperty("--w", weight.toFixed(1));
    el.style.setProperty("--wd", wd.toFixed(1));
    // XTRA (counter width) follows width, so narrow really condenses and wide opens up
    const xt = wd <= 100 ? 410 + ((wd - 25) / 75) * 58 : 468 + ((wd - 100) / 51) * 135;
    el.style.setProperty("--xt", xt.toFixed(0));
    el.style.setProperty("--sx", sx.toFixed(3));
    el.style.setProperty("--mx", `${mx.toFixed(3)}em`);
    el.style.setProperty("--fill", fill.toFixed(2));
    el.style.setProperty("--sw", `${sw.toFixed(4)}em`);
    el.style.setProperty("--tx", `${tx.toFixed(3)}em`);
    el.style.setProperty("--sk", `${sk.toFixed(2)}deg`);
    el.style.clipPath = clip;
  };

  if (state.reducedMotion) {
    const s = FORM_STATES[2];
    letters.forEach((el) => set(el, s.w, s.wd, s.fill, s.sw));
    Object.assign(snapshot, { status: "approved", progress: 1, seed: 2, stateLabel: s.label, weight: s.w, outline: (s.wd - 25) / 126 });
    listener?.(snapshot);
    return;
  }

  let from = 3; // start from Black Narrow → Thin
  let to = 0;
  let status: FormStatus = "calibrating";
  let phase = 0;
  let iteration = 1;
  let gseed = 77;
  const grand = (): number => {
    gseed = (gseed * 16807) % 2147483647;
    return gseed / 2147483647;
  };

  onFrame((_, dt) => {
    if (state.reducedMotion || state.hold || letters.length === 0) return;
    const n = letters.length;
    phase += dt;
    const A = FORM_STATES[from];
    const B = FORM_STATES[to];
    let wSum = 0;
    let wdSum = 0;

    if (status === "calibrating") {
      const end = (n - 1) * STAGGER + MORPH;
      letters.forEach((el, i) => {
        const p = clamp01((phase - i * STAGGER) / MORPH);
        const e = easeInOut(clamp01(p / 0.62));
        // damped oscillation around the target before it settles
        const osc = Math.sin(p * Math.PI * 4.5) * Math.pow(1 - p, 1.6) * (p > 0 ? 1 : 0);
        const w = Math.min(1000, Math.max(100, lerp(A.w, B.w, e) + osc * WOBBLE_W));
        const wd = Math.min(151, Math.max(25, lerp(A.wd, B.wd, e) - osc * WOBBLE_WD));
        set(el, w, wd, lerp(A.fill, B.fill, e), lerp(A.sw, B.sw, e));
        wSum += w;
        wdSum += wd;
      });
      snapshot.progress = clamp01(phase / end);
      if (phase >= end) {
        status = "approved";
        phase = 0;
        word?.classList.add("is-glitch");
      }
    } else {
      const glitching = phase < GLITCH;
      letters.forEach((el) => {
        if (glitching) {
          const y0 = Math.floor(grand() * 70);
          const y1 = Math.min(100, y0 + 14 + Math.floor(grand() * 30));
          set(
            el, B.w, B.wd, grand() < 0.6 ? Math.max(B.fill, 0.25) : 0.25, B.sw || 0.01,
            (grand() - 0.5) * 0.07, (grand() - 0.5) * 10,
            grand() < 0.5 ? `inset(${y0}% 0 ${100 - y1}% 0)` : "",
          );
        } else {
          set(el, B.w, B.wd, B.fill, B.sw);
        }
        wSum += B.w;
        wdSum += B.wd;
      });
      if (!glitching) word?.classList.remove("is-glitch");
      snapshot.progress = 1;
      if (phase >= GLITCH + HOLD) {
        from = to;
        to = (to + 1) % FORM_STATES.length;
        if (to === 0) iteration++;
        status = "calibrating";
        phase = 0;
      }
    }

    snapshot.seed = to;
    snapshot.iteration = iteration;
    snapshot.status = status;
    snapshot.weight = wSum / n;
    snapshot.outline = (wdSum / n - 25) / 126;
    snapshot.stateLabel = FORM_STATES[to].label;
    listener?.(snapshot);
  });
}
