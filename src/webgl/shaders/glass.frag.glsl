// -----------------------------------------------------------------------------
// glass.frag.glsl — smoked crystal with screen-space refraction + dispersion.
// Purpose : refracts the light-trail buffer through the surface normal, splits
//           R/G/B by wavelength (crystal dispersion, spec §50-D) and adds a
//           Fresnel-driven thin-film iridescence strongest at grazing angles.
// Uniforms: uScene (trail buffer, mipmapped: lod 0 sharp, lod 3 frosted), uView, uCamPos,
//           uRefraction, uIOR, uFresnel, uTime, uPointerScreen
// Cost    : 5 texture reads + 2 specular lobes + 3 line bands per fragment.
// -----------------------------------------------------------------------------

in vec3 vWorldPos;
in vec3 vNormal;
in vec3 vLocal;
in vec4 vClip;
in float vEdge;

uniform sampler2D uScene;
uniform mat4 uView;
uniform vec3 uCamPos;
uniform float uRefraction;
uniform float uIOR;
uniform float uFresnel;
uniform float uTime;
uniform vec2 uPointerScreen;
uniform float uShape; // 0 = twisted column, 1 = crystal

out vec4 fragColor;

// ---- crystal: the gem at the centre of the galaxy ---------------------------
// Strong screen-space lensing (the light field bends around the core like a
// small black hole), wide wavelength dispersion, a dark heart, facet glints
// and bright rolled edges (curvature from screen-space normal derivatives).
vec3 crystal(vec3 N, vec3 V, vec2 uv, vec3 Nv, float F, float ndv) {
  vec2 lean = (uPointerScreen - uv) * 0.03;
  float k = uRefraction * (uIOR - 1.0) * 4.2;
  // lensing grows toward the centre of the silhouette (ndv → 1)
  vec2 off = -Nv.xy * k * (0.7 + ndv * 0.9) + lean;

  vec3 refr;
  refr.r = texture(uScene, uv + off * 0.78).r;
  refr.g = texture(uScene, uv + off * 1.00).g;
  refr.b = texture(uScene, uv + off * 1.30).b;
  // a second, mirrored internal bounce — facets reflect the far side of the disc
  vec2 off2 = Nv.xy * k * 1.6;
  vec3 bounce;
  bounce.r = texture(uScene, uv + off2 * 0.85).r;
  bounce.g = texture(uScene, uv + off2 * 1.00).g;
  bounce.b = texture(uScene, uv + off2 * 1.2).b;
  vec3 frosted = textureLod(uScene, uv + off * 1.6, 3.0).rgb;

  // dark heart: the centre swallows light, the rim gives it back
  // clear crystal: the light field shows through, a little darker at the heart
  float heart = smoothstep(0.45, 0.98, ndv);
  vec3 interior = (refr * 0.5 + bounce * 0.18 + frosted * 0.03) * mix(1.0, 0.25, heart)
                * vec3(0.86, 0.9, 1.0) + vec3(0.002, 0.003, 0.008);

  // inner glitter: specks fixed in the crystal that twinkle as it turns
  vec3 cell = floor(vLocal * 26.0);
  float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float tw = 0.5 + 0.5 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
  vec3 fl = fract(vLocal * 26.0) - 0.5;
  float speck = step(0.93, h) * smoothstep(0.22, 0.0, length(fl)) * tw * tw;
  interior += speck * mix(vec3(1.0), spectral(h * 3.0), 0.5) * 2.2;

  // thin-film iridescence on grazing facets
  vec3 film = spectral(F * 1.6 + N.y * 0.3 + N.x * 0.2 + uTime * 0.03);

  // rolled edges: where the normal turns quickly, the edge catches light
  float curv = clamp(length(fwidth(N)) * 7.0, 0.0, 1.0);
  vec3 edge = spectral(N.x * 0.6 + N.y * 0.4 + uTime * 0.05) * curv * 0.9 + vec3(curv * curv) * 1.6;

  // facet glints from several key lights (sharp: flat facets flash as it turns)
  vec3 R = reflect(-V, N);
  float g1 = pow(max(dot(R, normalize(vec3(0.3, 1.0, 0.4))), 0.0), 260.0);
  float g2 = pow(max(dot(R, normalize(vec3(-0.9, 0.2, 0.45))), 0.0), 180.0);
  float g3 = pow(max(dot(R, normalize(vec3(0.7, -0.4, 0.6))), 0.0), 220.0);
  float g4 = pow(max(dot(R, normalize(vec3(0.0, 0.1, 1.0))), 0.0), 90.0) * 0.35;
  vec3 glints = g1 * vec3(1.0, 0.97, 0.92) * 4.0 + g2 * vec3(0.7, 0.85, 1.0) * 2.6
              + g3 * vec3(1.0, 0.75, 0.9) * 2.4 + g4 * vec3(0.9, 0.95, 1.0);

  // crisp facet edges: thin white-hot lines with a spectral fringe
  float e = smoothstep(0.55, 1.0, vEdge);
  vec3 lines = vec3(1.0, 0.97, 0.94) * e * 1.3 + spectral(vLocal.y * 0.8 + uTime * 0.04) * smoothstep(0.15, 0.6, vEdge) * 0.3;

  return interior + film * F * uFresnel * 0.85 + edge * (0.15 + F * 0.4) + glints + lines * (0.45 + F * 0.8);
}

void main() {
  if (uShape > 0.5) {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    if (!gl_FrontFacing) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float F = pow(1.0 - ndv, 2.6);
    vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;
    vec3 Nv = normalize((uView * vec4(N, 0.0)).xyz);
    fragColor = vec4(crystal(N, V, uv, Nv, F, ndv), 1.0);
    return;
  }

  // Fade toward both ends: the core dissolves into the beam. The glass is
  // drawn opaque (it owns the depth) and blends to the unrefracted light
  // behind it, so there is no visible seam where the fade begins.
  float fade = (1.0 - smoothstep(0.9, 4.2, vLocal.y)) * smoothstep(-4.0, -1.25, vLocal.y);

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  if (!gl_FrontFacing) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float F = pow(1.0 - ndv, 3.0);

  vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;
  vec3 Nv = normalize((uView * vec4(N, 0.0)).xyz);
  vec3 behind = texture(uScene, uv).rgb;

  // Pointer leans the refraction centre (kept subtle).
  vec2 lean = (uPointerScreen - uv) * 0.018;
  float k = uRefraction * (uIOR - 1.0) * 2.4;
  vec2 off = -Nv.xy * k + lean;

  float r = texture(uScene, uv + off * 0.90).r;
  float g = texture(uScene, uv + off * 1.00).g;
  float b = texture(uScene, uv + off * 1.14).b;
  vec3 refr = vec3(r, g, b);
  vec3 frosted = textureLod(uScene, uv + off * 1.5, 3.0).rgb;

  // clear, dark glass: mostly the refracted light field
  vec3 interior = mix(refr * 0.8, frosted * 0.45, 0.18) * vec3(0.82, 0.88, 1.0) + vec3(0.003, 0.006, 0.014);

  // thin-film iridescence only at grazing angles
  vec3 film = spectral(F * 1.4 + N.y * 0.22 + vLocal.y * 0.18 + uTime * 0.025);

  vec3 L1 = normalize(vec3(0.15, 1.0, 0.35));
  vec3 L2 = normalize(vec3(-0.9, 0.05, 0.5));
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 140.0) * 2.6;
  float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 48.0) * 0.6;

  // Lines of light running along the twisted lobes — the form reads as
  // light being shaped (galaxy filaments) rather than a solid object.
  float ang = atan(vLocal.z, vLocal.x);
  float p1 = ang * 3.0 + vLocal.y * 4.05;            // follows the geometry's twist (3 lobes × 1.35)
  float p2 = ang * 5.0 - vLocal.y * 1.7;
  float l1 = pow(abs(sin(p1 * 2.0 - uTime * 0.45)), 70.0);
  float l2 = pow(abs(sin(p2 * 1.5 + uTime * 0.3)), 120.0);
  float l3 = pow(abs(sin(p1 * 7.0 + uTime * 0.2)), 160.0) * 0.6;
  vec3 lineCol = spectral(p1 * 0.05 + vLocal.y * 0.12 + uTime * 0.02);
  vec3 lines = (l1 * mix(lineCol, vec3(1.0, 0.97, 0.94), 0.45) * 2.2
              + l2 * lineCol * 1.4
              + l3 * vec3(0.85, 0.9, 1.0) * 1.2) * (0.35 + F * 1.2);

  vec3 glass = interior;
  glass += film * F * uFresnel * 0.9;
  glass += (s1 + s2) * vec3(1.0, 0.96, 0.9);

  // body fades into the beam; its light lines persist a little longer (threads)
  vec3 col = mix(behind, glass, fade) + lines * mix(fade, 1.0, 0.35) * smoothstep(0.0, 0.25, fade + 0.12);
  fragColor = vec4(col, 1.0);
}
