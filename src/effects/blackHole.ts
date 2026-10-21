import { createFullscreen, createProgram } from "../webgl/gl";
import { setHold, state } from "../state";
import common from "../webgl/shaders/common.glsl?raw";
import fullscreenVert from "../webgl/shaders/fullscreen.vert.glsl?raw";
import blackholeFrag from "../webgl/shaders/blackhole.frag.glsl?raw";

/**
 * "Let's talk" — the page dissolves into a luminous black hole, then (after a
 * 1 s pause) the link performs its native action (mailto:). The page is
 * restored afterwards, since a mail client does not navigate away.
 *
 * Layers: the DOM is pulled toward the singularity (scale, swirl, blur, radial
 * mask); a 2D layer of particles spirals in; a WebGL layer draws the hole.
 */

const DURATION = 3.8;   // s — dissolve
const PAUSE = 1.0;      // s — black, before the native action

interface Mote {
  r: number;
  a: number;
  w: number;
  size: number;
  hue: number;
  delay: number;
}

const HUES: Array<[number, number, number]> = [
  [233, 240, 244],
  [155, 170, 181],
  [77, 214, 255],
  [143, 107, 255],
  [255, 97, 194],
  [255, 154, 77],
];

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

let running = false;

export function initBlackHole(): void {
  document.querySelectorAll<HTMLAnchorElement>("a[data-blackhole]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (running) {
        event.preventDefault();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const rect = link.getBoundingClientRect();
      void run(link.href, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  });
}

async function run(href: string, cx: number, cy: number): Promise<void> {
  running = true;
  // everything heavy stands still so the dissolve gets the whole frame budget
  setHold(true);
  if (state.reducedMotion) {
    document.body.classList.add("is-departing");
    await wait(PAUSE * 1000);
    window.location.href = href;
    await wait(800);
    document.body.classList.remove("is-departing");
    setHold(false);
    running = false;
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

  const layer = document.createElement("div");
  layer.className = "blackhole";
  layer.setAttribute("aria-hidden", "true");
  const glCanvas = document.createElement("canvas");
  const dust = document.createElement("canvas");
  layer.append(dust, glCanvas);
  document.body.append(layer);
  for (const c of [glCanvas, dust]) {
    c.width = Math.round(vw * dpr);
    c.height = Math.round(vh * dpr);
  }

  // ---- WebGL hole ------------------------------------------------------------
  const gl = glCanvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
  let draw: ((t: number, r: number, k: number, flash: number, x: number, y: number) => void) | null = null;
  let disposeGl = (): void => undefined;
  if (gl) {
    try {
      const prog = createProgram(gl, fullscreenVert, common + blackholeFrag, "blackhole");
      const quad = createFullscreen(gl);
      draw = (t, r, k, flash, x, y) => {
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        prog.use();
        gl.uniform2f(prog.uniform("uRes"), glCanvas.width, glCanvas.height);
        gl.uniform2f(prog.uniform("uCenter"), x * dpr, y * dpr);
        gl.uniform1f(prog.uniform("uRadius"), r * dpr);
        gl.uniform1f(prog.uniform("uTime"), t);
        gl.uniform1f(prog.uniform("uIntensity"), k);
        gl.uniform1f(prog.uniform("uFlash"), flash);
        quad.draw();
      };
      disposeGl = () => {
        prog.dispose();
        quad.dispose();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch {
      draw = null;
    }
  }

  // ---- particles: the page's light, pulled in ---------------------------------
  const ctx = dust.getContext("2d")!;
  const motes: Mote[] = [];
  const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
  for (let i = 0; i < 1100; i++) {
    const r = 30 + Math.sqrt(Math.random()) * far * 1.05;
    motes.push({
      r,
      a: Math.random() * Math.PI * 2,
      w: 0.6 + Math.random() * 1.2,
      size: 0.5 + Math.random() * 1.6,
      hue: Math.random() < 0.7 ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4),
      delay: (r / far) * 0.5 * Math.random(),
    });
  }

  // ---- DOM: pulled toward the singularity ---------------------------------------
  const targets = Array.from(document.querySelectorAll<HTMLElement>(".site-header, #main, .site-footer, .line-waves"));
  document.documentElement.classList.add("is-collapsing");
  const origin = (el: HTMLElement): string => {
    const r = el.getBoundingClientRect();
    return `${cx - r.left}px ${cy - r.top}px`;
  };
  targets.forEach((el) => (el.style.transformOrigin = origin(el)));

  const start = performance.now();
  let last = start;
  await new Promise<void>((resolve) => {
    const tick = (now: number): void => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = clamp01(t / DURATION);
      const e = ease(p);

      // hole grows, then collapses with a flash at the very end
      const grow = clamp01(t / 0.9);
      const collapse = clamp01((p - 0.86) / 0.14);
      const radius = (18 + 70 * ease(grow) + 40 * e) * (1 - ease(collapse) * 0.98);
      const intensity = ease(grow) * (1 - collapse * 0.6);
      const flash = Math.sin(Math.PI * collapse) * (collapse > 0 ? 1 : 0);

      // DOM disintegration
      const pull = clamp01((p - 0.05) / 0.75);
      const ep = ease(pull);
      const hole = 40 + ep * far * 1.1;
      targets.forEach((el) => {
        el.style.transform = `scale(${(1 - ep * 0.86).toFixed(4)}) rotate(${(ep * 38).toFixed(2)}deg)`;
        el.style.filter = `blur(${(ep * 10).toFixed(1)}px) brightness(${(1 + ep * 0.6).toFixed(2)})`;
        el.style.opacity = (1 - clamp01((p - 0.35) / 0.45)).toFixed(3);
        const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${(hole * 0.35).toFixed(0)}px, #000 ${hole.toFixed(0)}px)`;
        el.style.maskImage = m;
        el.style.webkitMaskImage = m;
      });
      layer.style.setProperty("--veil", (clamp01((p - 0.55) / 0.35)).toFixed(3));

      // particles spiral inward, accelerating
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, dust.width, dust.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (const m of motes) {
        if (t < m.delay) continue;
        const k = 0.35 + e * 3.2;
        const pr = m.r;
        m.r = Math.max(0, m.r - m.r * k * dt * m.w * 0.6 - 30 * e * dt);
        m.a += (m.w * 260 * dt) / Math.max(m.r, 24);
        const x = cx + Math.cos(m.a) * m.r;
        const y = cy + Math.sin(m.a) * m.r * 0.62;
        const px = cx + Math.cos(m.a - 0.04) * pr;
        const py = cy + Math.sin(m.a - 0.04) * pr * 0.62;
        const nearHole = clamp01((m.r - radius) / 60);
        const alpha = Math.min(1, t * 2) * nearHole * (1 - collapse);
        if (alpha <= 0.01) continue;
        const [r, g, b] = HUES[m.hue];
        ctx.strokeStyle = `rgba(${r},${g},${b},${(alpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = m.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      draw?.(t, Math.max(radius, 0.5), intensity, flash, cx, cy);

      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  layer.classList.add("is-done");
  await wait(PAUSE * 1000);
  window.location.href = href;

  // restore the page (mail clients don't navigate away)
  await wait(900);
  layer.classList.add("is-leaving");
  targets.forEach((el) => {
    el.style.transform = "";
    el.style.filter = "";
    el.style.opacity = "";
    el.style.maskImage = "";
    el.style.webkitMaskImage = "";
    el.style.transformOrigin = "";
  });
  document.documentElement.classList.remove("is-collapsing");
  await wait(700);
  disposeGl();
  layer.remove();
  setHold(false);
  running = false;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
