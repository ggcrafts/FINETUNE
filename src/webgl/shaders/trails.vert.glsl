// -----------------------------------------------------------------------------
// trails.vert.glsl — procedural light ribbons (instanced triangle strips).
// Purpose : every ribbon is evaluated on the GPU from a seed: orbital arcs that
//           spiral into the core (kind 0), twisted beams along the vertical
//           axis (kind 1) and radial streaks bursting out of the crystal (kind 2). Expanded to constant-pixel-width quads in screen space.
// Uniforms: uProj, uView, uLensShift, uResolution, uPixelRatio, uIntensity
//           + vortex.glsl uniforms.
// Cost    : 2 curve evaluations per vertex; ribbons × segments × 2 vertices.
// Fallback: if this fails to compile, HeroScene keeps the static poster.
// -----------------------------------------------------------------------------

layout(location = 0) in vec2 aStrip;  // x: t along ribbon (0 tail → 1 head), y: side (-1 | 1)
layout(location = 1) in vec4 aSeed;   // per ribbon random values
layout(location = 2) in vec4 aShape;  // kind, radius, span (rad) | turns, core width (px)

uniform mat4 uProj;
uniform mat4 uView;
uniform vec2 uLensShift;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uIntensity;
uniform float uTime;
uniform float uSpeed;
uniform float uScroll;
uniform vec3 uPointer;
uniform float uMouseInfluence;
uniform float uNoiseScale;
uniform float uNoiseSpeed;

out float vT;
out float vSide;
out float vCoreFrac;
out float vNear;
out float vBright;
out vec4 vSeed;
out float vKind;
out float vPhase;

#include_vortex

float align0() { return smoothstep(0.25, 0.95, uScroll); }

// travel phase of a radial streak (0 = leaving the crystal, 1 = gone)
float rayPhase() {
  return fract(aSeed.z * 7.13 + uTime * uSpeed * (0.05 + aSeed.w * 0.07));
}

vec3 ribbonPoint(float t, out float near) {
  vec3 p;
  if (aShape.x > 1.5) {
    // Radial streak: leaves the crystal and races outward, slightly swirled.
    // Directions favour the disc plane and the open (left / upper) side.
    float az = aSeed.x * TAU;
    float el = (aSeed.y - 0.5) * 1.1;
    vec3 d = vec3(cos(az) * cos(el), sin(el), sin(az) * cos(el));
    d.x -= 0.35;
    d.z = d.z > 0.0 ? d.z * 0.3 : d.z; // few rays fly at the lens
    d = normalize(d);
    float ph = rayPhase();
    float r = aShape.y + ph * 10.0 + (t - 1.0) * aShape.z * (0.35 + ph);
    r = max(r, aShape.y);
    float swirl = r * 0.06 * (aSeed.w - 0.5);
    float cs = cos(swirl), sn = sin(swirl);
    d.xz = mat2(cs, -sn, sn, cs) * d.xz;
    p = d * r;
    p = discOrient(p, 0.0) * vec3(1.0, 0.8, 1.0);
    p.y += align0() * 1.25; // keep rays centred on the core while the disc aligns
  } else if (aShape.x < 0.5) {
    // Orbital arc: inner orbits move faster (gravitational feel, spec §18)
    float R = aShape.y;
    float omega = uSpeed * 0.32 / sqrt(R);
    float theta = aSeed.x * TAU + uTime * omega + (t - 1.0) * aShape.z;
    float r = R * (1.0 + 0.22 * (1.0 - t)) * (1.0 + 0.06 * sin(2.0 * theta + aSeed.w * TAU));
    float h = (aSeed.z - 0.5) * 0.18 * sqrt(R);
    p = vec3(cos(theta) * r, h, sin(theta) * r);
    p = discOrient(p, (aSeed.y - 0.5) * 0.22);
  } else {
    // Twisted beam through the core: a funnel helix (narrow at the waist)
    float y = mix(-5.5, 6.0, t);
    float funnel = 0.18 + 0.55 * smoothstep(0.0, 5.0, abs(y - 0.2));
    float phi = aSeed.x * TAU + t * aShape.z * TAU + uTime * uSpeed * 0.45;
    float r = aShape.y * funnel;
    p = vec3(cos(phi) * r, y, sin(phi) * r);
    float align = smoothstep(0.25, 0.95, uScroll);
    p.xz *= 1.0 - align * 0.8;
  }
  p += microNoise(p);
  return pointerBend(p, near);
}

vec4 project(vec3 p) {
  vec4 c = uProj * uView * vec4(p, 1.0);
  c.xy += uLensShift * c.w; // off-axis framing (lens shift)
  return c;
}

void main() {
  float t = aStrip.x;
  float side = aStrip.y;
  float near0;
  float near1;
  vec3 p0 = ribbonPoint(t, near0);
  vec3 p1 = ribbonPoint(min(t + 0.006, 1.0) - (t > 0.994 ? 0.006 : 0.0), near1);

  vec4 c0 = project(p0);
  vec4 c1 = project(p1);
  vec2 halfRes = uResolution * 0.5;
  vec2 s0 = c0.xy / c0.w * halfRes;
  vec2 s1 = c1.xy / c1.w * halfRes;
  vec2 dir = s1 - s0;
  dir = length(dir) > 1e-4 ? normalize(dir) : vec2(1.0, 0.0);
  if (t > 0.994) dir = -dir;
  vec2 n = vec2(-dir.y, dir.x);

  // constant pixel width, gently attenuated by depth
  float depthScale = clamp(7.5 / c0.w, 0.45, 1.8);
  // never thinner than ~1 device px — sub-pixel lines shimmer and alias
  float core = max(aShape.w * depthScale, 1.0) * uPixelRatio;
  float halfWidth = core * 6.0;
  c0.xy += n * side * halfWidth / halfRes * c0.w;

  gl_Position = c0;
  vT = t;
  vSide = side;
  vCoreFrac = core / halfWidth;
  vNear = near0;
  vSeed = aSeed;
  vKind = aShape.x;
  vPhase = aShape.x > 1.5 ? rayPhase() : 0.0;
  // a few hero ribbons carry most of the energy, the rest is atmosphere
  float hero = pow(aSeed.y, 5.0);
  vBright = uIntensity * (0.1 + hero * 1.7) * (aShape.x > 1.5 ? 1.0 : aShape.x > 0.5 ? 0.24 : 1.0);
  if (aShape.x > 1.5) {
    // streaks flare as they leave the crystal and fade as they travel
    float ph = vPhase;
    vBright = uIntensity * (0.35 + pow(aSeed.x, 4.0) * 1.4) * smoothstep(0.0, 0.06, ph) * pow(1.0 - ph, 1.6) * 1.6;
  }
}
