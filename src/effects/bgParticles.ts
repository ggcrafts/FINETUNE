import { onFrame, TEMPO } from "../state";
import { damp } from "../utils/lerp";

/**
 * Background light — the hero's ribbons continue as a few constant light
 * trails that follow the cursor, living *behind* every panel and text block.
 *
 * Each trail is a ribbon whose head chases the (lagged) pointer with its own
 * damping and a slow orbit around it, so the trails braid and part like the
 * hero vortex lines instead of bursting. Each keeps a short history of points
 * drawn as a tapered polyline: bright thin core + soft halo, colour drifting
 * along the ribbon through the hero palette. Cleared every frame — the lines
 * are continuous paths, not accumulating sparks. A CSS blur adds the
 * out-of-focus glow. Without a mouse the field wanders on its own; disabled
 * with reduced motion.
 */

interface Trail {
  pts: Float32Array; // ring buffer x,y
  head: number;
  count: number;
  x: number;
  y: number;
  lag: number;
  radius: number;
  speed: number;
  phase: number;
  hue: number;
  width: number;
}

const COLORS: Array<[number, number, number]> = [
  [77, 214, 255], // cyan
  [143, 107, 255], // violet
  [255, 97, 194], // rose
  [255, 154, 77], // amber
];
const TRAILS = 7;
const LENGTH = 110; // points per trail (~1.8 s of path)
const SAMPLE = 1 / 60; // s between history samples
const SCALE = 0.5;

const mixColor = (t: number): [number, number, number] => {
  const n = COLORS.length;
  const p = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(p);
  const f = p - i;
  const a = COLORS[i];
  const b = COLORS[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

export function initBgParticles(): void {
  const canvas = document.createElement("canvas");
  canvas.className = "bg-light";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const maybe = canvas.getContext("2d");
  if (!maybe) return;
  const ctx: CanvasRenderingContext2D = maybe;

  const resize = (): void => {
    canvas.width = Math.round(window.innerWidth * SCALE);
    canvas.height = Math.round(window.innerHeight * SCALE);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let ex = window.innerWidth * 0.6;
  let ey = window.innerHeight * 0.5;
  const trails: Trail[] = Array.from({ length: TRAILS }, (_, i) => ({
    pts: new Float32Array(LENGTH * 2),
    head: 0,
    count: 0,
    x: ex,
    y: ey,
    lag: 0.05 + (i / TRAILS) * 0.11,
    radius: 26 + ((i * 37) % 70),
    speed: (0.35 + ((i * 0.23) % 0.5)) * (i % 2 ? -1 : 1),
    phase: (i / TRAILS) * Math.PI * 2,
    hue: i / TRAILS,
    width: 0.9 + ((i * 0.41) % 1.1),
  }));

  let hidden = false;
  let acc = 0;
  let cleared = true;
  document.addEventListener("visibilitychange", () => (hidden = document.hidden));

  onFrame((s, dt) => {
    if (s.reducedMotion || hidden || s.hold) {
      if (!cleared) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trails.forEach((t) => (t.count = 0));
        cleared = true;
      }
      return;
    }
    cleared = false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const time = s.time * TEMPO * 2;

    // emitter: lags the pointer, or wanders when there is none
    const tx = s.pointerActive ? s.pointerClient.x : w * (0.5 + Math.sin(time * 0.31) * 0.35);
    const ty = s.pointerActive ? s.pointerClient.y : h * (0.5 + Math.sin(time * 0.23 + 1.2) * 0.3);
    ex = damp(ex, tx, 0.06, dt);
    ey = damp(ey, ty, 0.06, dt);

    // heads: each chases its own orbit point around the emitter
    for (const t of trails) {
      const a = t.phase + time * t.speed;
      const r = t.radius * (0.75 + 0.25 * Math.sin(time * 0.6 + t.phase * 3));
      const ox = Math.cos(a) * r;
      const oy = Math.sin(a) * r * 0.62;
      t.x = damp(t.x, ex + ox, t.lag, dt);
      t.y = damp(t.y, ey + oy, t.lag, dt);
    }

    acc += dt;
    let samples = 0;
    while (acc >= SAMPLE && samples < 4) {
      acc -= SAMPLE;
      samples++;
      for (const t of trails) {
        t.head = (t.head + 1) % LENGTH;
        t.pts[t.head * 2] = t.x;
        t.pts[t.head * 2 + 1] = t.y;
        if (t.count < LENGTH) t.count++;
      }
    }
    if (acc > SAMPLE) acc = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "butt"; // round caps would overlap additively → beads

    for (const t of trails) {
      if (t.count < 3) continue;
      // walk from head (newest) to tail
      let px = t.pts[t.head * 2] * SCALE;
      let py = t.pts[t.head * 2 + 1] * SCALE;
      for (let k = 1; k < t.count; k++) {
        const idx = (t.head - k + LENGTH) % LENGTH;
        const qx = t.pts[idx * 2] * SCALE;
        const qy = t.pts[idx * 2 + 1] * SCALE;
        const u = k / (t.count - 1); // 0 head → 1 tail
        const fade = Math.pow(1 - u, 1.6) * Math.min(1, u * 8 + 0.2);
        const [cr, cg, cb] = mixColor(t.hue + u * 0.45 + time * 0.02);
        // halo
        ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${(fade * 0.15).toFixed(3)})`;
        ctx.lineWidth = (t.width * 5 + 2) * (1 - u * 0.6);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(qx, qy);
        ctx.stroke();
        // core
        ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${(fade * 1.0).toFixed(3)})`;
        ctx.lineWidth = t.width * (1 - u * 0.75);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(qx, qy);
        ctx.stroke();
        px = qx;
        py = qy;
      }
    }
  });
}
