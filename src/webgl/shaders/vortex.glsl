// -----------------------------------------------------------------------------
// vortex.glsl — shared shape of the light vortex (used by trails + particles).
// Uniforms expected by includers:
//   uTime, uSpeed, uScroll (0..1 hero progress × scrollInfluence),
//   uPointer (world point on the z=0 plane), uMouseInfluence, uNoiseScale, uNoiseSpeed
// -----------------------------------------------------------------------------

// Accretion-disc orientation: nearly edge-on, slightly rolled — like the
// approved hero art. Scroll "aligns" the disc fully edge-on (spec §21).
vec3 discOrient(vec3 p, float tiltJitter) {
  float align = smoothstep(0.25, 0.95, uScroll);
  float tilt = mix(0.30 + tiltJitter, 0.02 + tiltJitter * 0.15, align); // rotation about X
  float roll = mix(-0.20, -0.02, align);                                 // rotation about Z
  float ct = cos(tilt), st = sin(tilt);
  p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
  float cr = cos(roll), sr = sin(roll);
  p = vec3(p.x * cr - p.y * sr, p.x * sr + p.y * cr, p.z);
  // trails converge toward the transition boundary as the hero resolves
  p.y -= align * 1.25;
  p.x *= 1.0 + align * 0.45;
  return p;
}

// Gravitational bend toward the pointer + intensity proximity.
vec3 pointerBend(vec3 p, out float near) {
  vec2 d = uPointer.xy - p.xy;
  float dist2 = dot(d, d);
  near = exp(-dist2 / 1.6);
  float pull = exp(-dist2 / 2.4) * 0.22 * uMouseInfluence;
  p.xy += normalize(d + 1e-4) * pull * smoothstep(0.0, 0.6, sqrt(dist2));
  return p;
}

vec3 microNoise(vec3 p) {
  float t = uTime * uNoiseSpeed;
  return vec3(
    snoise(p * uNoiseScale * 0.35 + vec3(0.0, t, 0.0)),
    snoise(p * uNoiseScale * 0.35 + vec3(7.1, -t, 3.3)),
    snoise(p * uNoiseScale * 0.35 + vec3(-4.2, 1.7, t))
  ) * 0.07;
}
