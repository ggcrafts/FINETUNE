// -----------------------------------------------------------------------------
// particles.vert.glsl — sparse dust caught in the vortex (spec: no giant clouds).
// Shares the disc orientation with the ribbons so the system reads as one field.
// -----------------------------------------------------------------------------

layout(location = 0) in vec4 aSeed;

uniform mat4 uProj;
uniform mat4 uView;
uniform vec2 uLensShift;
uniform float uPixelRatio;
uniform float uTime;
uniform float uSpeed;
uniform float uScroll;
uniform vec3 uPointer;
uniform float uMouseInfluence;
uniform float uNoiseScale;
uniform float uNoiseSpeed;

out float vTwinkle;
out float vHue;
out float vNear;

#include_vortex

void main() {
  float R = 0.7 + pow(aSeed.x, 1.6) * 6.5;
  float theta = aSeed.y * TAU + uTime * uSpeed * 0.32 / sqrt(R);
  float h = (aSeed.z - 0.5) * 0.35 * sqrt(R);
  vec3 p = vec3(cos(theta) * R, h, sin(theta) * R);
  p = discOrient(p, (aSeed.w - 0.5) * 0.25);
  p += microNoise(p) * 2.0;
  float near;
  p = pointerBend(p, near);

  vec4 c = uProj * uView * vec4(p, 1.0);
  c.xy += uLensShift * c.w; // off-axis framing (lens shift)
  gl_Position = c;
  float size = (0.8 + pow(aSeed.w, 6.0) * 4.0) * uPixelRatio * clamp(8.0 / c.w, 0.5, 2.0);
  gl_PointSize = size * (1.0 + near * 0.8);
  vTwinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed.z * 2.5) + aSeed.x * 40.0), 3.0);
  vHue = aSeed.z;
  vNear = near;
}
