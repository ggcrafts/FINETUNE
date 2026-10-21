import type { Quality } from "../state";

/** Adaptive quality presets (spec §38). */
export interface QualityPreset {
  /** canvas resolution multiplier on top of the (capped) device pixel ratio */
  scale: number;
  ribbons: number;
  segments: number;
  particles: number;
  bloomLevels: number;
  /** resolution of the refraction source pass relative to the main pass */
  refractionScale: number;
  focus: boolean;
  /** MSAA samples for the main pass (0 = off) — keeps thin beams clean */
  msaa: number;
}

export const QUALITY: Record<Quality, QualityPreset> = {
  low: { scale: 0.6, ribbons: 70, segments: 64, particles: 220, bloomLevels: 3, refractionScale: 0.35, focus: false, msaa: 0 },
  medium: { scale: 0.8, ribbons: 120, segments: 80, particles: 420, bloomLevels: 4, refractionScale: 0.5, focus: true, msaa: 2 },
  high: { scale: 1.0, ribbons: 180, segments: 112, particles: 700, bloomLevels: 5, refractionScale: 0.5, focus: true, msaa: 4 },
  ultra: { scale: 1.0, ribbons: 240, segments: 140, particles: 1000, bloomLevels: 6, refractionScale: 0.75, focus: true, msaa: 4 },
};

export function downgrade(q: Quality): Quality {
  return q === "ultra" ? "high" : q === "high" ? "medium" : "low";
}
