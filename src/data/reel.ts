/**
 * Reel excerpts — short WebM loops shown in the sliding strip after the hero.
 *
 * To use your own clips: drop them in public/assets/reel/ with these names
 * (or edit the list). Keep them short (3–6 s), silent, ~480–720 px wide,
 * VP9/WebM, ideally under 1.5 MB each. `placeholder: true` shows the
 * "media pending" tag — set it to false once a real clip is in place.
 */
export interface ReelClip {
  src: string;
  label: string;
  placeholder: boolean;
}

// Excerpts cut from Luiz's motion reel (2020) and campaign pieces:
// 01 logo bursts · 02 VR Notepack 3D · 03 tunnel + HUD · 04 projection mapping
// 05 3D mascot · 06 Cleopatra parallax · 07 YES! Idiomas · 08 GGCRAFTS portal
export const reel: ReelClip[] = Array.from({ length: 8 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { src: `assets/reel/clip-${n}.webm`, label: `Clip ${n}`, placeholder: false };
});
