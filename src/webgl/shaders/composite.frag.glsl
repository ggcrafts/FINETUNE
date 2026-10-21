// -----------------------------------------------------------------------------
// composite.frag.glsl — final optical finishing (spec §65 order):
//   focus band → bloom → radial chromatic aberration + pointer lens → tonemap.
// Uniforms: uScene, uBloom, uSoft (low-res copy for the focus band),
//           uBloomStrength, uExposure, uCA, uFocusY, uFocusRange, uFocusOn,
//           uPointerUv, uTime, uResolution
// -----------------------------------------------------------------------------

in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uSoft;
uniform vec2 uSoftTexel;
uniform sampler2D uSoft2;   // 1/8 res — the deepest defocus
uniform vec2 uSoft2Texel;
uniform vec2 uFocusCenter;  // screen uv of the crystal (point of interest)
uniform float uFocusRadius;
uniform vec3 uFlare;        // xy: screen uv of the core flare, z: strength (0 = off)
uniform float uBloomStrength;
uniform float uExposure;
uniform float uCA;
uniform float uFocusY;
uniform float uFocusRange;
uniform float uFocusOn;
uniform vec2 uPointerUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uCopyFade; // (x where light starts to recede, x where it is full) — keeps copy readable
out vec4 fragColor;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Optical lens cursor: a small refraction field around the pointer (spec §50-A)
  vec2 dp = (uv - uPointerUv) * vec2(aspect, 1.0);
  float lens = exp(-dot(dp, dp) / 0.012);
  uv -= dp / vec2(aspect, 1.0) * lens * 0.025;

  // radial chromatic aberration, stronger at edges and inside the lens
  vec2 d = uv - 0.5;
  float ca = uCA * (0.35 + dot(d, d) * 3.0 + lens * 1.0);
  vec3 sharp;
  sharp.r = texture(uScene, uv - d * ca * 1.0).r;
  sharp.g = texture(uScene, uv).g;
  sharp.b = texture(uScene, uv + d * ca * 1.2).b;

  // Depth of field: the system chooses what to observe (spec §20).
  // Sharp around the crystal, defocusing with distance from it — a tilt-shift
  // band through its height combined with a radial falloff — in two depths.
  float band = smoothstep(uFocusRange * 0.25, uFocusRange, abs(uv.y - uFocusY));
  vec2 fc = (uv - uFocusCenter) * vec2(aspect, 1.0);
  float radial = smoothstep(uFocusRadius * 1.15, uFocusRadius * 4.0, length(fc));
  float blur = clamp(max(band, radial * 0.9) * uFocusOn, 0.0, 1.0);

  vec2 o = uSoftTexel;
  vec3 soft = texture(uSoft, uv).rgb * 4.0;
  soft += (texture(uSoft, uv + vec2(o.x, 0.0)).rgb + texture(uSoft, uv - vec2(o.x, 0.0)).rgb
         + texture(uSoft, uv + vec2(0.0, o.y)).rgb + texture(uSoft, uv - vec2(0.0, o.y)).rgb) * 2.0;
  soft += texture(uSoft, uv + o).rgb + texture(uSoft, uv - o).rgb
        + texture(uSoft, uv + vec2(o.x, -o.y)).rgb + texture(uSoft, uv + vec2(-o.x, o.y)).rgb;
  soft /= 16.0;
  vec2 o2 = uSoft2Texel * 1.25;
  vec3 deep = texture(uSoft2, uv).rgb * 4.0;
  deep += (texture(uSoft2, uv + vec2(o2.x, 0.0)).rgb + texture(uSoft2, uv - vec2(o2.x, 0.0)).rgb
         + texture(uSoft2, uv + vec2(0.0, o2.y)).rgb + texture(uSoft2, uv - vec2(0.0, o2.y)).rgb) * 2.0;
  deep += texture(uSoft2, uv + o2).rgb + texture(uSoft2, uv - o2).rgb
        + texture(uSoft2, uv + vec2(o2.x, -o2.y)).rgb + texture(uSoft2, uv + vec2(-o2.x, o2.y)).rgb;
  deep /= 16.0;
  // crispness: a small unsharp mask on the in-focus field (4 neighbours, 1 px)
  vec2 px = 1.0 / uResolution;
  vec3 nb = (texture(uScene, uv + vec2(px.x, 0.0)).rgb + texture(uScene, uv - vec2(px.x, 0.0)).rgb
           + texture(uScene, uv + vec2(0.0, px.y)).rgb + texture(uScene, uv - vec2(0.0, px.y)).rgb) * 0.25;
  sharp = max(sharp + (sharp - nb) * 0.55 * (1.0 - blur), 0.0);
  vec3 col = mix(sharp, soft, smoothstep(0.08, 0.6, blur));
  col = mix(col, deep, smoothstep(0.45, 1.0, blur) * 0.9);

  col += texture(uBloom, uv).rgb * uBloomStrength;

  // Core flare: the white-hot burst where the crystal splits the light —
  // hot centre, warm glow, a thin anamorphic streak and a few star rays.
  if (uFlare.z > 0.0) {
    vec2 fp = (vUv - uFlare.xy) * vec2(aspect, 1.0);
    float fr = length(fp);
    float fa = atan(fp.y, fp.x);
    float pulse = 0.85 + 0.15 * sin(uTime * 0.9);
    vec3 flare = vec3(1.0, 0.95, 0.88) * exp(-fr * fr / 0.0009) * 2.6
               + vec3(1.0, 0.72, 0.5) * exp(-fr * fr / 0.012) * 0.55
               + vec3(0.75, 0.55, 1.0) * exp(-fr / 0.16) * 0.12;
    float streak = exp(-abs(fp.y) * 260.0) * exp(-abs(fp.x) * 6.5);
    flare += vec3(0.55, 0.85, 1.0) * streak * 0.9;
    float rays = pow(abs(cos(fa * 3.0 + uTime * 0.05)), 90.0) + pow(abs(cos(fa * 5.0 - 0.6)), 160.0) * 0.6;
    flare += vec3(1.0, 0.9, 0.8) * rays * exp(-fr * 9.0) * 0.7;
    col += flare * uFlare.z * pulse;
  }
  // real-time hierarchy rule (spec §66): light recedes behind the copy column
  col *= mix(0.28, 1.0, smoothstep(uCopyFade.x, uCopyFade.y, vUv.x));
  // gentle saturation lift before tonemapping keeps the spectrum alive in highlights
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(luma), col, 1.3), 0.0);
  col = aces(col * uExposure);

  // vignette + fine grain (dithers gradients, no banding)
  float vig = smoothstep(1.15, 0.35, length(d * vec2(aspect * 0.75, 1.0)));
  col *= mix(0.55, 1.0, vig);
  col = pow(col, vec3(1.0 / 2.2));
  // film grain: very light, animated, a touch stronger in the shadows
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float grain = hash12(gl_FragCoord.xy + fract(uTime * 7.3) * 113.0) - 0.5;
  col += grain * (0.038 + 0.014 * (1.0 - lum)); // +2% grain (round 7)
  fragColor = vec4(col, 1.0);
}
