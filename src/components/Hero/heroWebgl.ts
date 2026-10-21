import { state } from "../../state";
import { supportsWebGL } from "../../utils/device";
import type { HeroScene } from "../../webgl/hero/HeroScene";

let scene: HeroScene | null = null;

/**
 * Mounts the live optical system into the hero. The approved poster stays in
 * the DOM underneath as the static / no-WebGL / context-loss fallback, so a
 * failure can never produce a black hero (spec §41).
 */
export async function initHeroWebgl(): Promise<HeroScene | null> {
  const hero = document.querySelector<HTMLElement>("[data-section='hero']");
  const slot = hero?.querySelector<HTMLElement>("[data-webgl-slot='hero']");
  if (!hero || !slot || !supportsWebGL()) return null;

  try {
    // Loaded lazily so the copy and poster paint before any GPU work (LCP).
    const { HeroScene } = await import("../../webgl/hero/HeroScene");
    scene = new HeroScene(slot, state.quality, {
      onFirstFrame: () => hero.classList.add("is-live"),
      onFail: (reason) => {
        hero.classList.remove("is-live");
        if (import.meta.env?.DEV) console.warn("[FineTune] hero fallback:", reason);
      },
    });
    return scene;
  } catch (err) {
    hero.classList.remove("is-live");
    if (import.meta.env?.DEV) console.error("[FineTune] WebGL hero failed, using poster:", err);
    return null;
  }
}

export function getHeroScene(): HeroScene | null {
  return scene;
}
