/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent damping — the eased pointer follow from spec §13
 * (`current += (target - current) * 0.06` at 60 fps).
 */
export const damp = (current: number, target: number, factor: number, dt: number): number =>
  lerp(current, target, 1 - Math.pow(1 - factor, dt * 60));
