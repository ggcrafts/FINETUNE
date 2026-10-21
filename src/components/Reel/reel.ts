import { reel } from "../../data/reel";
import { onFrame, state } from "../../state";
import { damp } from "../../utils/lerp";
import { asset } from "../../utils/asset";
import { onLangChange, t } from "../../i18n/i18n";

/**
 * Reel strip — short clips sliding past like a marquee while they keep
 * playing. Two copies of the belt make the loop seamless. Slows down under
 * the pointer; pauses (videos + motion) when off screen or the tab is hidden.
 * Reduced motion: no sliding and no autoplay — a scrollable row of stills.
 */
const SPEED = 34; // px/s

export function initReel(): void {
  const root = document.querySelector<HTMLElement>("[data-reel]");
  if (!root) return;
  const belt = root.querySelector<HTMLElement>(".reel__belt");
  if (!belt) return;

  const tile = (i: number, copy: boolean): string => {
    const c = reel[i];
    return `
      <li class="reel__clip" ${copy ? 'aria-hidden="true"' : ""}>
        <video src="${asset(c.src)}" muted loop playsinline preload="metadata" ${copy ? 'tabindex="-1"' : ""}></video>
        <span class="reel__index t-mono-xs">${String(i + 1).padStart(2, "0")}</span>
        ${c.placeholder ? `<span class="media-pending reel__pending">${t("mediaPending")}</span>` : ""}
      </li>`;
  };
  const render = (): void => {
    const set = reel.map((_, i) => tile(i, false)).join("");
    const dup = reel.map((_, i) => tile(i, true)).join("");
    belt.innerHTML = set + dup;
    bind();
  };

  let videos: HTMLVideoElement[] = [];
  const bind = (): void => {
    videos = Array.from(belt.querySelectorAll("video"));
    videos.forEach((v) => {
      v.addEventListener("error", () => v.closest(".reel__clip")?.classList.add("is-missing"), { once: true });
      v.addEventListener("loadeddata", () => v.closest(".reel__clip")?.classList.add("is-ready"), { once: true });
    });
    sync();
  };

  let visible = false;
  const reduced = (): boolean => state.reducedMotion;
  const sync = (): void => {
    const play = visible && !document.hidden && !reduced() && !state.hold;
    videos.forEach((v) => {
      if (play) void v.play().catch(() => undefined);
      else v.pause();
    });
    root.classList.toggle("is-static", reduced());
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  }, { threshold: 0.05 }).observe(root);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("ft:hold", sync);
  onLangChange(render);
  render();

  let x = 0;
  let speed = SPEED;
  let hover = false;
  root.addEventListener("pointerenter", () => (hover = true));
  root.addEventListener("pointerleave", () => (hover = false));

  onFrame((s, dt) => {
    if (!visible || s.reducedMotion || s.hold) {
      if (s.reducedMotion && x !== 0) {
        x = 0;
        belt.style.transform = "";
      }
      return;
    }
    speed = damp(speed, hover ? SPEED * 0.25 : SPEED, 0.08, dt);
    const half = belt.scrollWidth / 2;
    if (half <= 0) return;
    x -= speed * dt;
    if (-x >= half) x += half;
    belt.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  });
}
