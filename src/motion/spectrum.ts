import { onFrame } from "../state";

/**
 * Spectral accent — the UI accent is no longer a fixed green: it slowly
 * travels through the same palette as the hero light lines
 * (cyan → violet → rose → amber → …), as if the interface were lit by them.
 *
 * Writes `--ft-accent` and `--ft-accent-2` (a phase-shifted partner used for
 * gradients) on :root at ~12 fps — the hue moves slowly enough that steps are
 * invisible, and it keeps style recalculation cheap. Static with reduced motion.
 */

// cyan is listed twice: it holds a little longer, as the banner's lead accent
const PALETTE: Array<[number, number, number]> = [
  [77, 214, 255], // cyan
  [77, 214, 255], // cyan (hold)
  [143, 107, 255], // violet
  [255, 97, 194], // rose
  [255, 154, 77], // amber
];
const PERIOD = 24; // s for a full cycle
const STEP = 1 / 12;

const toLin = (c: number): number => Math.pow(c / 255, 2.2);
const toSrgb = (c: number): number => Math.round(Math.pow(Math.min(1, Math.max(0, c)), 1 / 2.2) * 255);

function sample(phase: number): string {
  const n = PALETTE.length;
  const p = ((phase % 1) + 1) % 1 * n;
  const i = Math.floor(p);
  const f = p - i;
  const t = f * f * (3 - 2 * f); // ease between stops so each hue "settles"
  const a = PALETTE[i];
  const b = PALETTE[(i + 1) % n];
  const mix = (k: number): number => toSrgb(toLin(a[k]) + (toLin(b[k]) - toLin(a[k])) * t);
  return `rgb(${mix(0)} ${mix(1)} ${mix(2)})`;
}

export function initSpectrum(): void {
  const root = document.documentElement.style;
  let acc = STEP;
  let still = false;
  onFrame((s, dt) => {
    if (s.hold) return;
    if (s.reducedMotion) {
      if (!still) {
        root.setProperty("--ft-accent", sample(0));
        root.setProperty("--ft-accent-2", sample(0.25));
        still = true;
      }
      return;
    }
    still = false;
    acc += dt;
    if (acc < STEP) return;
    acc = 0;
    const ph = s.time / PERIOD;
    root.setProperty("--ft-accent", sample(ph));
    root.setProperty("--ft-accent-2", sample(ph + 0.28));
  });
}
