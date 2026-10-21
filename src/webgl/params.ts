/**
 * FineTune parameters — the single place where the hero's look is tuned
 * (spec §22). The ?debug=true panel writes into this object live.
 */
export interface FineTuneParams {
  refractionStrength: number;
  chromaticAberration: number;
  bloomStrength: number;
  bloomThreshold: number;
  focusDistance: number;
  focusRange: number;
  trailIntensity: number;
  trailSpeed: number;
  trailCount: number;
  parallaxStrength: number;
  mouseInfluence: number;
  noiseScale: number;
  noiseSpeed: number;
  glassIOR: number;
  fresnelStrength: number;
  exposure: number;
  sceneRotation: number;
  scrollInfluence: number;
  flareStrength: number;
}

export const params: FineTuneParams = {
  refractionStrength: 0.07,
  chromaticAberration: 0.0028,
  bloomStrength: 0.85,
  bloomThreshold: 0.9,
  focusDistance: 0.48,
  focusRange: 0.42,
  trailIntensity: 1.0,
  trailSpeed: 1.0,
  trailCount: 1.0, // multiplier on the quality preset's ribbon budget
  parallaxStrength: 0.45,
  mouseInfluence: 1.0,
  noiseScale: 1.2,
  noiseSpeed: 0.12,
  glassIOR: 1.45,
  fresnelStrength: 1.15,
  exposure: 0.92,
  sceneRotation: 0.1,
  scrollInfluence: 1.0,
  flareStrength: 1.0,
};

/** Slider ranges for the debug tuner: [min, max, step]. */
export const paramRanges: Record<keyof FineTuneParams, [number, number, number]> = {
  refractionStrength: [0, 0.25, 0.005],
  chromaticAberration: [0, 0.015, 0.0005],
  bloomStrength: [0, 2.5, 0.05],
  bloomThreshold: [0, 2, 0.05],
  focusDistance: [0, 1, 0.01],
  focusRange: [0.05, 1, 0.01],
  trailIntensity: [0, 3, 0.05],
  trailSpeed: [0, 3, 0.05],
  trailCount: [0.1, 1, 0.05],
  parallaxStrength: [0, 1.5, 0.05],
  mouseInfluence: [0, 3, 0.05],
  noiseScale: [0, 4, 0.05],
  noiseSpeed: [0, 1, 0.01],
  glassIOR: [1, 2.4, 0.01],
  fresnelStrength: [0, 3, 0.05],
  exposure: [0.2, 3, 0.05],
  sceneRotation: [-0.6, 0.6, 0.01],
  scrollInfluence: [0, 2, 0.05],
  flareStrength: [0, 3, 0.05],
};
