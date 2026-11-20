// FineTune — the gate knob: a small raymarched metal knob with a push button in its centre.
//
// The outer ring is a knurled, lathe-brushed aluminium dial that turns with the gate needle
// (it points at the discipline under the cursor, with a green index line). The centre is a
// fixed polished push button with the FineTune mark and word engraved into it. Everything is
// one fragment shader on a small canvas of its own; it renders only while the gate is shown.
//
//   const knob = createKnob(canvas, { motion });
//   knob.set({ angle, tiltX, tiltY, hover, press, glow });   // targets, eased inside
//   knob.frame(dt);  knob.stop();
//
// Engraving: a 2D canvas mask (R = crisp lettering, G = green square, B = blurred lettering for
// the groove normals). Performance: ≤ 520×520 px, 80 raymarch steps with a bounding-sphere skip.

const VS = `#version 300 es
in vec2 aP; out vec2 vUv; void main(){ vUv = aP; gl_Position = vec4(aP, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uMask, uRing;
uniform vec3 uLed;
uniform float uTime, uAng, uLag, uPress, uHover, uGlow;
uniform vec2 uTilt, uLight;

const float PI = 3.14159265;
const float H  = 0.24;    // half height of the knob body
const float RB = 0.56;    // push-button (cap) radius
const float RC = 0.69;    // channel radius: the lit groove between cap and ring

mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

float sdRCyl(vec3 p, float r, float h, float rr){
  vec2 d = vec2(length(p.xy) - r + rr, abs(p.z) - h + rr);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr;
}
float btnTop(){ return H + 0.02 - uPress * 0.06; }

// returns distance; id: 0 knurled side, 1 brushed top rim, 2 button, 3 cavity
vec2 map(vec3 p){
  float r = length(p.xy), th = atan(p.y, p.x) - uAng;
  // body + knurl (triangular ridges on the side band only)
  float band = smoothstep(H - 0.035, H - 0.09, abs(p.z)) * smoothstep(0.86, 0.97, r);
  float tri = abs(fract(th * 54. / (2. * PI)) - .5) * 2.;
  float body = sdRCyl(p, 1., H, 0.075) + band * 0.016 * tri;
  // channel around the cap
  float cav = max(r - RC, (H - 0.10) - p.z);
  body = max(body, -cav);
  // push button: flat cap with a bright chamfer
  float zc = (btnTop() + (H - 0.10)) * .5, hb = (btnTop() - (H - 0.10)) * .5;
  float btn = sdRCyl(p - vec3(0., 0., zc), RB, hb, 0.032);
  if (btn < body) return vec2(btn, 2.);
  float id = p.z > H - 0.03 && r > RC + 0.01 && r < .93 ? 1. : (r < RC + 0.005 && p.z < H - 0.02 ? 3. : 0.);
  return vec2(body, id);
}
vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.) * 0.0007;
  return normalize(k.xyy * map(p + k.xyy).x + k.yyx * map(p + k.yyx).x + k.yxy * map(p + k.yxy).x + k.xxx * map(p + k.xxx).x);
}
float ao(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for (int i = 1; i <= 4; i++){ float h = 0.018 * float(i); o += (h - map(p + n * h).x) * s; s *= .6; }
  return clamp(1. - o * 9., 0., 1.);
}

// studio environment in world space: key softbox (follows the cursor a little), cool strip,
// warm kicker, faint spectral rim from the galaxy below
vec3 env(vec3 d, float rough){
  float w = rough * 1.6;
  vec3 c = mix(vec3(.006, .008, .012), vec3(.03, .035, .045), smoothstep(-.6, 1., d.y));
  c += vec3(.72, .78, .86) * .95 * smoothstep(.05, .95, d.y) * smoothstep(-.4, .5, d.z);          // big overhead diffuser
  vec3 key = normalize(vec3(-.5 + uLight.x * .35, .55 - uLight.y * .25, .66));
  float k = dot(d, key);
  c += vec3(1., .98, .95) * 4.5 * smoothstep(cos(.20 + w), cos(.08), k);                           // key softbox
  float strip = exp(-pow((d.x - .55) / (.025 + w * .3), 2.)) * smoothstep(-.5, .4, d.y + .3) * smoothstep(-.2, .4, d.z);
  c += vec3(.66, .88, 1.) * 2.2 * strip;                                                            // cool vertical strip
  float lineH = exp(-pow((d.y + .18) / (.012 + w * .25), 2.)) * smoothstep(.0, .6, d.z);
  c += vec3(1.) * .9 * lineH;                                                                       // thin horizon line
  c += vec3(1., .74, .46) * .25 * exp(-pow((d.x + .7) / (.05 + w * .3), 2.)) * smoothstep(-.6, .2, -d.y); // warm kicker, low left
  c += vec3(.30, .32, .42) * .06 * smoothstep(.0, -.9, d.y);                                        // faint bounce from below
  return c;
}
vec3 fres(vec3 f0, float c){ return f0 + (1. - f0) * pow(1. - c, 5.); }

// concentric brushing seen head-on: each light paints a pair of opposite wedges
// (the "conic" look of a lathe-turned cap). Light angles drift with the cursor.
vec3 conic(float th, float e){
  float s = uLight.x * .9 - uLight.y * .45;
  vec3 c = vec3(0.);
  c += vec3(1., .98, .95) * pow(abs(cos(th - 2.30 - s)), e);
  c += vec3(.12, .78, 1.) * 1.3 * pow(abs(cos(th + .80 - s)), e);
  c += vec3(1., .38, .52) * .6 * pow(abs(cos(th - .45 - s * .6)), e * 1.4);
  c += vec3(1., .76, .46) * .35 * pow(abs(cos(th + 2.0 - s * .6)), e * 1.4);
  return c;
}
const vec3 GREEN = vec3(.47, .85, .54);   // brand green: the painted square on the cap
// ring engraving ("Press to enter"): polar strip centred at 12 o'clock between radii R0 and R1
const float R0 = .755, R1 = .86, SPAN = 1.95;
// crystal colour: a slow spectral cycle (cyan → violet → rose → amber → green)
vec3 gemColor(float t){
  vec3 c = .5 + .5 * cos(6.2831 * (t * .045 + vec3(0., .34, .67)));
  return pow(c, vec3(1.6)) * 1.25 + .05;
}
// tuning LEDs: lit around the dial index, fading out along the trail the dial leaves behind
const float NL = 48.;
float ledLit(float ac){                                  // ac: LED angle, clockwise from 12
  float pa = mod(-uAng, 2. * PI), pl = mod(-uLag, 2. * PI);
  float d1 = abs(atan(sin(ac - pa), cos(ac - pa))), d2 = abs(atan(sin(ac - pl), cos(ac - pl)));
  return max(exp(-d1 * d1 / (.16 * .16)), .55 * exp(-d2 * d2 / (.3 * .3)));
}
void main(){
  vec2 uv = vUv;
  mat3 R = rotY(uTilt.x) * rotX(uTilt.y);           // object → world
  mat3 Ri = transpose(R);
  vec3 roW = vec3(0., 0., 3.2), rdW = normalize(vec3(uv * .50, -1.));   // real perspective: reflections sweep across the faces
  vec3 ro = Ri * roW, rd = Ri * rdW;
  // bounding sphere
  float b = dot(ro, rd), c = dot(ro, ro) - 1.12 * 1.12, disc = b * b - c;
  float t = disc > 0. ? -b - sqrt(disc) : 1e9, tEnd = disc > 0. ? -b + sqrt(disc) : 0.;
  vec2 hit = vec2(1., -1.);
  for (int i = 0; i < 80; i++){
    if (t > tEnd) break;
    hit = map(ro + rd * t);
    if (hit.x < 0.0006) break;
    t += hit.x * .85;
  }
  // miss: soft contact shadow, outer spectral arc (rose → amber, lower left) and hover halo
  if (t > tEnd || hit.x > 0.003){
    vec2 su = uv * 1.58; float r = length(su), th = atan(su.y, su.x);
    float sh = .62 * smoothstep(1.28, .9, length(su - vec2(.0, -.05)));
    float s = uLight.x * .3;
    float am = smoothstep(-2.95 + s, -2.55 + s, th) * (1. - smoothstep(-1.75 + s, -1.35 + s, th));
    vec3 ac = mix(vec3(1., .42, .5), vec3(1., .72, .4), smoothstep(-2.8, -1.5, th));
    float line = exp(-pow((r - 1.035) / .006, 2.)), glow = exp(-pow((r - 1.035) / .05, 2.)) * .45;
    vec3 col = ac * am * (line * 2.2 + glow * 1.3) * (.8 + uHover * .4);
    float halo = uHover * .05 * smoothstep(1.2, 1.0, r) * smoothstep(.97, 1.02, r);   // the moving glow behind the knob is CSS (.gate__knob::before/::after)
    col += uLed * halo;
    float a = clamp(sh + am * (line + glow) + halo, 0., 1.);
    fragColor = vec4(col, a);
    return;
  }
  vec3 p = ro + rd * t, n = nrm(p), col;
  float r = length(p.xy), th = atan(p.y, p.x), id = hit.y, occ = ao(p, n);
  vec3 nW = R * n, vW = -rdW;
  float flat_ = smoothstep(.975, .997, n.z);
  float lathe = hash(vec2(floor(r * 900.), 1.7));
  float rm = (RB + RC) * .5;                                  // channel centre line
  float acw = mod(PI * .5 - th, 2. * PI), near = ledLit(acw);
  vec3 edgeEnv = env(reflect(-vW, nW), .08) * fres(vec3(.9, .91, .93), max(dot(nW, vW), 0.));

  if (id > 1.5 && id < 2.5){
    // ── cap: polished, lathe-turned silver with the engraving ──
    vec2 muv = vec2(p.x, -p.y) / (RB * 2.) + .5;
    vec4 m = texture(uMask, muv);
    float px = 1. / 1024.;
    float bl = texture(uMask, muv + vec2(px * 3., 0.)).b - texture(uMask, muv - vec2(px * 3., 0.)).b;
    float bu = texture(uMask, muv - vec2(0., px * 3.)).b - texture(uMask, muv + vec2(0., px * 3.)).b;
    float engr = m.r * flat_;
    vec3 face = vec3(.03, .035, .045) + conic(th, 5.) * .42 + conic(th, 40.) * .7;
    face *= mix(.9, 1.04, lathe) * smoothstep(.0, .06, r + .02);
    // engraved walls catch the key light from the upper left
    float wall = clamp(-bl * .9 + bu * .9, -1., 1.) * flat_;
    vec3 groove = face * .1 + vec3(.9, .95, 1.) * max(wall, 0.) * .9 + face * max(-wall, 0.) * .05;
    col = mix(mix(edgeEnv * 1.15, face, flat_), groove, engr);
    // ── the keyframe: a small faceted crystal set into the cap, glowing and slowly cycling colour ──
    vec2 q = (p.xy - vec2(.1214, -.1214)) / .052; float md = abs(q.x) + abs(q.y);
    if (flat_ > .5 && md < 1.25){
      col = mix(col, col * .2, smoothstep(.98, 1.03, md) * (1. - smoothstep(1.15, 1.22, md)));   // bezel / setting
      if (md < 1.){
        float table = 1. - smoothstep(.40, .46, md), facet = (q.x > 0. ? 1. : 0.) + (q.y > 0. ? 2. : 0.);
        vec3 fn = normalize(mix(vec3(sign(q.x) * .6, sign(q.y) * .6, 1.), vec3(0., 0., 1.), table)), fnW = R * fn;
        vec3 inner = gemColor(uTime + facet * .9 + md * 1.4);
        vec3 g = inner * (1.7 - md * .9) + env(reflect(-vW, fnW), .02) * fres(vec3(.05), max(dot(fnW, vW), 0.)) * 2.5;
        g += vec3(1.) * pow(1. - md, 5.) * 1.4;                                           // hot core
        g += inner * (smoothstep(.07, .0, min(abs(q.x), abs(q.y))) * (1. - table) * .5 + smoothstep(.035, .0, abs(md - .43)) * .45);  // facet edges
        col = g * (1. + uGlow * .3 + uHover * .25);
      }
    }
    col += gemColor(uTime) * .4 * exp(-max(md - 1.22, 0.) * 6.) * step(1.22, md) * flat_;   // light spilling onto the metal
    col += uLed * near * .3 * (1. - flat_) * (.6 + uGlow);                          // chamfer picks up the LED light
    col *= 1. + uHover * .12;
  } else if (id > .5 && id < 1.5){
    // ── outer ring: dark brushed metal, softer wedges ──
    vec3 face = vec3(.002, .0025, .004) + conic(th, 3.) * .016 + conic(th, 24.) * .045;
    face *= mix(.85, 1.08, hash(vec2(floor(r * 700.), 3.1)));
    col = face;
    // engraved lettering around the top of the ring: polar lookup into the strip texture
    float ra = atan(sin(PI * .5 - th), cos(PI * .5 - th));            // clockwise from 12 o'clock
    vec2 ruv = vec2(ra / SPAN + .5, (R1 - r) / (R1 - R0));
    if (ruv.x > 0. && ruv.x < 1. && ruv.y > 0. && ruv.y < 1.){
      vec4 g = texture(uRing, ruv);
      float e = .0018;
      float gx = texture(uRing, ruv + vec2(e, 0.)).b - texture(uRing, ruv - vec2(e, 0.)).b;
      float gy = texture(uRing, ruv - vec2(0., e * 6.)).b - texture(uRing, ruv + vec2(0., e * 6.)).b;
      float wall = clamp(gy * .9 - gx * .6, -1., 1.);                    // upper walls catch the key light
      vec3 floor_ = vec3(.05, .055, .065) + conic(th, 4.) * .12 + conic(th, 30.) * .1;          // cut through to bare metal
      col = mix(col, floor_ + vec3(.85, .9, .95) * max(wall, 0.) * .8 - vec3(.02) * max(-wall, 0.), g.r);
    }
    // index notch at the knob angle (green) — the dial turns with the hovered discipline
    float a = th - uAng, ia = abs(atan(sin(a - PI * .5), cos(a - PI * .5)));
    float index = (1. - smoothstep(.0, .012, ia * r)) * smoothstep(.74, .76, r) * smoothstep(.88, .86, r);
    col = mix(col, uLed * (1.5 + uGlow), index);
  } else if (id > 2.5){
    // ── channel: a ring of tuning LEDs ──
    float cell = 2. * PI / NL, idx = floor(acw / cell + .5), ac = idx * cell;
    vec2 c = rm * vec2(sin(ac), cos(ac));
    float dd = length(p.xy - c), lit = ledLit(ac);
    float dot_ = 1. - smoothstep(.0085, .0125, dd), bloom = exp(-dd * dd / (.028 * .028));
    col = vec3(.006, .008, .01) + dot_ * mix(vec3(.05, .06, .07), uLed * 2.6, lit) + uLed * lit * bloom * .22;
    col += uLed * near * .12 * (1. - abs(n.z));                                     // walls lit by the LEDs
  } else {
    // ── outer bevel and side ──
    col = mix(env(reflect(-vW, nW), .22) * fres(vec3(.42, .43, .46), max(dot(nW, vW), 0.)) * .9, edgeEnv * .8, smoothstep(.0, .2, p.z - H + .12));
  }
  col *= mix(1., occ, .85);
  col = 1. - exp(-col * 1.2);                                    // gentle tone map
  col = pow(col, vec3(1. / 2.2));
  fragColor = vec4(col, 1.);
}`;

function buildRing(label) {
  const W = 2048, H = 160, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff";
  const txt = (label || "").toUpperCase(), sp = 0.42;
  let fs = 74; const font = (f) => `500 ${f}px "IBM Plex Mono", ui-monospace, monospace`;
  const width = (f) => { g.font = font(f); return [...txt].reduce((w, ch) => w + g.measureText(ch).width + f * sp, -f * sp); };
  while (width(fs) > W * 0.86 && fs > 20) fs *= 0.95;
  // the strip is stretched along the arc: compress glyphs horizontally so they keep their shape at the ring radius
  g.font = font(fs); let x = W / 2 - width(fs) / 2;
  for (const ch of txt) { g.fillText(ch, x, H * 0.74); x += g.measureText(ch).width + fs * sp; }
  const b = document.createElement("canvas"); b.width = W; b.height = H; const bc = b.getContext("2d");
  bc.filter = "blur(3px)"; bc.drawImage(cv, 0, 0);
  const A = g.getImageData(0, 0, W, H), B = bc.getImageData(0, 0, W, H).data, O = A.data;
  for (let i = 0; i < O.length; i += 4) { O[i + 2] = B[i]; O[i + 1] = 0; O[i + 3] = 255; }
  g.putImageData(A, 0, 0);
  return cv;
}

// Radial FineTune logo for the cap (mask spans the cap diameter; cap radius = 0.5 of the canvas):
// FT mark in the centre, FINE/TUNE around the top, the tagline around the bottom, calibration
// ticks on the sides and a fine outer ring — the wordmark becomes a dial.
function arcText(ctx, txt, cx, cy, r, centre, { bottom = false, track = 0 } = {}) {
  const ws = [...txt].map((ch) => ctx.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + track * (ws.length - 1);
  let a = bottom ? centre + total / r / 2 : centre - total / r / 2;      // clockwise-from-12 radians
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  [...txt].forEach((ch, i) => {
    const step = (ws[i] + (i < ws.length - 1 ? track : 0)) / r, mid = bottom ? a - ws[i] / r / 2 : a + ws[i] / r / 2;
    ctx.save(); ctx.translate(cx, cy);
    if (bottom) { ctx.rotate(mid - Math.PI); ctx.textBaseline = "top"; ctx.fillText(ch, 0, r); }
    else { ctx.rotate(mid); ctx.fillText(ch, 0, -r); }
    ctx.restore();
    a += bottom ? -step : step;
  });
}
function buildMask(size = 1024) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d"), C = size / 2, head = '"Space Grotesk", "Inter Tight", Arial, sans-serif', mono = '"IBM Plex Mono", ui-monospace, monospace';
  const ms = size * 0.0108, mx = C - 16 * ms, my = C - 16 * ms;           // FT mark: viewBox 32, centred
  const draw = (ctx) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = ctx.fillStyle = "#fff"; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
    // outer fine ring
    ctx.lineWidth = size * 0.005; ctx.beginPath(); ctx.arc(C, C, size * 0.468, 0, Math.PI * 2); ctx.stroke();
    // FT mark
    ctx.save(); ctx.translate(mx, my); ctx.scale(ms, ms);
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(16, 16, 14.2, 65 * Math.PI / 180, 385 * Math.PI / 180); ctx.stroke();   // circle, open where the keyframe sits
    ctx.lineWidth = 2.1; ctx.beginPath(); ctx.moveTo(8.8, 20.8); ctx.lineTo(8.8, 11.2); ctx.lineTo(14.56, 11.2); ctx.moveTo(8.8, 16); ctx.lineTo(13.28, 16); ctx.moveTo(16.4, 11.2); ctx.lineTo(23.2, 11.2); ctx.moveTo(19.76, 11.2); ctx.lineTo(19.76, 20.8); ctx.stroke();
    ctx.restore();
    // FINE (500) TUNE (700) around the top
    const fs = size * 0.088, rT = size * 0.345;
    ctx.font = `500 ${fs}px ${head}`; const wF = ctx.measureText("FINE").width;
    ctx.font = `700 ${fs}px ${head}`; const wT = ctx.measureText("TUNE").width;
    const gap = fs * 0.32, tot = (wF + wT + gap) / rT;
    ctx.font = `500 ${fs}px ${head}`; arcText(ctx, "FINE", C, C, rT, -tot / 2 + wF / rT / 2, { track: fs * 0.04 });
    ctx.font = `700 ${fs}px ${head}`; arcText(ctx, "TUNE", C, C, rT, tot / 2 - wT / rT / 2, { track: fs * 0.04 });
    // tagline around the bottom (mono, tracked)
    const ts = size * 0.03; ctx.font = `500 ${ts}px ${mono}`;
    arcText(ctx, "MOTION DESIGN · CREATIVE TECH", C, C, size * 0.372, Math.PI, { bottom: true, track: ts * 0.26 });
    // calibration ticks on both sides, between the two arcs
    for (let i = 0; i < 2; i++) for (let t = -5; t <= 5; t++) {
      const a = (i ? -Math.PI / 2 : Math.PI / 2) + t * 0.06, maj = t % 5 === 0, r0 = size * (maj ? 0.385 : 0.405), r1 = size * 0.44;
      ctx.lineWidth = size * (maj ? 0.006 : 0.004);
      ctx.beginPath(); ctx.moveTo(C + Math.sin(a) * r0, C - Math.cos(a) * r0); ctx.lineTo(C + Math.sin(a) * r1, C - Math.cos(a) * r1); ctx.stroke();
    }
  };
  // R: engraving, G: green square only, B: blurred engraving (groove normals)
  const a = document.createElement("canvas"); a.width = a.height = size; const ac = a.getContext("2d"); draw(ac);
  const sq = document.createElement("canvas"); sq.width = sq.height = size; const sc = sq.getContext("2d");
  sc.fillStyle = "#000"; sc.fillRect(0, 0, size, size);   // G unused: the keyframe is rendered as a crystal in the shader
  const bl = document.createElement("canvas"); bl.width = bl.height = size; const bc = bl.getContext("2d");
  bc.filter = `blur(${size * 0.0035}px)`; bc.drawImage(a, 0, 0);
  const A = ac.getImageData(0, 0, size, size).data, S = sc.getImageData(0, 0, size, size).data, B = bc.getImageData(0, 0, size, size).data;
  const out = g.createImageData(size, size), O = out.data;
  for (let i = 0; i < O.length; i += 4) { O[i] = A[i]; O[i + 1] = S[i]; O[i + 2] = B[i]; O[i + 3] = 255; }
  g.putImageData(out, 0, 0);
  return cv;
}

export function createKnob(canvas, { motion = true, label = "" } = {}) {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const U = {}; ["uMask", "uRing", "uLed", "uTime", "uAng", "uLag", "uPress", "uHover", "uGlow", "uTilt", "uLight"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "aP"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  const upload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildMask(1024)); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); dirty = true; };
  const rtex = gl.createTexture();
  const uploadRing = () => { gl.bindTexture(gl.TEXTURE_2D, rtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildRing(label)); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); dirty = true; };
  let dirty = true;
  upload(); uploadRing();
  if (document.fonts) Promise.all([document.fonts.load('700 100px "Space Grotesk"'), document.fonts.load('500 40px "IBM Plex Mono"')]).then(() => { upload(); uploadRing(); }).catch(() => {});

  const K = { angle: 0, lag: 0, tiltX: 0, tiltY: 0, hover: 0, press: 0, glow: 0, lx: 0, ly: 0, lr: .47, lg: .85, lb: .54 };   // lr/lg/lb: LED colour
  const T = { ...K, tiltY: 0.06 };
  Object.assign(K, { tiltY: 0.06 });
  let alive = true, time = 0, idle = 0;
  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5), w = Math.min(1200, Math.round(canvas.clientWidth * d));
    if (canvas.width !== w) { canvas.width = canvas.height = w; dirty = true; }
  };
  const ease = (k, rate, dt) => { const d = T[k] - K[k]; if (Math.abs(d) < 1e-4) { K[k] = T[k]; return false; } K[k] += d * (1 - Math.exp(-rate * dt)); return true; };
  return {
    set(o) { Object.assign(T, o); dirty = true; },
    setLabel(l) { if (l !== label) { label = l; uploadRing(); } },
    snap(o) { Object.assign(T, o); Object.assign(K, o); dirty = true; },
    frame(dt) {
      if (!alive) return;
      resize(); time += dt;
      let moving = false;
      // angle: shortest way round
      let da = T.angle - K.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 1e-4) { K.angle += da * (1 - Math.exp(-7 * dt)); moving = true; }
      let dl = K.angle - K.lag; dl = Math.atan2(Math.sin(dl), Math.cos(dl));                 // trail: a slower copy of the angle
      if (Math.abs(dl) > 1e-3) { K.lag += dl * (1 - Math.exp(-(motion ? 1.6 : 60) * dt)); moving = true; }
      for (const [k, r] of [["tiltX", 5], ["tiltY", 5], ["hover", 8], ["press", 18], ["glow", 4], ["lx", 3], ["ly", 3], ["lr", 5], ["lg", 5], ["lb", 5]]) moving = ease(k, motion ? r : 60, dt) || moving;
      if (!moving && !dirty) { idle += dt; if (!motion || idle < 0.05) return; }
      idle = 0;
      dirty = false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pr); gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uMask, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rtex); gl.uniform1i(U.uRing, 1); gl.activeTexture(gl.TEXTURE0);
      gl.uniform3f(U.uLed, K.lr, K.lg, K.lb);
      gl.uniform1f(U.uTime, time); gl.uniform1f(U.uAng, K.angle); gl.uniform1f(U.uPress, K.press); gl.uniform1f(U.uHover, K.hover); gl.uniform1f(U.uGlow, K.glow);
      gl.uniform2f(U.uTilt, K.tiltX, K.tiltY); gl.uniform1f(U.uLag, K.lag); gl.uniform2f(U.uLight, K.lx, K.ly);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    stop() { alive = false; },
    start() { alive = true; dirty = true; },
  };
}
