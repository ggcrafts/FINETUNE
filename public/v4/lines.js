// Stroke turbulence — the FineTune signature line (ported from v2 effects/lineWaves.ts).
//
// Thin structural lines become light where the cursor passes: the pointer leaves a trail of
// impulses that fade in, linger and dissolve, so the turbulence lags behind the pointer.
// Three chromatic strands (cyan / rose / amber) split slightly with the amplitude, and the
// strongest point throws a few sparks. Line ends stay calm so the layout never warps.
//
// v3 scope: vertical hairlines only, in a few quiet places — any element with
// data-wave="l" / "r" / "l r" (left / right edge of its box). The site can also send a
// ripple down a line (`trace`) when something happens there (a category opens, a slide moves).

const RADIUS = 120;      // px — perpendicular reach of an impulse
const SPAN = 90;         // px — reach along the line
const AMP = 4;           // px — max displacement
const CORNER = 56;       // px — falloff near line ends
const ATTACK = 0.35;     // s
const RELEASE = 1.9;     // s
const MAX_IMPULSES = 64;
const MAX_SPARKS = 60;
const COLORS = [[77, 214, 255], [255, 97, 194], [255, 154, 77]];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const envelope = (age) => smooth(0, ATTACK, age) * Math.exp(-Math.max(0, age - ATTACK) / (RELEASE * 0.45));

/** @param {{ live: () => boolean }} opts */
export function createLineWaves({ live }) {
  const canvas = document.createElement("canvas");
  canvas.className = "line-waves";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { tick() {}, trace() {}, pulse() {} };

  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.round((canvas.clientWidth || innerWidth) * dpr); canvas.height = Math.round((canvas.clientHeight || innerHeight) * dpr); };   // CSS size, not innerWidth: a scrollbar would squeeze the drawing and shift lines left
  resize(); addEventListener("resize", resize, { passive: true });

  const impulses = [], sparks = [], queue = [];
  let px = -1e4, py = -1e4, lastX = -1e4, lastY = -1e4, clock = 0, drawing = false;
  if (fine) addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true });

  const pulse = (x, y, strength = 1) => { impulses.push({ x, y, age: 0, strength }); if (impulses.length > MAX_IMPULSES) impulses.shift(); };
  /** a ripple travelling down (or up) a line: impulses dropped over ~0.7 s */
  function trace(el, { edge = "l", strength = 0.9, up = false } = {}) {
    if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.height) return;
    const x = edge === "r" ? r.right - 0.5 : r.left + 0.5, n = Math.max(4, Math.round(r.height / 70));
    for (let i = 0; i <= n; i++) queue.push({ at: clock + i * (0.7 / n), x, y: up ? r.bottom - (r.height * i) / n : r.top + (r.height * i) / n, s: strength });
  }

  function field(lineX, u) {
    let a = 0;
    for (const im of impulses) {
      const along = im.y - u, perp = im.x - lineX;
      if (Math.abs(perp) > RADIUS || Math.abs(along) > SPAN * 2.4) continue;
      const pr = 1 - Math.abs(perp) / RADIUS;
      a += envelope(im.age) * im.strength * pr * pr * Math.exp(-(along * along) / (SPAN * SPAN));
    }
    return Math.min(1.2, a * 0.55);
  }

  function drawLine(lineX, top, bottom) {
    const step = 4, n = Math.floor((bottom - top) / step) + 1;
    if (n < 3) return;
    const amps = new Float32Array(n);
    let first = -1, last = -1;
    for (let i = 0; i < n; i++) {
      const u = top + i * step, a = field(lineX, u) * smooth(0, CORNER, u - top) * smooth(0, CORNER, bottom - u);
      amps[i] = a; if (a > 0.015) { if (first < 0) first = i; last = i; }
    }
    if (first < 0) return;
    first = Math.max(0, first - 1); last = Math.min(n - 1, last + 1);
    const from = top + first * step, to = top + last * step;
    for (let c = 0; c < 3; c++) {
      const [cr, cg, cb] = COLORS[c], phase = c * 0.9, shift = (c - 1) * 0.8;
      const grad = ctx.createLinearGradient(0, from, 0, to);
      for (let k = 0; k <= 12; k++) { const a = Math.min(1, amps[Math.round(first + ((last - first) * k) / 12)] * 1.5) * 0.72; grad.addColorStop(k / 12, `rgba(${cr},${cg},${cb},${a.toFixed(3)})`); }
      ctx.beginPath();
      for (let i = first; i <= last; i++) {
        const u = top + i * step, a = amps[i];
        const wave = Math.sin(u * 0.08 - clock * 3.6 + phase) * 0.7 + Math.sin(u * 0.029 + clock * 1.15 + phase * 0.5) * 0.3;
        const x = lineX + wave * AMP * a + shift * a;
        if (i === first) ctx.moveTo(x, u); else ctx.lineTo(x, u);
      }
      ctx.strokeStyle = grad; ctx.shadowColor = `rgba(${cr},${cg},${cb},0.55)`; ctx.shadowBlur = 9; ctx.lineWidth = 1.25; ctx.stroke();
    }
    ctx.shadowBlur = 0;
    let peak = first; for (let i = first; i <= last; i++) if (amps[i] > amps[peak]) peak = i;
    if (sparks.length < MAX_SPARKS && amps[peak] > 0.35 && Math.random() < amps[peak] * 0.1) {
      sparks.push({ x: lineX, y: top + peak * step + (Math.random() - 0.5) * SPAN, vx: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 22), vy: (Math.random() - 0.5) * 26,
        life: 0.9 + Math.random() * 0.9, max: 1.8, hue: Math.floor(Math.random() * 3), size: 0.6 + Math.random() * 0.9 });
    }
  }

  function tick(dt) {
    clock += dt;
    const on = live();
    while (queue.length && queue[0].at <= clock) { const q = queue.shift(); if (on) pulse(q.x, q.y, q.s); }
    if (on && fine) {
      const d = Math.hypot(px - lastX, py - lastY);
      if (d > 10) { if (lastX > -1e3 && d < 400) pulse(px, py, Math.min(1, 0.45 + d / 60)); lastX = px; lastY = py; }
    } else { lastX = lastY = -1e4; }
    for (let i = impulses.length - 1; i >= 0; i--) { impulses[i].age += dt; if (impulses[i].age > ATTACK + RELEASE * 2.2) impulses.splice(i, 1); }
    if (!on || (!impulses.length && !sparks.length)) {
      if (drawing) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); drawing = false; }
      if (!on) { impulses.length = 0; sparks.length = 0; queue.length = 0; }
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = "lighter"; drawing = true;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const im of impulses) { minX = Math.min(minX, im.x); maxX = Math.max(maxX, im.x); minY = Math.min(minY, im.y); maxY = Math.max(maxY, im.y); }
    document.querySelectorAll("[data-wave]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.height || r.bottom < 0 || r.top > innerHeight || getComputedStyle(el).visibility === "hidden" || +getComputedStyle(el).opacity < 0.05) return;
      if (maxX < r.left - RADIUS || minX > r.right + RADIUS || maxY < r.top - RADIUS || minY > r.bottom + RADIUS) return;
      for (const edge of el.dataset.wave.split(/\s+/)) drawLine(edge === "r" ? r.right - 0.5 : r.left + 0.5, Math.max(-20, r.top), Math.min(innerHeight + 20, r.bottom));
    });
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.life -= dt; if (p.life <= 0) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97;
      const [cr, cg, cb] = COLORS[p.hue]; ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.max(0, Math.sin(Math.PI * (p.life / p.max)) * 0.8).toFixed(3)})`;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  return { tick, trace, pulse };
}
