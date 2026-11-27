// FineTune v4 — the background: a spiral nebula, procedural light trails, bokeh dust and the
// black-hole exit used by "Get in touch". Ported from v3 (raw WebGL2, no dependencies); the
// glass corridor is gone — work is shown in the page, the galaxy is atmosphere only.
//
//   const g = createGalaxy(canvas, { lite });
//   g.frame({ time, mx, my, camZ, tint, core, focus, trails, lines });   // once per rAF
//   g.hole(x, y);   // starts the 1.2 s black hole at a screen point (CSS px)

const COMMON = `#version 300 es
precision highp float;
vec3 spectrum(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.33,0.67))); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
`;
const FULL_VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }`;

// uniforms: uRes px, uMouse -1..1, uTime s, uCamZ world z of the camera, uCore core/streak gain,
// uFocus 0..1 overall exposure, uLines filament gain, uShift horizontal offset of the core (screen units)
const BG_FS = COMMON + `
uniform vec2 uRes,uMouse; uniform float uTime,uCamZ,uCore,uFocus,uLines,uShift; uniform vec3 uTint,uTint2; out vec4 o;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv.x-=uShift; uv-=uMouse*vec2(.035,-.035);
  float r=length(uv), a=atan(uv.y,uv.x);
  float sw=a+1.5/(r+.38)+uTime*.012-uCamZ*.022;
  vec2 q=vec2(cos(sw),sin(sw))*r;
  float n=fbm(q*2.1+vec2(0.,uCamZ*.03)); float n2=fbm(q*4.4-vec2(uTime*.008,3.)+n*1.3);
  float arms=pow(.5+.5*sin(sw*2.+n*3.2+log(r+.05)*3.2),3.);
  float neb=smoothstep(.34,.98,n*.72+n2*.5)*(.22+.78*arms)*exp(-r*1.05);
  vec3 col=vec3(.018,.032,.052)+vec3(.0,.012,.03)*(1.-r);
  col+=neb*mix(uTint,uTint2,n2)*.62;
  float fil=pow(.5+.5*sin(log(r+.02)*26.+sw*3.+n*6.),24.)*exp(-r*1.6)*smoothstep(.05,.25,r);
  col+=fil*mix(uTint,vec3(.9,.95,1.),.5)*.09*uLines;
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
// light trails: screen-space ribbons along helical paths anchored in world space
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
// bokeh dust: world-anchored points whose size grows away from the focal plane
const ST_VS = `#version 300 es
in vec4 aSeed; uniform mat4 uVP; uniform float uCamZ,uFocusD,uPx; out float vA; out float vK;
void main(){
  vec2 xy=aSeed.xy*vec2(15.,9.); float l=length(xy); if(l<1.7) xy*=1.7/max(l,.01);
  float d=mod(uCamZ+aSeed.z*90.,90.)+.4;
  gl_Position=uVP*vec4(xy,uCamZ-d,1.);
  float coc=abs(d-uFocusD)/d;
  float size=(1.6+aSeed.w*3.4+coc*6.)*uPx/max(d*.22,.35);
  gl_PointSize=clamp(size,1.,64.);
  vA=smoothstep(90.,50.,d)*smoothstep(.4,2.5,d)*(.35+aSeed.w*.65)/(1.+size*size*.012); vK=aSeed.w;
}`;
const ST_FS = `#version 300 es
precision highp float; in float vA; in float vK; uniform vec3 uTint; out vec4 o;
void main(){ float r=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.82,r)*(.55+.45*smoothstep(.4,.95,r));
  vec3 c=mix(vec3(.92,.96,1.),mix(vec3(1.,.8,.55),uTint,step(.5,vK)),.55*fract(vK*7.)); o=vec4(c*a*vA,0.); }`;
// contact exit: a luminous black hole (accretion disc, photon ring, trails pulled in)
const BH_FS = COMMON + `
uniform vec2 uRes,uCenter; uniform float uRadius,uTime,uIntensity,uFlash,uDark; uniform vec3 uTint; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 frag=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y); vec2 d=frag-uCenter; float r=max(uRadius,1.); float dist=length(d); float ang=atan(d.y,d.x);
  float tilt=-.21; vec2 q=vec2(d.x*cos(tilt)-d.y*sin(tilt),d.x*sin(tilt)+d.y*cos(tilt)); q.y*=3.4; float qd=length(q)/r; float qa=atan(q.y,q.x);
  float streaks=.55+.45*sin(qa*3.+log(max(qd,1e-3))*9.-uTime*9.);
  float band=smoothstep(1.25,1.7,qd)*(1.-smoothstep(2.4,5.2,qd)); float doppler=.55+.45*cos(qa+.6);
  vec3 disc=mix(mix(spectrum(qa/6.2831+qd*.12+uTime*.2),uTint,.35),vec3(1.,.95,.9),.35)*band*streaks*doppler*1.9;
  float ring=exp(-pow((dist/r-1.06)*18.,2.))*2.6; vec3 ringCol=mix(spectrum(ang/6.2831+uTime*.3),vec3(1.),.55)*ring;
  float tr=pow(.5+.5*sin(ang*13.+log(max(dist/r,1e-3))*11.+uTime*12.+sin(ang*3.)*1.5),90.)*smoothstep(1.1,2.2,dist/r)*exp(-dist/(r*4.))*.9;
  vec3 glow=vec3(.55,.62,1.)*exp(-max(dist-r,0.)/(r*1.6))*.55;
  vec3 col=(disc+ringCol+glow+tr*mix(uTint,vec3(1.),.4))*uIntensity;
  float horizon=1.-smoothstep(r*.96,r,dist); col*=1.-horizon;
  col+=vec3(1.,.98,.95)*uFlash*exp(-max(dist-r,0.)/(r*.5+30.))*1.6*(1.-horizon);
  col=aces(col);
  float a=clamp(max(max(max(col.r,col.g),col.b)*1.2+horizon,uDark),0.,1.);
  o=vec4(col,a);
}`;

const persp = (f, a, n, fr) => { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, (2 * fr * n) / (n - fr), 0]; };
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function createGalaxy(canvas, { lite = false } = {}) {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const program = (vs, fs) => {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  };
  const bg = program(FULL_VS, BG_FS), tr = program(TR_VS, TR_FS), st = program(ST_VS, ST_FS), bh = program(FULL_VS, BH_FS);
  const vao = (prog, setup) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); setup(prog.p); gl.bindVertexArray(null); return v; };
  const buf = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); };
  const attr = (p, name, size, stride, off) => { const l = gl.getAttribLocation(p, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride, off); };
  const bgVao = vao(bg, (p) => { buf([-1, -1, 3, -1, -1, 3]); attr(p, "aPos", 2, 0, 0); });
  let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  const TRAILS = lite ? 22 : 44, SEG = lite ? 90 : 150, tv = [];
  for (let i = 0; i < TRAILS; i++) { const s = [rand(), rand(), Math.pow(rand(), 1.4), rand()]; for (let j = 0; j < SEG; j++) { const t = j / (SEG - 1); tv.push(t, -1, ...s, t, 1, ...s); } }
  const trVao = vao(tr, (p) => { buf(tv); attr(p, "aTS", 2, 24, 0); attr(p, "aSeed", 4, 24, 8); });
  const STARS = lite ? 0 : 1300, sv = [];
  for (let i = 0; i < STARS; i++) sv.push(rand() * 2 - 1, rand() * 2 - 1, rand(), rand());
  const stVao = vao(st, (p) => { buf(sv.length ? sv : [0, 0, 0, 0]); attr(p, "aSeed", 4, 0, 0); });

  let W = 1, H = 1, DPR = 1, hole = null;
  const FOV = (38 * Math.PI) / 180;
  const resize = () => {
    DPR = lite ? 1 : Math.min(window.devicePixelRatio || 1, innerWidth > 2200 ? 1 : 1.5);
    W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
    canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
  };
  resize(); addEventListener("resize", resize);

  function frame(s) {
    const aspect = W / H, VP = mul(persp(FOV, aspect, 0.1, 200), mul(mul(rotX(s.my * 0.022), rotY(-s.mx * 0.034)), trans(-s.mx * 0.28, s.my * 0.18, -s.camZ)));
    const t2 = [s.tint[2], s.tint[0] * 0.8 + 0.2, s.tint[1]];
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(bg.p); gl.bindVertexArray(bgVao);
    gl.uniform2f(bg.u.uRes, W, H); gl.uniform2f(bg.u.uMouse, s.mx, s.my); gl.uniform1f(bg.u.uTime, s.time); gl.uniform1f(bg.u.uCamZ, s.camZ);
    gl.uniform1f(bg.u.uCore, s.core); gl.uniform1f(bg.u.uFocus, s.focus); gl.uniform1f(bg.u.uLines, s.lines); gl.uniform1f(bg.u.uShift, s.shift || 0);
    gl.uniform3fv(bg.u.uTint, s.tint); gl.uniform3fv(bg.u.uTint2, t2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (STARS) {
      gl.useProgram(st.p); gl.bindVertexArray(stVao);
      gl.uniformMatrix4fv(st.u.uVP, false, VP); gl.uniform1f(st.u.uCamZ, s.camZ); gl.uniform1f(st.u.uFocusD, 4.4);
      gl.uniform1f(st.u.uPx, (H / 900) * clamp(1100 / innerHeight, 0.75, 1)); gl.uniform3fv(st.u.uTint, s.tint);
      gl.drawArrays(gl.POINTS, 0, STARS);
    }
    if (s.trails > 0.005) {
      gl.useProgram(tr.p); gl.bindVertexArray(trVao);
      gl.uniformMatrix4fv(tr.u.uVP, false, VP); gl.uniform1f(tr.u.uCamZ, s.camZ); gl.uniform1f(tr.u.uTime, s.time);
      gl.uniform1f(tr.u.uAspect, aspect); gl.uniform2f(tr.u.uRes, W, H); gl.uniform3fv(tr.u.uTint, s.tint); gl.uniform1f(tr.u.uGain, s.trails);
      for (let i = 0; i < TRAILS; i++) gl.drawArrays(gl.TRIANGLE_STRIP, i * SEG * 2, SEG * 2);
    }
    if (hole) {
      const t = (performance.now() - hole.t0) / 1000, u = clamp(t / 1.2, 0, 1), diag = Math.hypot(W, H);
      const grow = sstep(0, 0.62, u), swallow = sstep(0.6, 0.98, u), back = sstep(1.2, 1.75, t);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(bh.p); gl.bindVertexArray(bgVao);
      gl.uniform2f(bh.u.uRes, W, H); gl.uniform2f(bh.u.uCenter, hole.x * DPR, hole.y * DPR);
      gl.uniform1f(bh.u.uRadius, (grow * Math.min(W, H) * 0.13 + swallow * swallow * diag) * (1 - back));
      gl.uniform1f(bh.u.uTime, t); gl.uniform1f(bh.u.uIntensity, sstep(0, 0.18, u) * (1 - back));
      gl.uniform1f(bh.u.uFlash, Math.exp(-Math.pow((u - 0.66) * 9, 2)) * 0.9); gl.uniform1f(bh.u.uDark, sstep(0.25, 0.9, u) * (1 - back));
      gl.uniform3fv(bh.u.uTint, s.tint); gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t > 1.8) hole = null;
    }
    gl.bindVertexArray(null);
  }
  return { frame, resize, hole: (x, y) => { hole = { x, y, t0: performance.now() }; }, get busy() { return !!hole; } };
}
