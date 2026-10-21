import { onFrame, TEMPO } from "../state";

/**
 * Stroke turbulence — structural lines become light where the cursor passes.
 *
 * The cursor leaves a trail of "impulses" (position + strength). Each impulse
 * fades in, lingers, and fades out on its own envelope, so the turbulence lags
 * behind the pointer and dissolves smoothly instead of switching on/off.
 * Along each line, amplitude and opacity are shaped by the impulses and by a
 * corner falloff, so edges and junctions stay calm and the layout never warps.
 *
 * Scope (by design): horizontal lines only — the Process section ("From
 * possibility to precision.") plus buttons and the floating panels.
 * Desktop + fine pointer only; disabled with reduced motion.
 */

type Edge = "t" | "r" | "b" | "l";

interface Source {
  el: HTMLElement;
  panel: HTMLElement | null;
  edges: Edge[];
}

interface Impulse {
  x: number;
  y: number;
  age: number;
  strength: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  hue: number;
  size: number;
}

const RADIUS = 120;      // px — perpendicular reach of an impulse
const SPAN = 90;         // px — reach along the line
const AMP = 4;           // px — max displacement
const CORNER = 56;       // px — falloff distance from line ends / corners
const ATTACK = 0.35;     // s
const RELEASE = 1.9;     // s
const MAX_IMPULSES = 48;
const MAX_SPARKS = 60;

const COLORS: Array<[number, number, number]> = [
  [77, 214, 255], // cyan
  [255, 97, 194], // rose
  [255, 154, 77], // amber
];

const FULL = [
  "[data-section='process']",
  "[data-section='process'] .section-head",
  ".btn",
  ".hero__readout",
  ".contact__body",
].join(", ");

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fade in over ATTACK, then decay — the turbulence lingers after the cursor. */
function envelope(age: number): number {
  return smooth(0, ATTACK, age) * Math.exp(-Math.max(0, age - ATTACK) / (RELEASE * 0.45));
}

export function initLineWaves(): void {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;

  const canvas = document.createElement("canvas");
  canvas.className = "line-waves";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const maybe = canvas.getContext("2d");
  if (!maybe) return;
  const ctx: CanvasRenderingContext2D = maybe;

  let dpr = 1;
  const resize = (): void => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let sources: Source[] = [];
  const collect = (): void => {
    const list: Source[] = [];
    document.querySelectorAll<HTMLElement>(FULL).forEach((el) =>
      list.push({ el, panel: el.closest<HTMLElement>("[data-section]"), edges: el.matches(".section-head") ? ["b"] : ["t", "b"] }),
    );
    sources = list;
  };
  collect();
  requestAnimationFrame(collect);

  const impulses: Impulse[] = [];
  const sparks: Spark[] = [];
  let lastX = -1e4;
  let lastY = -1e4;
  let clock = 0;
  let wasDrawing = false;

  onFrame((s, dt) => {
    clock += dt * TEMPO;
    const live = s.pointerActive && !s.reducedMotion && !s.hold;
    const px = s.pointerClient.x;
    const py = s.pointerClient.y;

    // drop a new impulse every ~10px of travel
    if (live) {
      const d = Math.hypot(px - lastX, py - lastY);
      if (d > 10) {
        if (lastX > -1e3 && d < 400) {
          impulses.push({ x: px, y: py, age: 0, strength: Math.min(1, 0.45 + d / 60) });
          if (impulses.length > MAX_IMPULSES) impulses.shift();
        }
        lastX = px;
        lastY = py;
      }
    } else {
      lastX = lastY = -1e4;
    }
    for (let i = impulses.length - 1; i >= 0; i--) {
      impulses[i].age += dt;
      if (impulses[i].age > ATTACK + RELEASE * 2.2) impulses.splice(i, 1);
    }

    if (impulses.length === 0 && sparks.length === 0) {
      if (wasDrawing) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        wasDrawing = false;
      }
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    wasDrawing = true;

    // impulse bounds for quick rejection
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const im of impulses) {
      minX = Math.min(minX, im.x); maxX = Math.max(maxX, im.x);
      minY = Math.min(minY, im.y); maxY = Math.max(maxY, im.y);
    }

    for (const src of sources) {
      if (src.panel) {
        if (src.panel.classList.contains("is-receded") || src.panel.classList.contains("is-pending")) continue;
      }
      const r = src.el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (maxX < r.left - RADIUS || minX > r.right + RADIUS || maxY < r.top - RADIUS || minY > r.bottom + RADIUS) continue;
      // occluded (e.g. the hero readout once the next panel slides over it)? skip
      if (src.panel && !visibleAt(src, r)) continue;
      for (const edge of src.edges) drawEdge(edge, r);
    }

    // sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      const a = Math.sin(Math.PI * (p.life / p.max)) * 0.8; // fades in and out
      const [cr, cg, cb] = COLORS[p.hue];
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.max(0, a).toFixed(3)})`;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  });

  /** Is the source actually on top at its centre (or at its visible part)? */
  function visibleAt(src: Source, r: DOMRect): boolean {
    const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
    const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return !hit || Boolean(src.panel && src.panel.contains(hit)) || hit === canvas;
  }

  /** Amplitude of the turbulence at a point on a line (0…~1). */
  function field(horizontal: boolean, lineCoord: number, u: number): number {
    let a = 0;
    for (const im of impulses) {
      const along = (horizontal ? im.x : im.y) - u;
      const perp = (horizontal ? im.y : im.x) - lineCoord;
      if (Math.abs(perp) > RADIUS || Math.abs(along) > SPAN * 2.4) continue;
      const pr = 1 - Math.abs(perp) / RADIUS;
      a += envelope(im.age) * im.strength * pr * pr * Math.exp(-(along * along) / (SPAN * SPAN));
    }
    return Math.min(1.2, a * 0.55);
  }

  function drawEdge(edge: Edge, r: DOMRect): void {
    const horizontal = edge === "t" || edge === "b";
    // sit exactly on the 1px CSS border
    const lineCoord =
      edge === "t" ? r.top + 0.5 : edge === "b" ? r.bottom - 0.5 : edge === "l" ? r.left + 0.5 : r.right - 0.5;
    const start = horizontal ? r.left : r.top;
    const end = horizontal ? r.right : r.bottom;

    const step = 4;
    const n = Math.floor((end - start) / step) + 1;
    if (n < 3) return;
    let first = -1;
    let last = -1;
    const amps = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = start + i * step;
      // calm near corners and junctions so edges never visibly bend
      const corner = smooth(0, CORNER, u - start) * smooth(0, CORNER, end - u);
      const a = field(horizontal, lineCoord, u) * corner;
      amps[i] = a;
      if (a > 0.015) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0) return;
    first = Math.max(0, first - 1);
    last = Math.min(n - 1, last + 1);

    const from = start + first * step;
    const to = start + last * step;

    for (let c = 0; c < 3; c++) {
      const [cr, cg, cb] = COLORS[c];
      const phase = c * 0.9;
      const shift = (c - 1) * 0.8; // chromatic split, scaled by local amplitude

      // opacity follows the amplitude along the line: soft ends, never a hard cut
      const grad = horizontal ? ctx.createLinearGradient(from, 0, to, 0) : ctx.createLinearGradient(0, from, 0, to);
      const stops = 12;
      for (let k = 0; k <= stops; k++) {
        const idx = Math.round(first + ((last - first) * k) / stops);
        const alpha = Math.min(1, amps[idx] * 1.5) * 0.72;
        grad.addColorStop(k / stops, `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`);
      }

      ctx.beginPath();
      for (let i = first; i <= last; i++) {
        const u = start + i * step;
        const a = amps[i];
        const wave =
          Math.sin(u * 0.08 - clock * 3.6 + phase) * 0.7 +
          Math.sin(u * 0.029 + clock * 1.15 + phase * 0.5) * 0.3;
        const off = wave * AMP * a + shift * a;
        const x = horizontal ? u : lineCoord + off;
        const y = horizontal ? lineCoord + off : u;
        if (i === first) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = grad;
      ctx.shadowColor = `rgba(${cr},${cg},${cb},0.55)`;
      ctx.shadowBlur = 9;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // occasional sparks from the strongest point of fresh turbulence
    let peak = first;
    for (let i = first; i <= last; i++) if (amps[i] > amps[peak]) peak = i;
    if (sparks.length < MAX_SPARKS && amps[peak] > 0.35 && Math.random() < amps[peak] * 0.1) {
      const u = start + peak * step + (Math.random() - 0.5) * SPAN;
      const out = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 22);
      const drift = (Math.random() - 0.5) * 26;
      sparks.push({
        x: horizontal ? u : lineCoord,
        y: horizontal ? lineCoord : u,
        vx: horizontal ? drift : out,
        vy: horizontal ? out : drift,
        life: 0.9 + Math.random() * 0.9,
        max: 1.8,
        hue: Math.floor(Math.random() * 3),
        size: 0.6 + Math.random() * 0.9,
      });
    }
  }
}
