// -----------------------------------------------------------------------------
// trails.frag.glsl — ribbon light profile. Additive HDR output (bloom-ready).
// Hot white core, spectral halo, pulses travelling toward the head.
// -----------------------------------------------------------------------------

in float vT;
in float vSide;
in float vCoreFrac;
in float vNear;
in float vBright;
in vec4 vSeed;
in float vKind;
in float vPhase;

uniform float uTime;
uniform float uSpeed;
uniform float uMouseInfluence;

out vec4 fragColor;

void main() {
  float x = abs(vSide);
  float core = exp(-pow(x / vCoreFrac, 2.0) * 1.4);
  float halo = exp(-x * 5.0) * 0.24 + exp(-x * 1.6) * 0.035;

  // along the ribbon: long soft tail, crisp head
  float along = smoothstep(0.0, 0.6, vT) * (1.0 - smoothstep(0.965, 1.0, vT));
  if (vKind > 1.5) along = smoothstep(0.0, 0.85, vT) * (1.0 - smoothstep(0.97, 1.0, vT));
  else if (vKind > 0.5) along = smoothstep(0.0, 0.25, vT) * (1.0 - smoothstep(0.75, 1.0, vT));

  float freq = 10.0 + vSeed.z * 22.0;
  float pulse = 0.55 + 0.45 * sin(vT * freq - uTime * 2.2 * uSpeed + vSeed.w * TAU);
  pulse = mix(1.0, pulse, 0.7);

  vec3 tint = spectral(vSeed.x * 0.9 + vT * 0.45 + uTime * 0.015);
  vec3 col = mix(tint * tint * 1.35, vec3(1.0, 0.97, 0.93), core * 0.28);
  // radial streaks: white-hot as they leave the crystal, spectral as they travel
  if (vKind > 1.5) col = mix(vec3(1.0, 0.93, 0.85), tint * 1.2, smoothstep(0.0, 0.35, vPhase) * 0.8 + 0.2);

  float boost = 1.0 + vNear * 1.1 * uMouseInfluence;
  float I = (core * 1.25 + halo) * along * pulse * vBright * boost;
  fragColor = vec4(col * I, 1.0);
}
