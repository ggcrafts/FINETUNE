import type { FormSnapshot } from "./formType";
import { onLangChange, t } from "../../i18n/i18n";

/**
 * FT-01 readout — the instrument panel that watches "form" calibrate.
 * Real telemetry of the typography (weight, width, morph progress, state),
 * not decorative numbers (spec §35).
 */
export function createReadout(): ((s: FormSnapshot) => void) | undefined {
  const root = document.querySelector<HTMLElement>("[data-readout]");
  if (!root) return undefined;

  const q = <T extends HTMLElement>(sel: string): T | null => root.querySelector<T>(sel);
  const bars = {
    weight: q<HTMLElement>("[data-ro-bar='weight']"),
    outline: q<HTMLElement>("[data-ro-bar='outline']"),
    progress: q<HTMLElement>("[data-ro-bar='progress']"),
  };
  const vals = {
    weight: q<HTMLElement>("[data-ro-val='weight']"),
    outline: q<HTMLElement>("[data-ro-val='outline']"),
    progress: q<HTMLElement>("[data-ro-val='progress']"),
  };
  const seedEl = q<HTMLElement>("[data-ro-seed]");
  const statusEl = q<HTMLElement>("[data-ro-status]");
  const iterEl = q<HTMLElement>("[data-ro-iter]");

  const sparks = createSparks(statusEl);
  let lastStatus = "";
  let lastSeed = -1;
  onLangChange(() => (lastStatus = "")); // re-label on language switch

  return (s) => {
    const wN = (s.weight - 100) / 900;
    bars.weight?.style.setProperty("--v", wN.toFixed(3));
    bars.outline?.style.setProperty("--v", s.outline.toFixed(3));
    bars.progress?.style.setProperty("--v", s.progress.toFixed(3));
    if (vals.weight) vals.weight.textContent = String(Math.round(s.weight));
    if (vals.outline) vals.outline.textContent = String(Math.round(25 + s.outline * 126));
    if (vals.progress) vals.progress.textContent = s.progress.toFixed(2);

    if (s.seed !== lastSeed) {
      lastSeed = s.seed;
      if (seedEl) seedEl.textContent = `${s.seed + 1}/${s.stateCount} · ${s.stateLabel}`;
      if (iterEl) iterEl.textContent = String(s.iteration).padStart(3, "0");
    }
    if (s.status !== lastStatus) {
      lastStatus = s.status;
      root.dataset.status = s.status;
      if (statusEl) statusEl.textContent = t(s.status);
      if (s.status === "approved") sparks?.();
    }
    root.style.setProperty("--spin", `${(s.progress * 180).toFixed(1)}deg`);
  };
}

const SPARK_COLORS = ["#4dd6ff", "#8f6bff", "#ff61c2", "#ff9a4d", "#e9f0f4"];

/**
 * "Approved" flashes (stepped blink) and throws a small burst of light
 * particles from the label — DOM dots animated with WAAPI, removed after.
 */
function createSparks(label: HTMLElement | null): (() => void) | undefined {
  if (!label || typeof label.animate !== "function") return undefined;
  const host = label.closest<HTMLElement>(".readout__status") ?? label;
  host.style.position = "relative";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  return () => {
    if (reduce.matches) return;
    label.animate(
      [
        { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.15 },
        { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 },
      ],
      { duration: 620, easing: "steps(1, end)" },
    );
    const w = label.offsetWidth || 60;
    const x0 = label.offsetLeft;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "readout__spark";
      const c = SPARK_COLORS[i % SPARK_COLORS.length];
      const size = 1.5 + Math.random() * 2;
      dot.style.cssText = `left:${(x0 + Math.random() * w).toFixed(1)}px;width:${size}px;height:${size}px;background:${c};box-shadow:0 0 6px ${c},0 0 12px ${c}`;
      host.append(dot);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const dist = 14 + Math.random() * 30;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const anim = dot.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 0 },
          { transform: `translate(${(dx * 0.3).toFixed(1)}px,${(dy * 0.3).toFixed(1)}px) scale(1.2)`, opacity: 1, offset: 0.15 },
          { transform: `translate(${dx.toFixed(1)}px,${(dy + 10).toFixed(1)}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 600, delay: Math.random() * 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
      );
      anim.onfinish = () => dot.remove();
    }
  };
}
