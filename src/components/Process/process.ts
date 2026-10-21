import { onFrame } from "../../state";
import { damp } from "../../utils/lerp";

/**
 * Process timeline: the rail behaves like an After Effects value graph.
 * It bends toward the cursor's vertical position around the cursor's x,
 * keyframes ride on the curve, and the light runs up to the keyframe nearest
 * the pointer. Without a mouse it breathes gently; reduced motion = straight.
 */
export function initProcess(): void {
  const track = document.querySelector<HTMLElement>("[data-process-track]");
  if (!track) return;
  const svg = track.querySelector<SVGSVGElement>(".process__curve");
  const base = track.querySelector<SVGPathElement>(".process__curve-base");
  const light = track.querySelector<SVGPathElement>(".process__curve-light");
  const stages = Array.from(track.querySelectorAll<HTMLElement>(".process__stage"));
  const nodes = stages.map((s) => s.querySelector<HTMLElement>(".process__node"));
  if (!svg || !base || !light || stages.length === 0) return;

  const BAND = 80; // px above/below the line inside the svg
  let amp = 0;
  let cx = 0.5;
  let lit = 0.5;
  let active = 2;
  let width = 1;
  let nodeX: number[] = [];

  const measure = (): void => {
    const r = track.getBoundingClientRect();
    width = r.width || 1;
    svg.setAttribute("viewBox", `0 0 ${width} ${BAND * 2}`);
    nodeX = nodes.map((n) => {
      if (!n) return 0;
      const nr = n.getBoundingClientRect();
      return (nr.left + nr.width / 2 - r.left) / width;
    });
  };
  measure();
  new ResizeObserver(measure).observe(track);
  stages.forEach((st, i) => {
    st.classList.toggle("is-active", i === active);
    st.classList.toggle("is-passed", i < active);
  });

  const curveY = (x: number): number => {
    const d = (x - cx) / 0.22;
    return amp * Math.exp(-d * d);
  };

  onFrame((s, dt) => {
    if (window.innerWidth < 900) return;
    const r = track.getBoundingClientRect();
    if (r.bottom < -100 || r.top > window.innerHeight + 100) return;

    const lineY = r.top + 11; // --node-y
    let targetAmp = 0;
    let targetX = cx;
    let targetActive = active;

    if (s.reducedMotion) {
      targetAmp = 0;
    } else if (s.pointerActive) {
      const px = (s.pointerClient.x - r.left) / width;
      const dy = s.pointerClient.y - lineY;
      const inside = px > -0.1 && px < 1.1 && Math.abs(dy) < 420;
      if (inside) {
        targetAmp = Math.max(-50, Math.min(50, dy * 0.34));
        targetX = Math.min(1, Math.max(0, px));
        let best = 0;
        nodeX.forEach((x, i) => {
          if (Math.abs(x - px) < Math.abs(nodeX[best] - px)) best = i;
        });
        targetActive = best;
      }
    } else {
      targetAmp = Math.sin(s.time * 0.9) * 7;
      targetX = 0.5 + Math.sin(s.time * 0.37) * 0.3;
    }

    amp = damp(amp, targetAmp, 0.06, dt);
    cx = damp(cx, targetX, 0.05, dt);
    if (targetActive !== active) {
      active = targetActive;
      stages.forEach((st, i) => {
        st.classList.toggle("is-active", i === active);
        st.classList.toggle("is-passed", i < active);
      });
    }
    const litTarget = nodeX[active] ?? 0.5;
    lit = damp(lit, litTarget, 0.07, dt);

    // path
    const steps = 64;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const y = BAND + curveY(x);
      d += `${i === 0 ? "M" : "L"}${(x * width).toFixed(1)} ${y.toFixed(2)} `;
    }
    base.setAttribute("d", d);
    light.setAttribute("d", d);
    light.style.setProperty("--lit", lit.toFixed(4));
    nodes.forEach((n, i) => n?.style.setProperty("--ny", `${curveY(nodeX[i]).toFixed(2)}px`));
  });

}
