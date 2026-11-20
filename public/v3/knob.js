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
uniform sampler2D uMask;
uniform float uTime, uAng, uPress, uHover, uGlow;
uniform vec2 uTilt, uLight;

const float PI = 3.14159265;
const float H  = 0.24;    // half height of the knob body
const float RB = 0.62;    // push-button radius
const float RC = 0.665;   // cavity radius (gap around the button)

mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

float sdRCyl(vec3 p, float r, float h, float rr){
  vec2 d = vec2(length(p.xy) - r + rr, abs(p.z) - h + rr);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr;
}
float btnTop(){ return H + 0.012 - uPress * 0.055; }

// returns distance; id: 0 knurled side, 1 brushed top rim, 2 button, 3 cavity
vec2 map(vec3 p){
  float r = length(p.xy), th = atan(p.y, p.x) - uAng;
  // body + knurl (triangular ridges on the side band only)
  float band = smoothstep(H - 0.035, H - 0.09, abs(p.z)) * smoothstep(0.86, 0.97, r);
  float tri = abs(fract(th * 54. / (2. * PI)) - .5) * 2.;
  float body = sdRCyl(p, 1., H, 0.06) + band * 0.016 * tri;
  // cavity around the button
  float cav = max(r - RC, (H - 0.11) - p.z);
  body = max(body, -cav);
  // push button: rounded puck with a shallow concave dish on top
  float zc = (btnTop() + (H - 0.11)) * .5, hb = (btnTop() - (H - 0.11)) * .5;
  float btn = sdRCyl(p - vec3(0., 0., zc), RB, hb, 0.03) + 0.03 * (1. - clamp(r * r / (RB * RB), 0., 1.)) * step(zc, p.z);
  if (btn < body) return vec2(btn, 2.);
  float id = p.z > H - 0.03 && r > RC + 0.01 ? 1. : (r < RC + 0.005 && p.z < H - 0.02 ? 3. : 0.);
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
  // miss: soft contact shadow + hover halo on transparent
  if (t > tEnd || hit.x > 0.003){
    vec2 su = uv * 1.58; float r = length(su - vec2(.0, -.07));
    float sh = .62 * smoothstep(1.28, .9, r);
    float halo = uHover * .22 * smoothstep(1.3, 1.02, length(su)) * smoothstep(.98, 1.05, length(su));
    fragColor = vec4(vec3(.47, .85, .54) * halo, sh + halo);
    return;
  }
  vec3 p = ro + rd * t, n = nrm(p), col;
  float r = length(p.xy), th = atan(p.y, p.x), id = hit.y, occ = ao(p, n);
  vec3 nW, vW = -rdW;

  if (id > 1.5 && id < 2.5){
    // ── polished push button with engraving ──
    vec2 muv = vec2(p.x, -p.y) / (RB * 2.) + .5;
    vec4 m = texture(uMask, muv);
    float px = 1. / 1024.;
    float bl = texture(uMask, muv + vec2(px * 3., 0.)).b - texture(uMask, muv - vec2(px * 3., 0.)).b;
    float bu = texture(uMask, muv - vec2(0., px * 3.)).b - texture(uMask, muv + vec2(0., px * 3.)).b;
    float top = smoothstep(.9, .99, n.z);
    n = normalize(n + top * vec3(-bl, -bu, 0.) * 2.2);
    // fine lathe rings on the polished face
    float lathe = hash(vec2(floor(r * 900.), 1.7));
    nW = R * n;
    vec3 rf = reflect(-vW, nW);
    float engr = m.r * top;
    float rough = mix(.045 + lathe * .03, .42, engr);
    vec3 f0 = mix(vec3(.95, .955, .965), vec3(.22, .23, .25), engr);
    col = env(rf, rough) * fres(f0, max(dot(nW, vW), 0.));
    col *= mix(1., .55, engr) * mix(.93, 1., lathe);
    col += vec3(.47, .85, .54) * m.g * top * (1.1 + uGlow * 1.6 + uHover * .6);   // painted green square
  } else if (id > .5 && id < 1.5){
    // ── brushed aluminium rim: concentric lathe, highlight streaks run radially ──
    vec3 rad = R * normalize(vec3(p.xy, 0.)), tan_ = R * normalize(vec3(-p.y, p.x, 0.));
    nW = R * n;
    float ring = hash(vec2(floor(r * 700.), 3.1));
    vec3 acc = vec3(0.);
    for (int i = -2; i <= 2; i++){
      vec3 nn = normalize(nW + rad * float(i) * .09);
      acc += env(reflect(-vW, nn), .16);
    }
    col = acc / 5. * fres(vec3(.80, .81, .83), max(dot(nW, vW), 0.)) * (.88 + ring * .16);
    // dial: engraved ticks every 10°, green index line, turning with the knob
    float a = th - uAng, seg = a / (2. * PI) * 36.;
    float tick = (1. - smoothstep(.0, .012, abs(fract(seg + .5) - .5) / 36. * 2. * PI * r)) * smoothstep(.925, .935, r) * smoothstep(.975, .965, r);
    col *= 1. - tick * .7;
    float ia = abs(atan(sin(a - PI * .5), cos(a - PI * .5)));
    float index = (1. - smoothstep(.0, .02, ia * r)) * smoothstep(.72, .74, r) * smoothstep(.93, .91, r);
    col = mix(col, vec3(.47, .85, .54) * (1.4 + uGlow), index);
  } else if (id > 2.5){
    col = env(reflect(-vW, R * n), .5) * .08;                  // cavity: dark, rough
    nW = R * n;
  } else {
    // ── knurled side: darker anodised gunmetal ──
    nW = R * n;
    col = env(reflect(-vW, nW), .22) * fres(vec3(.42, .43, .46), max(dot(nW, vW), 0.)) * .9;
  }
  col *= occ;
  col = 1. - exp(-col * 1.15);                                  // gentle tone map
  col = pow(col, vec3(1. / 2.2));
  fragColor = vec4(col, 1.);
}`;

function buildMask(size = 1024) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d");
  const draw = (ctx, withSquare) => {
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = ctx.fillStyle = "#fff"; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
    // thin engraved ring near the edge of the button
    ctx.lineWidth = size * 0.006; ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.455, 0, Math.PI * 2); ctx.stroke();
    // FT mark (viewBox 32), centred above the word
    const s = size * 0.0108, ox = size / 2 - 16 * s, oy = size * 0.405 - 16 * s;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.lineWidth = 1.6; ctx.strokeRect(1.5, 1.5, 29, 29);
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(7.5, 22); ctx.lineTo(7.5, 10); ctx.lineTo(14.7, 10); ctx.moveTo(7.5, 16); ctx.lineTo(13.1, 16); ctx.moveTo(17, 10); ctx.lineTo(25.5, 10); ctx.moveTo(21.2, 10); ctx.lineTo(21.2, 22); ctx.stroke();
    if (withSquare) ctx.fillRect(26, 26, 6, 6);
    ctx.restore();
    // wordmark: Fine (500) + Tune (700), as in the site logo
    const fs = size * 0.115; ctx.textBaseline = "alphabetic";
    ctx.font = `500 ${fs}px "Space Grotesk", "Inter Tight", Arial, sans-serif`; const w1 = ctx.measureText("Fine").width;
    ctx.font = `700 ${fs}px "Space Grotesk", "Inter Tight", Arial, sans-serif`; const w2 = ctx.measureText("Tune").width;
    const track = -fs * 0.05, x0 = size / 2 - (w1 + w2 + track) / 2, y = size * 0.70;
    ctx.font = `500 ${fs}px "Space Grotesk", "Inter Tight", Arial, sans-serif`; ctx.fillText("Fine", x0, y);
    ctx.font = `700 ${fs}px "Space Grotesk", "Inter Tight", Arial, sans-serif`; ctx.fillText("Tune", x0 + w1 + track, y);
  };
  // R: lettering, G: green square only, B: blurred lettering (groove normals)
  const a = document.createElement("canvas"); a.width = a.height = size; const ac = a.getContext("2d"); draw(ac, true);
  const sq = document.createElement("canvas"); sq.width = sq.height = size; const sc = sq.getContext("2d");
  sc.fillStyle = "#000"; sc.fillRect(0, 0, size, size); sc.fillStyle = "#fff";
  { const s = size * 0.0108; sc.fillRect(size / 2 - 16 * s + 26 * s, size * 0.405 - 16 * s + 26 * s, 6 * s, 6 * s); }
  const bl = document.createElement("canvas"); bl.width = bl.height = size; const bc = bl.getContext("2d");
  bc.filter = `blur(${size * 0.0035}px)`; bc.drawImage(a, 0, 0);
  const A = ac.getImageData(0, 0, size, size).data, S = sc.getImageData(0, 0, size, size).data, B = bc.getImageData(0, 0, size, size).data;
  const out = g.createImageData(size, size), O = out.data;
  for (let i = 0; i < O.length; i += 4) { O[i] = A[i]; O[i + 1] = S[i]; O[i + 2] = B[i]; O[i + 3] = 255; }
  g.putImageData(out, 0, 0);
  return cv;
}

export function createKnob(canvas, { motion = true } = {}) {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const U = {}; ["uMask", "uTime", "uAng", "uPress", "uHover", "uGlow", "uTilt", "uLight"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "aP"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  const upload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildMask()); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); dirty = true; };
  let dirty = true;
  upload();
  if (document.fonts) document.fonts.load('700 100px "Space Grotesk"').then(upload).catch(() => {});

  const K = { angle: 0, tiltX: 0, tiltY: 0, hover: 0, press: 0, glow: 0, lx: 0, ly: 0 };
  const T = { ...K, tiltY: 0.42 };
  Object.assign(K, { tiltY: 0.42 });
  let alive = true, time = 0;
  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 2), w = Math.min(520, Math.round(canvas.clientWidth * d));
    if (canvas.width !== w) { canvas.width = canvas.height = w; dirty = true; }
  };
  const ease = (k, rate, dt) => { const d = T[k] - K[k]; if (Math.abs(d) < 1e-4) { K[k] = T[k]; return false; } K[k] += d * (1 - Math.exp(-rate * dt)); return true; };
  return {
    set(o) { Object.assign(T, o); dirty = true; },
    snap(o) { Object.assign(T, o); Object.assign(K, o); dirty = true; },
    frame(dt) {
      if (!alive) return;
      resize(); time += dt;
      let moving = false;
      // angle: shortest way round
      let da = T.angle - K.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 1e-4) { K.angle += da * (1 - Math.exp(-7 * dt)); moving = true; }
      for (const [k, r] of [["tiltX", 5], ["tiltY", 5], ["hover", 8], ["press", 18], ["glow", 4], ["lx", 3], ["ly", 3]]) moving = ease(k, motion ? r : 60, dt) || moving;
      if (!moving && !dirty) return;
      dirty = false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pr); gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uMask, 0);
      gl.uniform1f(U.uTime, time); gl.uniform1f(U.uAng, K.angle); gl.uniform1f(U.uPress, K.press); gl.uniform1f(U.uHover, K.hover); gl.uniform1f(U.uGlow, K.glow);
      gl.uniform2f(U.uTilt, K.tiltX, K.tiltY); gl.uniform2f(U.uLight, K.lx, K.ly);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    stop() { alive = false; },
    start() { alive = true; dirty = true; },
  };
}
