// FineTune v3 — Observatory prototype: focus-ring gate + 3D glass gallery.
// Raw WebGL2, no dependencies. Scroll drives a camera through a galaxy
// corridor; each project is a glass pane that docks in front of the lens.

const PROJECTS = [
  { slug: "hbo-bff", title: "HBO Max — BFF Nossa Voz", disc: "VFX · 3D · Compositing", ctx: "VFX, 3D and compositing for an HBO Max campaign piece.", pt: "VFX, 3D e composição para uma peça de campanha da HBO Max.", tint: [0.62, 0.48, 1.0] },
  { slug: "bravecto", title: "Bravecto Experience", disc: "Art Direction · 3D · Immersive", ctx: "Art direction and 3D for an immersive brand experience.", pt: "Direção de arte e 3D para uma experiência de marca imersiva.", tint: [1.0, 0.70, 0.36] },
  { slug: "yes", title: "YES! — Diga Sim ao Mundo", disc: "Motion Design · VFX · Storytelling", ctx: "Motion design and VFX carrying a language-school campaign.", pt: "Motion design e VFX construindo a história de uma campanha.", tint: [0.42, 0.84, 1.0] },
  { slug: "hbo-use-sua-voz", title: "HBO — Use Sua Voz", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [1.0, 0.45, 0.72] },
  { slug: "cleopatra", title: "Cleopatra", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [1.0, 0.82, 0.50] },
  { slug: "melhor-verao", title: "Melhor Verão", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.45, 0.95, 0.86] },
  { slug: "true-riches", title: "True Riches", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.56, 0.62, 1.0] },
  { slug: "conectivo", title: "Conectivo", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.86, 0.56, 1.0] },
];
const PRACTICES = [
  { t: "Art Direction & Design", tp: "Direção de Arte & Design", k: "Concept · Key visuals · Systems", kp: "Conceito · Key visuals · Sistemas",
    d: "Visual languages built around one clear idea — from the first frame and key visual to the system that keeps every piece coherent.",
    dp: "Linguagens visuais construídas em torno de uma ideia clara — do primeiro frame e do key visual ao sistema que mantém cada peça coerente.", rel: [1, 4], tint: [0.74, 0.62, 1.0] },
  { t: "Motion, 3D & VFX", tp: "Motion, 3D & VFX", k: "Animation · Lookdev · Compositing", kp: "Animação · Lookdev · Composição",
    d: "Animation, modeling, shading, lighting, rendering and compositing for campaigns, content and immersive experiences.",
    dp: "Animação, modelagem, shading, iluminação, render e composição para campanhas, conteúdo e experiências imersivas.", rel: [0, 2, 3], tint: [1.0, 0.74, 0.46] },
  { t: "AI-Assisted Creation", tp: "Criação Assistida por IA", k: "Previs · Generation · Iteration", kp: "Previs · Geração · Iteração",
    d: "Generative tools placed inside a directed pipeline — used to explore faster, while art direction decides what stays.",
    dp: "Ferramentas generativas dentro de um pipeline dirigido — para explorar mais rápido, enquanto a direção de arte decide o que fica.", rel: [], tint: [0.5, 0.88, 1.0] },
  { t: "Creative Technology", tp: "Tecnologia Criativa", k: "Automation · Tools · Web 3D", kp: "Automação · Ferramentas · Web 3D",
    d: "Scripts, Blender add-ons, automations and web prototypes that remove friction from production and open new visual possibilities.",
    dp: "Scripts, add-ons de Blender, automações e protótipos web que tiram o atrito da produção e abrem novas possibilidades visuais.", rel: [], tint: [0.62, 0.76, 1.0] },
];
const N = PROJECTS.length;
const PLATE_TINT = [0.60, 0.80, 1.0];
const D = 11;                       // world spacing between panes
const PW = 2.72, PH = 2.13;         // pane size (cover aspect 404:316)
const FOV = (38 * Math.PI) / 180;

const I18N = {
  pt: { tagline: "Motion Design & Tecnologia Criativa", navWork: "Trabalhos", navPractice: "Prática", navAbout: "Sobre", navContact: "Contato",
    pracEyebrow: "Áreas de atuação", pracT1: "Quatro disciplinas.", pracT2: "Um sistema.", lensPh: "Placeholder — trecho de reel por disciplina",
    featured: "Observado", gateRole: "Luiz Gustavo Czaika", gateCta: "Clique para focar",
    eyebrow: "Senior Motion Designer · Diretor de Arte · Creative Technologist",
    lead: "Sistemas visuais onde motion, 3D, VFX, IA e tecnologia criativa convergem.", hint: "Role para observar", open: "Abrir case",
    nextEyebrow: "Próximas etapas, aguardando aprovação", nextTitle: "O caminho de luz continua.",
    n1: "Campos de prática", n1d: "Lista fixa + preview vivo, imagem resolvendo do desfoque ao foco",
    n2: "Processo & linha do tempo", n2d: "Uma única trilha de luz atravessando 12 anos de trabalho",
    n3: "Sobre & contato", n3d: "Assinatura em escala gigante, “Observe. Create. Refine.”",
    talk: "Vamos conversar", phMedia: "Placeholder — vídeo / breakdown entra aqui",
    cChallenge: "Desafio", cIdea: "Ideia", cExec: "Execução", cOutcome: "Resultado" },
};
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/* ───────────── state ───────────── */
const S = {
  entered: false, focus: 0, focusT: 0, gateNear: 0,
  p: 0, pT: 0, time: 0, motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
  prIdx: -1, prFrom: 0, prTo: 0, prT: 1, prQ: 0, prV: 0, prIn: 0,
  mx: 0, my: 0, mxT: 0, myT: 0, hover: 0, hoverT: 0, lang: "en", active: -2, past: false, caseOpen: false,
};

/* ───────────── gate ring (SVG) ───────────── */
function buildRing() {
  const ring = $("#ring"), NS = "http://www.w3.org/2000/svg";
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  let ticks = "";
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, maj = i % 15 === 0, r0 = maj ? 196 : 203, r1 = 210;
    ticks += `<line class="tick${maj ? " maj" : ""}" x1="${Math.cos(a) * r0}" y1="${Math.sin(a) * r0}" x2="${Math.cos(a) * r1}" y2="${Math.sin(a) * r1}"/>`;
  }
  const labels = ["MOTION", "3D", "VFX", "ART DIRECTION", "AI", "CREATIVE TECH", "COMPOSITING", "AUTOMATION"];
  let txt = `<defs><path id="lp" d="M0,-228 A228,228 0 1,1 -0.01,-228"/></defs>`;
  labels.forEach((l, i) => { txt += `<text text-anchor="middle"><textPath href="#lp" startOffset="${((i + 0.5) / labels.length) * 100}%">${l}</textPath></text>`; });
  // aperture blades: thin arcs that close toward the centre when the pointer approaches
  let ap = "";
  for (let i = 0; i < 6; i++) ap += `<circle class="ap" r="${120 + i * 13}" stroke-dasharray="${40 + i * 22} ${90 + i * 30}" transform="rotate(${i * 47})"/>`;
  ring.innerHTML = `<circle class="orbit" r="210"/><circle class="orbit" r="176"/>${ap}${ticks}${txt}
    <g class="needle" id="needle"><line x1="0" y1="-176" x2="0" y2="-214" stroke="#78D98A" stroke-width="1"/><circle class="dot" cy="-190" r="3.4"/></g>`;
}
buildRing();

/* ───────────── WebGL ───────────── */
const canvas = $("#gl");
const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
if (!gl) document.documentElement.classList.add("no-gl");

const COMMON = `#version 300 es
precision highp float;
vec3 spectrum(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.33,0.67))); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
`;
const BG_VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }`;
// Galaxy: spiral-warped nebula + amber core + anamorphic streak (hero-approved.png language).
const BG_FS = COMMON + `
uniform vec2 uRes,uMouse; uniform float uTime,uCamZ,uCore,uFocus; uniform vec3 uTint,uTint2; out vec4 o;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv-=uMouse*vec2(.035,-.035);
  float r=length(uv), a=atan(uv.y,uv.x);
  float sw=a+1.5/(r+.38)+uTime*.012-uCamZ*.022;
  vec2 q=vec2(cos(sw),sin(sw))*r;
  float n=fbm(q*2.1+vec2(0.,uCamZ*.03)); float n2=fbm(q*4.4-vec2(uTime*.008,3.)+n*1.3);
  float arms=pow(.5+.5*sin(sw*2.+n*3.2+log(r+.05)*3.2),3.);
  float neb=smoothstep(.34,.98,n*.72+n2*.5)*(.22+.78*arms)*exp(-r*1.05);
  vec3 col=vec3(.018,.032,.052)+vec3(.0,.012,.03)*(1.-r);
  col+=neb*mix(uTint,uTint2,n2)*.62;
  // thin orbital filaments
  float fil=pow(.5+.5*sin(log(r+.02)*26.+sw*3.+n*6.),24.)*exp(-r*1.6)*smoothstep(.05,.25,r);
  col+=fil*mix(uTint,vec3(.9,.95,1.),.5)*.09;
  float core=exp(-r*5.2)*1.0+exp(-r*24.)*1.7;
  float streak=exp(-abs(uv.y)*52.)*exp(-abs(uv.x)*1.5)*.6;
  float rays=pow(noise(vec2(a*13.,uTime*.04+uCamZ*.02)),7.)*exp(-r*2.3);
  vec3 warm=vec3(1.,.78,.5);
  col+=(core*mix(warm,uTint,.28)+streak*mix(vec3(.8,.9,1.),uTint,.45)+rays*mix(warm,uTint2,.5))*uCore;
  vec2 sp=uv*74.+vec2(0.,uCamZ*.35); vec2 c=floor(sp); float h=hash(c);
  col+=step(.986,h)*smoothstep(.3,0.,length(fract(sp)-.5))*(.5+.5*sin(uTime*(1.+h*3.)+h*40.))*.8;
  col*=1.-.6*smoothstep(.35,1.25,r);
  col*=mix(.32,1.,uFocus);
  col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)*.012;
  o=vec4(col,1.);
}`;
const PANE_VS = `#version 300 es
in vec2 aPos; uniform mat4 uMVP; out vec2 vUv; void main(){ vUv=aPos+.5; gl_Position=uMVP*vec4(aPos,0.,1.); }`;
// Glass pane: rounded slab, beveled refractive edge with spectral dispersion, pearl rim, slow specular sweep.
const PANE_FS = COMMON + `
in vec2 vUv; uniform sampler2D uTex,uTex2; uniform vec2 uSize,uTexScale; uniform vec3 uTint; uniform float uMix,uResolve;
vec3 smp(sampler2D t,vec2 uv,vec2 n,float ca,float lod){ return vec3(textureLod(t,uv+n*ca,lod).r,textureLod(t,uv,lod).g,textureLod(t,uv-n*ca,lod).b); }
uniform float uTime,uAlpha,uDim,uBlur,uSeed,uGhost,uHover; out vec4 o;
void main(){
  vec2 p=(vUv-.5)*uSize; float rad=.09;
  vec2 b=abs(p)-uSize*.5+rad; float d=length(max(b,0.))+min(max(b.x,b.y),0.)-rad;
  float aa=fwidth(d)*1.2+uBlur*.012; float mask=smoothstep(aa,-aa,d);
  float e=-d; float rim=smoothstep(.022+uBlur*.02,0.,e); float bevel=smoothstep(.17,0.,e);
  vec2 nrm=normalize(p*vec2(1.,uSize.x/uSize.y)+1e-4);
  float ang=atan(p.y,p.x);
  vec3 iri=spectrum(ang/6.28318+e*2.4+uTime*.04+uSeed);
  vec3 col;
  if(uGhost>.5){
    col=uTint*.035+iri*bevel*.16+vec3(.92,.96,1.)*rim*.4;
    float al=mask*uAlpha;
    o=vec4(col*al, al*.09); return;
  }
  vec2 tuv=(vUv-nrm*bevel*.034-.5)*uTexScale+.5;
  float rr=length(vUv-.5)*1.5; float ca=.0004+rr*rr*.0016+bevel*.02+uHover*.0016*rr+uBlur*.003+uResolve*.016;
  float lod=uBlur+uResolve*3.6;
  // unresolved state: the image is split into refracted shards that drift back into register
  vec2 cell=floor(vUv*vec2(11.,7.)+noise(vUv*3.+uSeed)*1.5);
  vec2 dsp=((vec2(hash(cell),hash(cell+7.3))-.5)*.11+(vec2(noise(vUv*6.+uSeed*9.),noise(vUv*6.+31.))-.5)*.14)*uResolve;
  vec3 img=smp(uTex,tuv+dsp,nrm,ca,lod);
  if(uMix>0.001){ float m=smoothstep(0.,1.,uMix*1.5-.25+(hash(cell+3.1)-.5)*.5*uResolve); img=mix(img,smp(uTex2,tuv-dsp,nrm,ca,lod),m); }
  col=img*uDim;
  col=mix(col,col*.55+uTint*.12,bevel*.6);
  col+=iri*bevel*(.2+uHover*.14);
  col+=vec3(.92,.96,1.)*rim*.85;
  float sx=vUv.x+vUv.y*.35; float spos=fract(uTime*.05+uSeed)*3.4-1.2;
  col+=exp(-pow((sx-spos)*5.5,2.))*.06*uDim;
  col+=uTint*.05*(1.-uDim);
  float al=mask*uAlpha;
  o=vec4(col*al,al*mix(.97,.8,bevel));
}`;
// Light trails: screen-space ribbons along helical paths anchored in world space.
const TR_VS = COMMON + `
in vec2 aTS; in vec4 aSeed; uniform mat4 uVP; uniform float uCamZ,uTime,uAspect; uniform vec2 uRes;
out float vSide,vWz,vD; out vec4 vSeed;
vec3 curve(float wz){
  float ang=aSeed.x*6.28318+wz*(.016+aSeed.w*.026)+sin(wz*.09+aSeed.y*20.)*.4+uTime*.018;
  float r=mix(2.35,6.2,aSeed.z)+sin(wz*.17+aSeed.y*9.)*.45;
  return vec3(cos(ang)*r*1.6,sin(ang)*r,wz);
}
void main(){
  float d=.7+aTS.x*aTS.x*78.; float wz=uCamZ-d;
  vec4 p0=uVP*vec4(curve(wz),1.), p1=uVP*vec4(curve(wz-.35),1.);
  vec2 s0=p0.xy/p0.w, s1=p1.xy/p1.w;
  vec2 dir=normalize((s1-s0)*vec2(uAspect,1.)+1e-6); vec2 n=vec2(-dir.y,dir.x)/vec2(uAspect,1.);
  float wpx=mix(1.4,3.4,aSeed.y)*(7./(d+2.))+.7;
  gl_Position=vec4((s0+n*aTS.y*wpx/uRes.y*2.)*p0.w,p0.z,p0.w);
  vSide=aTS.y; vWz=wz; vD=d; vSeed=aSeed;
}`;
const TR_FS = COMMON + `
in float vSide,vWz,vD; in vec4 vSeed; uniform float uTime,uGain; uniform vec3 uTint; out vec4 o;
void main(){
  float prof=exp(-vSide*vSide*4.5);
  float pulse=pow(.5+.5*sin(vWz*.26+uTime*(.45+vSeed.w*.8)+vSeed.x*50.),9.);
  float fade=smoothstep(78.,26.,vD)*smoothstep(.7,3.2,vD);
  vec3 c=mix(spectrum(vSeed.x+vWz*.012),uTint,.5); c=mix(c,vec3(1.,.95,.88),pulse*.6);
  o=vec4(c*prof*(.07+pulse*.95)*fade*uGain,0.);
}`;
// Bokeh dust: world-anchored points whose size grows with distance from the focal plane.
const ST_VS = `#version 300 es
in vec4 aSeed; uniform mat4 uVP; uniform float uCamZ,uDefocus,uFocusD,uPx; out float vA; out float vK;
void main(){
  vec2 xy=aSeed.xy*vec2(15.,9.); float l=length(xy); if(l<1.7) xy*=1.7/max(l,.01);
  float d=mod(uCamZ+aSeed.z*90.,90.)+.4;
  gl_Position=uVP*vec4(xy,uCamZ-d,1.);
  float coc=abs(d-uFocusD)/d;
  float size=(1.6+aSeed.w*3.4+coc*(6.+uDefocus*46.))*uPx/max(d*.22,.35);
  gl_PointSize=clamp(size,1.,96.);
  vA=smoothstep(90.,50.,d)*smoothstep(.4,2.5,d)*(.35+aSeed.w*.65)/(1.+size*size*.012); vK=aSeed.w;
}`;
const ST_FS = `#version 300 es
precision highp float; in float vA; in float vK; uniform vec3 uTint; out vec4 o;
void main(){ float r=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.82,r)*(.55+.45*smoothstep(.4,.95,r));
  vec3 c=mix(vec3(.92,.96,1.),mix(vec3(1.,.8,.55),uTint,step(.5,vK)),.55*fract(vK*7.)); o=vec4(c*a*vA,0.); }`;

function program(vs, fs) {
  const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").slice(0, 6).join("\n")); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

/* mat4 (column-major) */
const M = {
  persp(f, a, n, fr) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, (2 * fr * n) / (n - fr), 0]; },
  mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
  trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  scale(x, y) { return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  xf(m, x, y) { const w = m[3] * x + m[7] * y + m[15]; return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]; },
};

let R = null; // GL resources
function initGL() {
  const bg = program(BG_VS, BG_FS), pane = program(PANE_VS, PANE_FS), tr = program(TR_VS, TR_FS), st = program(ST_VS, ST_FS);
  const vao = (prog, setup) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); setup(prog.p); gl.bindVertexArray(null); return v; };
  const buf = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; };
  const attr = (p, name, size, stride, off) => { const l = gl.getAttribLocation(p, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride, off); };

  const bgVao = vao(bg, (p) => { buf([-1, -1, 3, -1, -1, 3]); attr(p, "aPos", 2, 0, 0); });
  const paneVao = vao(pane, (p) => { buf([-.5, -.5, .5, -.5, -.5, .5, .5, .5]); attr(p, "aPos", 2, 0, 0); });

  const TRAILS = 44, SEG = 150, tv = [];
  let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < TRAILS; i++) { const s = [rand(), rand(), Math.pow(rand(), 1.4), rand()];
    for (let j = 0; j < SEG; j++) { const t = j / (SEG - 1); tv.push(t, -1, ...s, t, 1, ...s); } }
  const trVao = vao(tr, (p) => { buf(tv); attr(p, "aTS", 2, 24, 0); attr(p, "aSeed", 4, 24, 8); });

  const STARS = 1500, sv = [];
  for (let i = 0; i < STARS; i++) sv.push(rand() * 2 - 1, rand() * 2 - 1, rand(), rand());
  const stVao = vao(st, (p) => { buf(sv); attr(p, "aSeed", 4, 0, 0); });

  // ghost slabs lining the corridor (glass only, no image)
  const ghosts = [];
  for (let i = 0; i < 46; i++) { const side = i % 2 ? 1 : -1;
    ghosts.push({ z: -3 - i * 2.35 - rand() * 1.2, x: side * (4.6 + rand() * 3.4), y: (rand() - .5) * 5.2, ry: -side * (.75 + rand() * .5), rz: (rand() - .5) * .35, s: .55 + rand() * .9, seed: rand() }); }

  const loadTex = (src) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([14, 22, 34, 255]));
    const img = new Image();
    img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
    img.src = src;
    return t;
  };
  const tex = PROJECTS.map((pr) => loadTex(`./covers/${pr.slug}.webp`));
  const ptex = PRACTICES.map((_, i) => loadTex(`./practice/practice-0${i + 1}.webp`));
  R = { bg, pane, tr, st, bgVao, paneVao, trVao, stVao, TRAILS, SEG, STARS, ghosts, tex, ptex };
}

let W = 1, H = 1, DPR = 1, dockD = 4.4;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, innerWidth > 2200 ? 1 : 1.5);
  W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
  if (gl) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
  const aspect = innerWidth / innerHeight, th = Math.tan(FOV / 2);
  // dock distance: pane fills ~70% of height, or ~86% of width on narrow screens
  dockD = Math.max(PH / (2 * th * 0.7), PW / (2 * th * aspect * 0.86));
}

/* scroll → progress (in stops: 0 = title plate, 1..N = projects) */
const unit = () => innerHeight * 1.1;
const pracEl = $("#practice"), lens = $("#lens");
function readScroll() {
  S.pT = clamp(scrollY / unit(), 0, N); S.past = scrollY > unit() * (N + 0.4);
  const top = pracEl.offsetTop, span = pracEl.offsetHeight - innerHeight, ih = innerHeight;
  S.prQ = clamp((scrollY - top) / span, 0, 1);
  S.prIn = sstep(top - ih, top, scrollY);                                   // approach (camera leaves the corridor)
  S.prV = sstep(top - ih * 0.55, top - ih * 0.05, scrollY) * (1 - sstep(top + span, top + span + ih * 0.5, scrollY));
  const idx = S.prV > 0.02 ? Math.min(3, Math.floor(S.prQ * 3.999)) : -1;
  if (idx !== S.prIdx) setPractice(idx);
  if (idx >= 0) document.querySelectorAll(".row").forEach((r, k) => r.style.setProperty("--w", k === idx ? (S.prQ * 4 - idx).toFixed(3) : 0));
}
const easeStop = (p) => { const s = Math.floor(p), f = p - s; return s + mix(f, f * f * f * (f * (6 * f - 15) + 10), 0.8); };
function tintAt(pe) {
  const list = [PLATE_TINT, ...PROJECTS.map((p) => p.tint)];
  const i = clamp(Math.floor(pe), 0, N), j = Math.min(N, i + 1), f = sstep(0.15, 0.85, pe - i);
  const pt = PRACTICES[Math.max(0, S.prIdx)].tint;
  return [0, 1, 2].map((k) => mix(mix(list[i][k], list[j][k], f), pt[k], S.prV));
}

/* per-frame pane pose */
function panePose(i, camZ) {
  const z = -(i + 1) * D, d = camZ - z, side = i % 2 ? -1 : 1;
  if (d < 0.25) return null;
  let x = 0, y = 0.1, ry = 0, alpha = 1, dim = 1, blur = 0, sc = 1;
  if (d >= dockD) {                       // approaching: slides in from the corridor wall
    const u = (d - dockD) / D, e = sstep(0, 1, Math.min(u, 1));
    x = side * (3.5 * e + Math.max(0, u - 1) * 0.9); y = 0.1 + side * 0.35 * e - Math.max(0, u - 1) * 0.25;
    ry = -side * 0.95 * e; dim = mix(1, 0.34, e); blur = Math.min(u, 2.5) * 2.1;
    alpha = sstep(4.2, 2.6, u);
  } else {                                // passing through the glass
    const v = (dockD - d) / (dockD - 0.25);
    alpha = 1 - sstep(0.12, 0.8, v); sc = 1 + v * 0.22; blur = v * 3; x = -side * v * 0.5;
  }
  return { z, d, x, y, ry, alpha, dim, blur, sc };
}

const hit = $("#hit"), cap = $("#cap"), plate = $("#plate");
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, (now - (frame.t || now)) / 1000); frame.t = now;
  const k = 1 - Math.pow(0.001, dt);           // framerate-independent smoothing
  if (S.motion && !S.caseOpen) S.time += dt;
  S.p = S.motion ? mix(S.p, S.pT, clamp(k * 0.75, 0, 1)) : S.pT;
  S.focusT = S.entered ? 1 : S.gateNear * 0.28;
  S.focus = mix(S.focus, S.focusT, clamp(k * (S.entered ? 0.32 : 0.6), 0, 1));
  S.mx = mix(S.mx, S.mxT, k * 0.5); S.my = mix(S.my, S.myT, k * 0.5); S.hover = mix(S.hover, S.hoverT, k);

  const pe = easeStop(S.p), fo = S.focus, enter = sstep(0, 1, fo);
  const camZ = dockD - pe * D + (1 - enter) * 7.5 - S.prIn * 6.5 - S.prQ * 14;
  if (S.prT < 1) S.prT = Math.min(1, S.prT + (S.motion ? dt / 0.95 : 1));
  const tint = tintAt(pe);
  const aspect = W / H;
  const P = M.persp(FOV, aspect, 0.1, 200);
  const V = M.mul(M.mul(M.rotX(S.my * 0.022), M.rotY(-S.mx * 0.034)), M.trans(-S.mx * 0.28, S.my * 0.18, -camZ));
  const VP = M.mul(P, V);

  /* ── DOM sync ── */
  const active = S.entered && !S.past ? Math.round(S.p) - 1 : -2;       // -1 = title plate
  const settle = 1 - Math.min(1, Math.abs(S.p - Math.round(S.p)) * 2.6);  // 1 when resting on a stop
  plate.style.setProperty("--o", (S.entered && !S.past ? sstep(0.55, 0, S.p) * sstep(0.6, 1, fo) : 0).toFixed(3));
  if (active !== S.active) { S.active = active; onActive(active); }
  const showCap = active >= 0 && settle > 0.45;
  cap.classList.toggle("on", showCap); hit.classList.toggle("on", active >= 0 && settle > 0.7);
  $("#pager").style.opacity = S.past ? 0 : "";
  if (active >= 0) {
    const pose = panePose(active, camZ);
    if (pose) {
      const Mm = M.mul(VP, M.mul(M.trans(pose.x, pose.y, pose.z), M.mul(M.rotY(pose.ry), M.scale(PW * pose.sc, PH * pose.sc))));
      const a = M.xf(Mm, -.5, .5), b = M.xf(Mm, .5, -.5);
      const l = (a[0] * .5 + .5) * innerWidth, t = (1 - (a[1] * .5 + .5)) * innerHeight, r = (b[0] * .5 + .5) * innerWidth, bt = (1 - (b[1] * .5 + .5)) * innerHeight;
      hit.style.transform = `translate(${l}px,${t}px)`; hit.style.width = r - l + "px"; hit.style.height = bt - t + "px";
      cap.style.transform = `translate(${Math.max(16, l)}px,${Math.min(innerHeight - 150, bt + 20)}px)`;
    }
  }
  if (!gl || !R) return;

  /* ── draw ── */
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  const t2 = [tint[2], tint[0] * .8 + .2, tint[1]];
  gl.useProgram(R.bg.p); gl.bindVertexArray(R.bgVao);
  gl.uniform2f(R.bg.u.uRes, W, H); gl.uniform2f(R.bg.u.uMouse, S.mx, S.my); gl.uniform1f(R.bg.u.uTime, S.time); gl.uniform1f(R.bg.u.uCamZ, camZ);
  gl.uniform1f(R.bg.u.uCore, mix(1, 0.55, sstep(0.3, 1, S.p)) * mix(0.5, 1, enter) * mix(1, 0.7, S.prV)); gl.uniform1f(R.bg.u.uFocus, enter);
  gl.uniform3fv(R.bg.u.uTint, tint); gl.uniform3fv(R.bg.u.uTint2, t2);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(R.st.p); gl.bindVertexArray(R.stVao);
  gl.uniformMatrix4fv(R.st.u.uVP, false, VP); gl.uniform1f(R.st.u.uCamZ, camZ); gl.uniform1f(R.st.u.uDefocus, 1 - enter);
  gl.uniform1f(R.st.u.uFocusD, dockD); gl.uniform1f(R.st.u.uPx, H / 900); gl.uniform3fv(R.st.u.uTint, tint);
  gl.drawArrays(gl.POINTS, 0, R.STARS);

  gl.useProgram(R.tr.p); gl.bindVertexArray(R.trVao);
  gl.uniformMatrix4fv(R.tr.u.uVP, false, VP); gl.uniform1f(R.tr.u.uCamZ, camZ); gl.uniform1f(R.tr.u.uTime, S.time);
  gl.uniform1f(R.tr.u.uAspect, aspect); gl.uniform2f(R.tr.u.uRes, W, H); gl.uniform3fv(R.tr.u.uTint, tint);
  gl.uniform1f(R.tr.u.uGain, mix(.14, 1, enter) * (1 + S.hover * .25));
  for (let i = 0; i < R.TRAILS; i++) gl.drawArrays(gl.TRIANGLE_STRIP, i * R.SEG * 2, R.SEG * 2);
  // panes + ghosts, far → near
  const list = [];
  for (let i = 0; i < N; i++) { const p = panePose(i, camZ); if (p && p.alpha > 0.01 && p.d < 60) list.push({ ...p, i, ghost: 0 }); }
  for (const g of R.ghosts) { const d = camZ - g.z; if (d > 0.6 && d < 46) list.push({ ...g, d, ghost: 1 }); }
  list.sort((a, b) => b.d - a.d);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(R.pane.p); gl.bindVertexArray(R.paneVao);
  gl.uniform1f(R.pane.u.uTime, S.time); gl.uniform3fv(R.pane.u.uTint, tint); gl.uniform1i(R.pane.u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  const defocus = (1 - enter) * 4.2;
  gl.uniform1f(R.pane.u.uMix, 0); gl.uniform1f(R.pane.u.uResolve, 0); gl.uniform2f(R.pane.u.uTexScale, 1, 1); gl.uniform1i(R.pane.u.uTex2, 1);
  for (const o of list) {
    let m, w, h;
    if (o.ghost) {
      w = PW * o.s; h = PH * o.s * 1.25;
      m = M.mul(M.trans(o.x, o.y + Math.sin(S.time * .2 + o.seed * 30) * .12, o.z), M.mul(M.rotY(o.ry + Math.sin(S.time * .13 + o.seed * 9) * .06), M.mul(M.rotZ(o.rz), M.scale(w, h))));
      gl.uniform1f(R.pane.u.uGhost, 1); gl.uniform1f(R.pane.u.uAlpha, sstep(46, 30, o.d) * sstep(.6, 3.5, o.d) * mix(.45, 1, enter)); gl.uniform1f(R.pane.u.uBlur, Math.abs(o.d - dockD) * .12 + defocus);
      gl.uniform1f(R.pane.u.uHover, 0); gl.uniform1f(R.pane.u.uDim, 1);
    } else {
      w = PW * o.sc; h = PH * o.sc;
      const isA = o.i === active ? S.hover : 0;
      m = M.mul(M.trans(o.x, o.y, o.z), M.mul(M.rotY(o.ry + (o.i === active ? S.mx * .05 : 0)), M.mul(M.rotX(o.i === active ? -S.my * .035 : 0), M.scale(w, h))));
      gl.uniform1f(R.pane.u.uGhost, 0); gl.uniform1f(R.pane.u.uAlpha, o.alpha); gl.uniform1f(R.pane.u.uBlur, o.blur + defocus);
      gl.uniform1f(R.pane.u.uDim, o.dim * mix(.5, 1, enter)); gl.uniform1f(R.pane.u.uHover, isA);
      gl.bindTexture(gl.TEXTURE_2D, R.tex[o.i]);
    }
    gl.uniform2f(R.pane.u.uSize, w, h); gl.uniform1f(R.pane.u.uSeed, o.ghost ? o.seed : o.i * .137);
    gl.uniformMatrix4fv(R.pane.u.uMVP, false, M.mul(VP, m));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // practice lens: a screen-aligned glass pane locked to the DOM rect, resolving between images
  if (S.prV > 0.01) {
    const r = lens.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const iw = innerWidth, ih = innerHeight, la = r.width / r.height, ta = 4 / 3, e = sstep(0, 1, S.prT);
      const m = M.mul(M.trans(((r.left + r.right) / iw) - 1, 1 - ((r.top + r.bottom) / ih), 0), M.scale((r.width / iw) * 2, (r.height / ih) * 2));
      gl.uniformMatrix4fv(R.pane.u.uMVP, false, m); gl.uniform2f(R.pane.u.uSize, la * 2.3, 2.3);
      gl.uniform2f(R.pane.u.uTexScale, la > ta ? 1 : la / ta, la > ta ? ta / la : 1);
      gl.uniform1f(R.pane.u.uGhost, 0); gl.uniform1f(R.pane.u.uAlpha, S.prV); gl.uniform1f(R.pane.u.uDim, 1); gl.uniform1f(R.pane.u.uHover, 0.4);
      gl.uniform1f(R.pane.u.uBlur, (1 - S.prV) * 3.5); gl.uniform1f(R.pane.u.uSeed, 0.31 + S.prTo * 0.17);
      gl.uniform1f(R.pane.u.uMix, e); gl.uniform1f(R.pane.u.uResolve, Math.min(1, Math.sin(Math.PI * S.prT) * 0.95 + (1 - S.prV) * 0.9));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.ptex[S.prTo]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.ptex[S.prFrom]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  gl.bindVertexArray(null);
}

/* ───────────── fields of practice ───────────── */
function buildRows() {
  const pt = S.lang === "pt", rows = $("#rows"); rows.innerHTML = "";
  PRACTICES.forEach((p, k) => {
    const li = document.createElement("li"); li.className = "row" + (k === S.prIdx ? " on" : "");
    li.innerHTML = `<button class="row__btn" type="button" aria-expanded="${k === S.prIdx}"><span class="row__i">0${k + 1}</span><span class="row__t">${pt ? p.tp : p.t}</span><span class="row__k">${pt ? p.kp : p.k}</span></button>
      <div class="row__panel"><div class="row__in"><p>${pt ? p.dp : p.d}</p><div class="chips"></div></div></div>`.replace(/&(?!amp;)/g, "&amp;");
    li.querySelector(".row__btn").onclick = () => { const span = pracEl.offsetHeight - innerHeight; scrollTo({ top: pracEl.offsetTop + ((k + 0.35) / 4) * span, behavior: S.motion ? "smooth" : "auto" }); };
    const chips = li.querySelector(".chips");
    (p.rel.length ? p.rel : [-1]).forEach((i) => { const b = document.createElement("button"); b.type = "button";
      if (i < 0) { b.textContent = pt ? "Case placeholder" : "Case placeholder"; b.disabled = true; b.style.opacity = ".5"; }
      else { b.textContent = PROJECTS[i].title.split(" — ").pop(); b.onclick = () => goTo(i + 1); }
      chips.appendChild(b); });
    rows.appendChild(li);
  });
  setLensMeta();
}
function setLensMeta() { const i = Math.max(0, S.prIdx), p = PRACTICES[i];
  $("#lensIdx").textContent = `0${i + 1} / 04`; $("#lensFocus").textContent = S.lang === "pt" ? p.kp : p.k;
  lens.style.setProperty("--cover", `url(./practice/practice-0${i + 1}.webp)`); }
function setPractice(idx) {
  const prev = S.prIdx; S.prIdx = idx;
  document.querySelectorAll(".row").forEach((r, k) => { r.classList.toggle("on", k === idx); r.querySelector(".row__btn").setAttribute("aria-expanded", k === idx); });
  if (idx < 0) return;
  if (prev < 0) { S.prFrom = S.prTo = idx; S.prT = 1; } else { S.prFrom = S.prTo; S.prTo = idx; S.prT = 0; }
  setLensMeta();
}

/* ───────────── DOM behaviour ───────────── */
const pad = (n) => String(n).padStart(2, "0");
function onActive(i) {
  $("#count").textContent = pad(Math.max(0, i + 1));
  document.querySelectorAll("#pager li").forEach((li, k) => li.classList.toggle("on", k === i + 1));
  if (i < 0) return;
  const pr = PROJECTS[i];
  $("#capIdx").textContent = pad(i + 1); $("#capDisc").textContent = pr.disc; $("#capTitle").textContent = pr.title;
  $("#capCtx").textContent = S.lang === "pt" ? pr.pt : pr.ctx;
  document.documentElement.style.setProperty("--tint", `rgb(${pr.tint.map((v) => Math.round(v * 255)).join(",")})`);
  hit.style.setProperty("--cover", `url(./covers/${pr.slug}.webp)`);
}
function goTo(stop) { scrollTo({ top: stop * unit() + 1, behavior: S.motion ? "smooth" : "auto" }); }

// pager
const pager = $("#pager");
["Intro", ...PROJECTS.map((p) => p.title.split(" — ").pop())].forEach((label, k) => {
  const li = document.createElement("li"), b = document.createElement("button");
  b.type = "button"; b.textContent = label; b.setAttribute("aria-label", label); b.onclick = () => goTo(k); li.appendChild(b); pager.appendChild(li);
});
$("#total").textContent = "/ " + pad(N);
$("#gallery").style.setProperty("--stops", N + 1);

// gate
const gate = $("#gate"), needle = $("#needle");
function enter() {
  if (S.entered) return; S.entered = true; document.body.classList.remove("is-gate"); scrollTo(0, 0); readScroll();
}
gate.addEventListener("click", enter);
addEventListener("pointermove", (e) => {
  S.mxT = (e.clientX / innerWidth) * 2 - 1; S.myT = (e.clientY / innerHeight) * 2 - 1;
  if (!S.entered) {
    const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2, r = Math.hypot(dx, dy) / (Math.min(innerWidth, innerHeight) * 0.5);
    S.gateNear = 1 - clamp(r, 0, 1);
    needle.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI + 90}deg)`;
    document.querySelectorAll(".ap").forEach((c, i) => (c.style.transform = `rotate(${i * 47 + S.gateNear * (60 + i * 25)}deg) scale(${1 - S.gateNear * 0.16})`));
  }
});
hit.addEventListener("pointerenter", () => (S.hoverT = 1)); hit.addEventListener("pointerleave", () => (S.hoverT = 0));
hit.addEventListener("focus", () => (S.hoverT = 1)); hit.addEventListener("blur", () => (S.hoverT = 0));

// case placeholder
const caseEl = $("#case");
function openCase(i) { const pr = PROJECTS[i]; if (!pr) return;
  $("#caseImg").src = `./covers/${pr.slug}.webp`; $("#caseImg").alt = pr.title + " — cover"; $("#caseTitle").textContent = pr.title; $("#caseDisc").textContent = pr.disc;
  caseEl.hidden = false; document.body.classList.add("is-case"); S.caseOpen = true; $("#caseX").focus(); }
function closeCase() { if (caseEl.hidden) return; caseEl.hidden = true; document.body.classList.remove("is-case"); S.caseOpen = false; hit.focus({ preventScroll: true }); }
hit.addEventListener("click", () => openCase(S.active));
$("#caseX").addEventListener("click", closeCase);
caseEl.addEventListener("click", (e) => { if (e.target === caseEl) closeCase(); });

addEventListener("keydown", (e) => {
  if (e.key === "Escape") return closeCase();
  if (S.caseOpen) return;
  if (!S.entered) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } return; }
  const cur = Math.round(S.pT);
  if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goTo(Math.min(N + 1.1, cur + 1)); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goTo(Math.max(0, cur - 1)); }
});

// dock
const EN = {}; document.querySelectorAll("[data-i18n]").forEach((el) => (EN[el.dataset.i18n] = el.textContent));
$("#lang").addEventListener("click", () => {
  S.lang = S.lang === "en" ? "pt" : "en"; document.documentElement.lang = S.lang === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("#lang b").forEach((b) => b.classList.toggle("on", b.dataset.l === S.lang));
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = (S.lang === "pt" && I18N.pt[el.dataset.i18n]) || EN[el.dataset.i18n]));
  setMotionLabel(); buildRows(); if (S.active >= 0) onActive(S.active);
});
const setMotionLabel = () => { $("#motionLbl").textContent = S.lang === "pt" ? (S.motion ? "Movimento on" : "Movimento off") : S.motion ? "Motion on" : "Motion off"; $("#motion").setAttribute("aria-pressed", S.motion); };
$("#motion").addEventListener("click", () => { S.motion = !S.motion; setMotionLabel(); });
setMotionLabel();

addEventListener("scroll", readScroll, { passive: true });
addEventListener("resize", () => { resize(); readScroll(); });
resize(); buildRows(); readScroll();
if (gl) { try { initGL(); } catch (err) { console.error("[FineTune] WebGL init failed:", err); document.documentElement.classList.add("no-gl"); R = null; } }
if (new URLSearchParams(location.search).has("skip") || location.hash === "#gallery") enter();
window.__ft = { S, goTo, enter };
requestAnimationFrame(frame);
