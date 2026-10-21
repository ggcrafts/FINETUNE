import { onFrame, state, TEMPO } from "../../state";

/**
 * Lab terminal — the previs script typed live into a Python prompt, then run.
 * Purely illustrative: small, translucent, non-interactive (no caret focus,
 * no selection). It starts only once the window is fully in view, and its
 * height is locked to the finished output so the layout never grows/jitters. The static code stays in the HTML as the
 * no-JS / reduced-motion version and for screen readers.
 */

type Kind = "in" | "cont" | "out" | "ok" | "blank";
interface Line { kind: Kind; text: string; typed: boolean }

const SCRIPT: Line[] = [
  { kind: "in", text: "import bpy", typed: true },
  { kind: "in", text: "scene = bpy.context.scene", typed: true },
  { kind: "in", text: "for i, shot in enumerate(shots):", typed: true },
  { kind: "cont", text: "    scene.camera = bpy.data.objects[shot.camera]", typed: true },
  { kind: "cont", text: "    scene.frame_start, scene.frame_end = shot.range", typed: true },
  { kind: "cont", text: "    scene.render.filepath = f\"//previs/{i:03d}_\"", typed: true },
  { kind: "cont", text: "    bpy.ops.render.render(animation=True)", typed: true },
  { kind: "cont", text: "", typed: true },
  { kind: "out", text: "rendering previs/000_  cam_A  ▸▸▸▸▸▸▸▸▸▸", typed: false },
  { kind: "out", text: "rendering previs/001_  cam_B  ▸▸▸▸▸▸▸▸▸▸", typed: false },
  { kind: "out", text: "rendering previs/002_  cam_C  ▸▸▸▸▸▸▸▸▸▸", typed: false },
  { kind: "ok", text: "✓ all shots rendered — previs ready for review", typed: false },
];

const CPS = 34;          // characters per second at tempo 1
const OUT_DELAY = 0.55;  // s per output line
const HOLD = 4.5;        // s before the loop restarts

const esc = (t: string): string => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function initTerminal(): void {
  const pre = document.querySelector<HTMLElement>("[data-terminal]");
  if (!pre || state.reducedMotion) return;

  const code = pre.querySelector("code");
  const fallback = pre.textContent ?? "";
  const sr = document.createElement("span");
  sr.className = "visually-hidden";
  sr.textContent = fallback;
  pre.after(sr);
  pre.setAttribute("aria-hidden", "true");
  pre.classList.add("is-live");

  let visible = false;
  let started = false;
  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting && e.intersectionRatio >= 0.85;
      if (visible) started = true;
    },
    { threshold: [0, 0.85, 1] },
  ).observe(pre);

  let lineIdx = 0;
  let charIdx = 0;
  let wait = 0.6;
  let hold = 0;
  let last = "";

  const render = (cursor: boolean): void => {
    let html = "";
    for (let i = 0; i <= Math.min(lineIdx, SCRIPT.length - 1); i++) {
      const l = SCRIPT[i];
      const text = i < lineIdx ? l.text : l.text.slice(0, Math.floor(charIdx));
      if (i === lineIdx && !l.typed && charIdx === 0) continue;
      const prompt = l.kind === "in" ? ">>> " : l.kind === "cont" ? "... " : "";
      html += `<span class="t-${l.kind}"><span class="t-p">${prompt}</span>${esc(text)}</span>\n`;
    }
    if (lineIdx >= SCRIPT.length) html += `<span class="t-in"><span class="t-p">&gt;&gt;&gt; </span></span>`;
    if (cursor) html = html.replace(/\n?$/, '<span class="t-cursor"></span>');
    if (html !== last && code) {
      code.innerHTML = html;
      last = html;
    }
  };

  // Lock the height to the fully-typed result (re-measured on resize).
  const lockHeight = (): void => {
    if (!code) return;
    const keep = code.innerHTML;
    pre.style.height = "";
    const saveLine = lineIdx;
    const saveChar = charIdx;
    lineIdx = SCRIPT.length;
    charIdx = 0;
    last = "";
    render(true);
    pre.style.height = `${pre.scrollHeight}px`;
    lineIdx = saveLine;
    charIdx = saveChar;
    code.innerHTML = keep;
    last = keep;
  };
  lockHeight();
  code && (code.innerHTML = '<span class="t-in"><span class="t-p">&gt;&gt;&gt; </span></span><span class="t-cursor"></span>');
  last = "";
  new ResizeObserver(() => lockHeight()).observe(pre.parentElement ?? pre);

  onFrame((s, dt) => {
    if (!started || !visible) return;
    const step = dt * TEMPO * 2; // TEMPO halves; ×2 keeps typing legible
    const blink = Math.floor(s.time * 2.4) % 2 === 0;

    if (lineIdx >= SCRIPT.length) {
      hold += step;
      if (hold > HOLD) {
        lineIdx = 0;
        charIdx = 0;
        hold = 0;
        wait = 0.6;
      }
      render(blink);
      return;
    }
    if (wait > 0) {
      wait -= step;
      render(blink);
      return;
    }
    const line = SCRIPT[lineIdx];
    if (line.typed) {
      charIdx += CPS * step * (0.6 + Math.random() * 0.8);
      if (charIdx >= line.text.length) {
        charIdx = line.text.length;
        render(true);
        lineIdx++;
        charIdx = 0;
        wait = 0.18 + Math.random() * 0.25;
        return;
      }
      render(true);
    } else {
      charIdx = line.text.length;
      render(false);
      lineIdx++;
      charIdx = 0;
      wait = OUT_DELAY;
    }
  });
}
