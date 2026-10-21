import { onFrame, state, markDirty } from "../state";
import { onLangChange } from "../i18n/i18n";

/**
 * Hero hand-off + continuous scroll (round 8).
 *
 * Nothing is sticky any more. The hero recedes into depth (triggered,
 * CSS-animated) once half of it has scrolled away; every other panel scrolls
 * continuously and just dims a little while it is out of focus — no
 * snapping, no stacking, no panel on top of another.
 *
 * (Earlier notes on the stacked version below.)
 *
 * Every framed panel is `position: sticky`, so panels physically slide over
 * each other with the scroll (never scroll-jacked). Their *look* is not
 * scrubbed by the scroll position any more: each panel switches between three
 * states and CSS animates the change on its own clock —
 *
 *   pending  → not yet revealed (transparent, slightly low, blurred)
 *   shown    → resolved
 *   receded  → pushed back into depth (smaller, up, faded out, then hidden)
 *
 * A panel is only revealed while it does not sit over a panel that is still
 * visible, and the panel underneath recedes as soon as the next one has
 * travelled far enough (with hysteresis). So whatever the scroll position,
 * the visitor never sees two panels on top of each other or a half-faded
 * state — there is nothing "in between" to stop on.
 *
 * No scroll snapping: the scroll stays completely free and native (momentum,
 * trackpads, keyboard); the triggered states are what remove the "half-way"
 * look, so there is nothing to snap out of.
 *
 * Also owns: active-section detection, `--e` (entry state for keyword
 * calibration), `state.heroCover`, and anchor navigation to stuck panels.
 */

interface Panel {
  el: HTMLElement;
  id: string;
  natTop: number; // document-space top when unstuck
  height: number;
  stick: number;  // sticky top (px, may be negative for tall panels)
  shown: boolean;
  receded: boolean;
  /** was the next panel already shown when it began to overlap this one? */
  nextShownAtOverlap: boolean;
  overlapping: boolean;
  dim: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// cover thresholds (fraction of the next panel's travel over this one)
const RECEDE_AT = 0.5;  // hero recedes when half of it has left
const RETURN_AT = 0.38; // …and returns when it is back above 62%

export function initStack(): void {
  const container = document.querySelector<HTMLElement>("[data-panels]");
  if (!container) return;
  const panels: Panel[] = Array.from(container.querySelectorAll<HTMLElement>(":scope > [data-section]")).map((el) => ({
    el,
    id: el.dataset.section ?? "",
    natTop: 0,
    height: 0,
    stick: 0,
    shown: true,
    receded: false,
    nextShownAtOverlap: false,
    overlapping: false,
    dim: 0,
  }));
  if (panels.length === 0) return;

  const root = document.documentElement;
  let enabled = false;
  let headerOffset = 0;
  let gap = 0;

  const measure = (): void => {
    const cs = getComputedStyle(root);
    const headerH = parseFloat(cs.getPropertyValue("--header-h")) || 64;
    gap = parseFloat(getComputedStyle(container).rowGap) || 12;
    headerOffset = headerH + gap * 2;
    const vh = window.innerHeight;
    const containerTop = container.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(container).paddingTop);
    let y = containerTop;
    for (const p of panels) {
      p.height = p.el.offsetHeight;
      p.natTop = y;
      y += p.height + gap;
      // short panels stick under the header; tall ones stick once their bottom is reached
      p.stick = Math.min(headerOffset, vh - p.height - gap);
      p.el.style.setProperty("--stick", `${p.stick}px`);
    }
  };

  const apply = (p: Panel): void => {
    p.el.classList.toggle("is-pending", !p.shown);
    p.el.classList.toggle("is-receded", p.receded);
    p.el.style.setProperty("--e", p.shown && !p.receded ? "1" : "0");
  };

  const setEnabled = (on: boolean): void => {
    enabled = on;
    root.classList.toggle("is-stacked", on);
    for (const p of panels) {
      p.shown = true;
      p.receded = false;
      p.overlapping = false;
      p.el.classList.remove("is-pending", "is-receded");
      p.el.style.setProperty("--e", "1");
      p.el.style.removeProperty("--dim");
      p.dim = 0;
    }
    measure();
  };

  setEnabled(!state.reducedMotion);
  window.addEventListener("resize", measure, { passive: true });
  new ResizeObserver(measure).observe(container);
  document.fonts?.ready.then(measure).catch(() => undefined);
  onLangChange(() => requestAnimationFrame(measure));

  // Anchor links: scroll to a panel's resting position (stuck panels report a fake one).
  document.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    const id = link.getAttribute("href")!.slice(1);
    const panel = panels.find((p) => p.el.id === id);
    if (!panel) return;
    event.preventDefault();
    const top = panel === panels[0] ? 0 : panel.natTop - headerOffset;
    window.scrollTo({ top, behavior: state.reducedMotion ? "auto" : "smooth" });
    history.replaceState(null, "", `#${id}`);
    // move focus for keyboard / screen-reader users without a second scroll
    panel.el.setAttribute("tabindex", "-1");
    panel.el.focus({ preventScroll: true });
  });

  const contactBlock = document.getElementById("contact");

  // panels already in view on load start resolved; the rest wait for their cue
  let primed = false;

  onFrame(() => {
    if (enabled === state.reducedMotion) setEnabled(!state.reducedMotion);
    const vh = window.innerHeight;
    const sy = window.scrollY;

    // active section: last panel whose natural top passed 40% of the viewport
    let active = panels[0].id;
    for (const p of panels) if (p.natTop - sy <= vh * 0.4) active = p.id;
    if (contactBlock && contactBlock.getBoundingClientRect().top <= vh * 0.55) active = "contact";
    if (active !== state.activeSection) {
      state.activeSection = active;
      markDirty();
    }

    if (!enabled) return;

    // live viewport tops from layout (not affected by the CSS translate/scale
    // of the transition states)
    const base = container.getBoundingClientRect().top;
    const tops = panels.map((p) => base + p.el.offsetTop);

    if (!primed) {
      primed = true;
      panels.forEach(apply);
    }

    // ---- Hero: scrolls away like the rest, and recedes into depth (triggered,
    // CSS-animated) once less than ~half of it is still in view.
    {
      const p = panels[0];
      const bottom = tops[0] + p.height;
      const inView = clamp01((bottom - headerOffset) / Math.max(1, Math.min(p.height, vh - headerOffset)));
      state.heroCover = 1 - inView;
      const receded = p.receded ? inView < 1 - RETURN_AT : inView < 1 - RECEDE_AT;
      if (receded !== p.receded) {
        p.receded = receded;
        apply(p);
      }
    }

    // ---- Everything else scrolls continuously; what is out of focus dims
    // slightly (overlay), so the eye settles on the panel in view.
    const headerH = headerOffset - gap;
    for (let i = 1; i < panels.length; i++) {
      const p = panels[i];
      const top = tops[i];
      const bottom = top + p.height;
      const room = Math.max(1, Math.min(p.height, vh - headerH));
      const inView = clamp01((Math.min(bottom, vh) - Math.max(top, headerH)) / room);
      const dim = 0.34 * (1 - inView * inView * (3 - 2 * inView));
      if (Math.abs(dim - p.dim) > 0.004) {
        p.dim = dim;
        p.el.style.setProperty("--dim", dim.toFixed(3));
      }
    }
  });
}
