// FineTune v4 — Skills: the knob in the middle of the site.
//
// The dial is no longer a menu. Its stations are skills, grouped clockwise from 12 o'clock as
// core (what Luiz is hired for) → adjacent (delivered at senior level) → edge (what speeds up the
// pipeline); core stations take a wider slice of the ring and a heavier arc. Scrolling through
// the pinned section turns the dial one station at a time (native scroll, nothing hijacked);
// clicking a label or a chip scrolls to that station; pressing the knob opens the strongest
// proof of the skill. The readout shows the skill, its signal (ring), the tools and the jobs
// that prove it.

import { createKnob } from "./knob.js";
import { step as tuneStep, press as tunePress } from "./sound.js";

const WEIGHT = { core: 1.35, adjacent: 1, edge: 0.8 };
const BARS = { core: 3, adjacent: 2, edge: 1 };
const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, "0");

export function createSkills({ M, lang, motion, lite, openCase, toolChips, i18n }) {
  const sec = $("#skills"), dial = $("#dial"), ring = $("#dialRing"), prev = $("#dialPrev"), knobBtn = $("#dialKnob");
  const list = M.skills, N = list.length;
  if (!N) { sec.hidden = true; return { update() {}, frame() {}, render() {}, tint: null }; }
  sec.style.setProperty("--n", N);

  // ── geometry: each station's slice of the ring, clockwise from 12 o'clock, in degrees ──
  const total = list.reduce((a, s) => a + WEIGHT[s.ring], 0);
  let acc = 0;
  list.forEach((s) => { const w = (WEIGHT[s.ring] / total) * 360; s.a0 = acc; s.a1 = acc + w; s.ac = acc + w / 2; acc += w; });
  const stationAt = (deg) => list.findIndex((s) => deg >= s.a0 && deg < s.a1);
  const pt = (deg, r) => { const a = ((deg - 90) * Math.PI) / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };

  let cur = -1, hov = -1, visible = false, knob = null, needleAng = 0;
  try { knob = createKnob($("#knob"), { motion: motion(), label: i18n("knobLabel", "Press · see the work"), lite }); } catch (e) { console.warn("[FineTune] knob:", e); }
  if (!knob) document.documentElement.classList.add("no-knob");

  function buildRing() {
    const L = lang();
    let s = `<defs><path id="lpTop" d="M0,-236 A236,236 0 1,1 -0.01,-236"/><path id="lpBot" d="M0,-246 A246,246 0 1,0 0.01,-246"/></defs>`;
    s += `<circle class="orbit" r="214"/><circle class="orbit orbit--in" r="184"/>`;
    for (let i = 0; i < 180; i++) { const a = i * 2, maj = i % 15 === 0, [x0, y0] = pt(a, maj ? 196 : 202), [x1, y1] = pt(a, 209); s += `<line class="tick${maj ? " maj" : ""}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`; }
    list.forEach((st, i) => {
      s += `<path class="seg seg--${st.ring}" data-i="${i}" d="${arc(st.a0 + 0.9, st.a1 - 0.9, 214)}" style="--c:${st.tintHex}"/>`;
      const bottom = st.ac > 100 && st.ac < 260, off = bottom ? ((360 - st.ac) / 360) * 100 : (st.ac / 360) * 100;
      // ring label: the short name, shrunk (never below 72 %) and then cut to fit its slice of the arc
      let label = (st.short(L) || st.name(L)).toUpperCase();
      const room = ((st.a1 - st.a0 - 3) * Math.PI / 180) * (bottom ? 246 : 236), per = 7.7 * (st.ring === "core" ? 1.08 : 1);
      let fs = Math.max(0.72, Math.min(1, room / (label.length * per)));
      while (label.length * per * fs > room && label.length > 4) label = label.slice(0, -2).trimEnd() + "…";
      label = label.replace(/&/g, "&amp;");
      s += `<text class="lbl lbl--${st.ring}" data-i="${i}" text-anchor="middle" style="--c:${st.tintHex};--fs:${fs.toFixed(3)}"><textPath href="#${bottom ? "lpBot" : "lpTop"}" startOffset="${off.toFixed(3)}%">${label}</textPath></text>`;
    });
    s += `<g class="needle" id="skNeedle"><line x1="0" y1="-182" x2="0" y2="-218"/><circle cy="-198" r="3.2"/></g>`;
    ring.innerHTML = s;
  }

  function buildPreviews() {
    prev.replaceChildren(...list.map((s) => {
      const p = M.src(s.media), vid = /\.(webm|mp4|mov)(\?|$)/i.test(p), el = document.createElement(vid ? "video" : "img");
      if (vid) { el.muted = true; el.loop = true; el.playsInline = true; el.preload = "none"; el.dataset.src = p; } else { el.alt = ""; el.loading = "lazy"; el.decoding = "async"; if (p) el.src = p; }
      return el;
    }));
  }

  function buildChips() {
    const L = lang();
    $("#skStations").replaceChildren(...list.map((s, i) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "st st--" + s.ring; b.style.setProperty("--c", s.tintHex); b.textContent = s.name(L);
      b.onclick = () => select(i); li.append(b); return li;
    }));
  }

  function readout(i) {
    const s = list[i], L = lang(), pt = L === "pt";
    $("#skCh").textContent = `CH ${pad(i + 1)} / ${pad(N)}`;
    $("#skRing").textContent = i18n("ring_" + s.ring, { core: "Core — what I'm hired for", adjacent: "Adjacent — delivered at senior level", edge: "Edge — what speeds up the pipeline" }[s.ring]);
    $("#skName").textContent = s.name(L);
    $("#skSignal").dataset.bars = BARS[s.ring];
    $("#skSince").textContent = s.since ? (pt ? "desde " : "since ") + s.since : "";
    $("#skLine").textContent = s.line(L);
    $("#skTools").replaceChildren(toolChips(s.tools, true));
    $("#skProofN").textContent = s.proof.length ? pad(s.proof.length) : "";
    $("#skProof").replaceChildren(...(s.proof.length ? s.proof.slice(0, 4).map((j) => {
      const li = document.createElement("li"), b = document.createElement("button"), th = document.createElement("span"), t = document.createElement("span");
      b.type = "button"; b.className = "pf"; b.onclick = () => openCase(j);
      th.className = "pf__th"; const c = M.src(j.cover); if (c && !/\.(webm|mp4|mov)$/i.test(c)) th.style.backgroundImage = `url("${c}")`;
      t.className = "pf__t"; t.innerHTML = `<b></b><small></small>`; t.firstChild.textContent = j.title; t.lastChild.textContent = [j.client, j.year].filter(Boolean).join(" · ") || j.disc;
      const arrow = document.createElement("i"); arrow.textContent = "→"; arrow.setAttribute("aria-hidden", "true");
      b.append(th, t, arrow); li.append(b); return li;
    }) : [Object.assign(document.createElement("li"), { className: "pf--none", textContent: pt ? "Prova a caminho." : "Proof coming soon." })]));
    knobBtn.setAttribute("aria-label", `${s.name(L)} — ${s.proof.length ? (pt ? "abrir o case " + s.proof[0].title : "open the case " + s.proof[0].title) : ""}`);
    sec.style.setProperty("--led", s.tintHex);
    const ro = $("#readout"); ro.classList.remove("swap"); void ro.offsetWidth; ro.classList.add("swap");
  }

  function setStation(i, turn) {
    if (i === cur || i < 0) return;
    const was = cur; cur = i; const s = list[i];
    readout(i);
    ring.querySelectorAll(".seg, .lbl").forEach((el) => el.classList.toggle("on", +el.dataset.i === i));
    const row = $("#skStations");
    row.querySelectorAll("button").forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-current", k === i ? "true" : "false"); });
    const chip = row.children[i]; if (chip && row.scrollWidth > row.clientWidth) row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: motion() ? "smooth" : "auto" });
    [...prev.children].forEach((el, k) => {
      const on = k === i; el.classList.toggle("on", on);
      if (el.tagName === "VIDEO") { if (on && visible && motion()) { if (!el.src) el.src = el.dataset.src; el.play().catch(() => {}); } else el.pause(); }
    });
    // the needle and the knob take the shortest way round to the station's centre
    let target = s.ac; while (target - needleAng > 180) target -= 360; while (target - needleAng < -180) target += 360; needleAng = target;
    $("#skNeedle").style.transform = `rotate(${needleAng}deg)`;
    if (knob) { knob.set({ angle: (-needleAng * Math.PI) / 180, lr: s.tint[0], lg: s.tint[1], lb: s.tint[2] }); knob.snap({ gem: 1 }); knob.set({ gem: 0 }); }
    dial.classList.remove("tuning"); void dial.offsetWidth; dial.classList.add("tuning");
    if (was >= 0 && visible) tuneStep(turn || (i > was ? 1 : -1));
  }

  /** scroll to the station: the page position decides what the dial shows */
  function select(i) {
    i = (i + N) % N;
    const span = sec.offsetHeight - innerHeight, y = sec.offsetTop + ((i + 0.5) / N) * span;
    scrollTo({ top: y, behavior: motion() ? "smooth" : "auto" });
    setStation(i);
  }

  function update() {
    const r = sec.getBoundingClientRect();
    visible = r.bottom > 0 && r.top < innerHeight;
    const span = sec.offsetHeight - innerHeight; if (span <= 0) return;
    const q = (scrollY - sec.offsetTop) / span;
    if (cur < 0 || (q >= 0 && q <= 1)) setStation(clamp(Math.floor(clamp(q, 0, 0.9999) * N), 0, N - 1));
    sec.classList.toggle("is-live", visible);
    if (!visible) [...prev.children].forEach((el) => el.tagName === "VIDEO" && el.pause());
    else { const el = prev.children[cur]; if (el && el.tagName === "VIDEO" && el.paused && motion()) { if (!el.src) el.src = el.dataset.src; el.play().catch(() => {}); } }
  }

  // ── pointer: the ring answers the cursor (label + needle preview), the knob tilts toward it ──
  const polar = (e) => { const b = dial.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    return { deg: (((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360 + 360) % 360, r: Math.hypot(dx, dy) / (b.width / 2), dx: dx / b.width, dy: dy / b.height }; };
  dial.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const p = polar(e), onRing = p.r > 0.76 && p.r < 1.1, h = onRing ? stationAt(p.deg) : -1;
    if (h !== hov) { hov = h; ring.querySelectorAll(".lbl").forEach((el) => el.classList.toggle("hov", +el.dataset.i === h)); dial.classList.toggle("on-ring", h >= 0); }
    if (knob && motion()) knob.set({ tiltX: clamp(p.dx, -0.5, 0.5) * 0.3, tiltY: 0.06 + clamp(p.dy, -0.5, 0.5) * 0.24, lx: p.dx * 2, ly: p.dy * 2, hover: p.r < 0.74 ? 1 : 0, glow: p.r < 0.74 ? 1 : 0 });
  });
  dial.addEventListener("pointerleave", () => { hov = -1; ring.querySelectorAll(".lbl.hov").forEach((el) => el.classList.remove("hov")); dial.classList.remove("on-ring"); knob && knob.set({ tiltX: 0, tiltY: 0.06, hover: 0, glow: 0, press: 0 }); });
  dial.addEventListener("click", (e) => { if (e.target.closest("#dialKnob")) return; const p = polar(e); if (p.r > 0.76 && p.r < 1.14) select(stationAt(p.deg)); });
  knobBtn.addEventListener("pointerdown", () => knob && knob.set({ press: 1 }));
  addEventListener("pointerup", () => knob && knob.set({ press: 0 }));
  knobBtn.addEventListener("click", () => { const s = list[cur]; tunePress(); if (s && s.proof[0]) openCase(s.proof[0]); });
  knobBtn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select(cur + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select(cur - 1); }
  });

  function render() { buildRing(); buildChips(); const c = cur; cur = -1; setStation(Math.max(0, c)); if (knob) knob.setLabel(i18n("knobLabel", "Press · see the work")); }
  buildRing(); buildPreviews(); buildChips(); update(); if (cur < 0) setStation(0);

  let knobIdle = 0;
  return {
    update, render, select,
    frame(dt) { if (!knob) return; if (visible) { knobIdle = 0; knob.frame(dt); } else if (knobIdle < 0.5) { knobIdle += dt; knob.frame(dt); } },
    get tint() { return cur >= 0 ? list[cur].tint : null; },
    get weight() { const r = sec.getBoundingClientRect(); return clamp(1 - Math.abs((r.top + r.height / 2 - innerHeight / 2) / (r.height / 2 + innerHeight * 0.3)), 0, 1); },
  };
}
