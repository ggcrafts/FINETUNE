// -----------------------------------------------------------------------------
// blackhole.frag.glsl — the "Let's talk" exit: a luminous black hole in the
// hero's optical language (spectral accretion disc, photon ring, lensing glow).
// Uniforms: uRes (px), uCenter (px, y down), uRadius (event horizon, px),
//           uTime, uIntensity (0…1), uFlash (0…1 final collapse)
// Output  : premultiplied RGBA over the dissolving page.
// -----------------------------------------------------------------------------

in vec2 vUv;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTime;
uniform float uIntensity;
uniform float uFlash;
out vec4 fragColor;

void main() {
  vec2 frag = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 d = frag - uCenter;
  float r = max(uRadius, 1.0);
  float dist = length(d);
  float ang = atan(d.y, d.x);

  // tilted accretion disc: squash + rotate
  float tilt = -0.21;
  vec2 q = vec2(d.x * cos(tilt) - d.y * sin(tilt), d.x * sin(tilt) + d.y * cos(tilt));
  q.y *= 3.4;
  float qd = length(q) / r;
  float qa = atan(q.y, q.x);

  // disc: spiral streaks swirling inward (log spiral), brighter on the approaching side
  float spiral = sin(qa * 3.0 + log(max(qd, 1e-3)) * 9.0 - uTime * 2.6);
  float streaks = 0.55 + 0.45 * spiral;
  float band = smoothstep(1.25, 1.7, qd) * (1.0 - smoothstep(2.4, 5.2, qd));
  float doppler = 0.55 + 0.45 * cos(qa + 0.6);
  vec3 discCol = spectral(qa / 6.2831 + qd * 0.12 + uTime * 0.05);
  vec3 disc = mix(discCol, vec3(1.0, 0.95, 0.9), 0.35) * band * streaks * doppler * 1.8;

  // photon ring hugging the horizon
  float ring = exp(-pow((dist / r - 1.06) * 18.0, 2.0)) * 2.4;
  vec3 ringCol = mix(spectral(ang / 6.2831 + uTime * 0.08), vec3(1.0), 0.5) * ring;

  // soft lensing glow
  float glow = exp(-max(dist - r, 0.0) / (r * 1.6)) * 0.55;
  vec3 glowCol = vec3(0.55, 0.62, 1.0) * glow;

  vec3 col = (disc + ringCol + glowCol) * uIntensity;

  // event horizon: true black, slightly feathered
  float horizon = 1.0 - smoothstep(r * 0.96, r * 1.0, dist);
  col *= 1.0 - horizon;

  // final collapse flash
  col += vec3(1.0, 0.98, 0.95) * uFlash * exp(-dist / (r * 0.6 + 40.0)) * 3.0;

  col = aces(col);
  float a = clamp(max(max(col.r, col.g), col.b) * 1.2 + horizon, 0.0, 1.0);
  fragColor = vec4(col, a);
}
