import { onLangChange } from "../../i18n/i18n";

/**
 * Fields of Practice — single-open accordion.
 * Hover (pointer devices, with a short intent delay) or focus/click activates a
 * row; the preview surface refocuses on the matching image (blur → focus).
 *
 * Layout stability: every open panel gets the same height — the tallest
 * panel's natural height (`--panel-h`) — and opening/closing animate height
 * with the same curve, so the closing row gives back exactly what the opening
 * row takes. The list (and the page) never changes size while browsing.
 */
export function initPractices(): void {
  const root = document.querySelector<HTMLElement>("[data-practices]");
  if (!root) return;

  const list = root.querySelector<HTMLElement>(".practices__list");
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-practice]"));
  const previews = Array.from(root.querySelectorAll<HTMLImageElement>("[data-preview]"));
  const indexLabel = root.querySelector<HTMLElement>("[data-preview-index]");
  const inners = Array.from(root.querySelectorAll<HTMLElement>(".practice__inner"));
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---- equal panel height -------------------------------------------------
  const measure = (): void => {
    if (!list) return;
    let max = 0;
    for (const el of inners) max = Math.max(max, el.offsetHeight);
    if (max > 0) list.style.setProperty("--panel-h", `${Math.ceil(max)}px`);
  };
  measure();
  const ro = new ResizeObserver(measure);
  inners.forEach((el) => ro.observe(el));
  onLangChange(() => requestAnimationFrame(measure));
  // first measure is instant (no animation on load)
  requestAnimationFrame(() => root.classList.add("is-ready"));

  // ---- activation -----------------------------------------------------------
  let active = rows.findIndex((r) => r.classList.contains("is-active"));
  if (active < 0) active = 0;

  const sync = (): void => {
    rows.forEach((row, i) => {
      const isActive = i === active;
      row.classList.toggle("is-active", isActive);
      const trigger = row.querySelector<HTMLButtonElement>(".practice__trigger");
      const panel = row.querySelector<HTMLElement>(".practice__panel");
      trigger?.setAttribute("aria-expanded", String(isActive));
      if (panel) {
        panel.hidden = false;
        panel.inert = !isActive;
        panel.setAttribute("aria-hidden", String(!isActive));
      }
    });
    previews.forEach((img, i) => img.classList.toggle("is-active", i === active));
    if (indexLabel) indexLabel.textContent = String(active + 1).padStart(2, "0");
  };

  const activate = (next: number): void => {
    if (next === active) return;
    active = next;
    sync();
  };
  sync();

  // hover intent: rows move while animating, so a pass-through must not flip them
  let pending = 0;
  rows.forEach((row, i) => {
    const trigger = row.querySelector<HTMLButtonElement>(".practice__trigger");
    trigger?.addEventListener("click", () => activate(i));
    trigger?.addEventListener("focus", () => activate(i));
    if (canHover) {
      row.addEventListener("pointerenter", () => {
        window.clearTimeout(pending);
        pending = window.setTimeout(() => activate(i), 140);
      });
      row.addEventListener("pointerleave", () => window.clearTimeout(pending));
    }
  });
}
