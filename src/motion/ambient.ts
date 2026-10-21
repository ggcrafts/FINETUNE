import { onFrame } from "../state";
import { damp } from "../utils/lerp";

/**
 * Ambient grid parallax (Hero, Process, Lab grids).
 * With a mouse: the grids lean gently against the pointer.
 * Without one (touch / idle): a slow, constant drift so the field never freezes.
 * Writes two CSS variables on the grid layers only (not :root, which would
 * invalidate style for the whole document every frame).
 */
export function initAmbient(): void {
  const grids = Array.from(document.querySelectorAll<HTMLElement>(".grid-overlay"));
  if (grids.length === 0) return;
  const set = (gx: string, gy: string): void => {
    for (const g of grids) {
      g.style.setProperty("--gx", gx);
      g.style.setProperty("--gy", gy);
    }
  };
  let x = 0;
  let y = 0;
  let lx = 1e6;
  let ly = 1e6;

  onFrame((s, dt) => {
    if (s.hold) return;
    if (s.reducedMotion) {
      if (lx !== 0 || ly !== 0) {
        set("0px", "0px");
        lx = ly = 0;
      }
      return;
    }
    let tx: number;
    let ty: number;
    if (s.pointerActive) {
      tx = -s.pointer.x * 16;
      ty = s.pointer.y * 12;
    } else {
      tx = Math.sin(s.time * 0.13) * 14 + Math.sin(s.time * 0.051) * 6;
      ty = Math.cos(s.time * 0.097) * 10;
    }
    x = damp(x, tx, 0.045, dt);
    y = damp(y, ty, 0.045, dt);
    if (Math.abs(x - lx) > 0.05 || Math.abs(y - ly) > 0.05) {
      set(`${x.toFixed(2)}px`, `${y.toFixed(2)}px`);
      lx = x;
      ly = y;
    }
  });
}
