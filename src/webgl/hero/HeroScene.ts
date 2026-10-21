import {
  bindTarget,
  bindTexture,
  createMsaa,
  createTarget,
  disposeMsaa,
  disposeTarget,
  resolveMsaa,
  ShaderError,
  type MsaaTarget,
  type Target,
} from "../gl";
import { lookAt, mat4, modelYX, perspective } from "../math";
import { params } from "../params";
import { QUALITY, downgrade, type QualityPreset } from "../quality";
import { state, TEMPO } from "../../state";
import type { Quality } from "../../state";
import { damp } from "../../utils/lerp";
import { LightTrails } from "./LightTrails";
import { OpticalObject, type OpticalShape } from "./OpticalObject";
import { HeroPost } from "./HeroPost";

export interface HeroStats {
  fps: number;
  quality: Quality;
  width: number;
  height: number;
  drawCalls: number;
  triangles: number;
}

/** Wider lens + closer camera: forced perspective on the disc (round 4). */
const FOV = (52 * Math.PI) / 180;
/** Point of interest — the crystal at the galaxy's centre. */
const POI = { x: 0, y: 0.05, z: 0 };
/** ?shape=twist restores the previous glass column. */
const SHAPE: OpticalShape =
  new URLSearchParams(window.location.search).get("shape") === "twist" ? "twist" : "crystal";

/**
 * FineTune hero — a real-time light vortex around a glass core.
 *
 * Passes per frame:
 *   1. trails → refraction target (low-res, mipmapped)
 *   2. glass (refracts pass 1, writes depth) + trails + dust → HDR scene target
 *   3. post: bloom pyramid, focus band, chromatic aberration, tonemap → canvas
 *
 * Reads the shared FineTuneState (pointer, heroProgress, reducedMotion); owns no
 * global listeners besides resize/visibility/context-loss on its own canvas.
 */
export class HeroScene {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private hdr: boolean;
  private quality: Quality;
  private preset: QualityPreset;

  private trails!: LightTrails;
  private glass!: OpticalObject;
  private post!: HeroPost;
  private refr: Target | null = null;
  private scene: Target | null = null;
  private msaa: MsaaTarget | null = null;

  private proj = mat4();
  private view = mat4();
  private model = mat4();

  private raf = 0;
  private running = false;
  private visible = true;
  private last = 0;
  private time = 0;
  private pointer = { x: 0.25, y: 0.1 };
  private cam = { x: 0, y: 0.35, z: 6.6 };
  private orbit = { yaw: 0, pitch: 0.06, dist: 6.6 };
  private focusUv: [number, number] = [0.67, 0.5];
  private frames = 0;
  private fpsWindowStart = 0;
  private probeDone = false;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private onFirstFrame: (() => void) | null;
  private onFail: (reason: string) => void;
  stats: HeroStats;

  constructor(
    private host: HTMLElement,
    quality: Quality,
    callbacks: { onFirstFrame: () => void; onFail: (reason: string) => void },
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "hero__canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    host.append(this.canvas);
    this.onFirstFrame = callbacks.onFirstFrame;
    this.onFail = callbacks.onFail;

    const gl = this.canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new ShaderError("WebGL2 unavailable");
    this.gl = gl;
    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    this.quality = quality;
    this.preset = QUALITY[quality];
    this.stats = { fps: 0, quality, width: 0, height: 0, drawCalls: 0, triangles: 0 };

    this.build();
    this.bindLifecycle();
    this.resize();
  }

  // ---------------------------------------------------------------------------
  private build(): void {
    const gl = this.gl;
    const p = this.preset;
    this.trails = new LightTrails(gl, p.ribbons, p.segments, p.particles);
    this.glass = new OpticalObject(gl, this.quality === "low" ? 0.6 : 1, SHAPE);
    this.post = new HeroPost(gl, this.hdr, p.bloomLevels);
  }

  private teardown(): void {
    const gl = this.gl;
    this.trails?.dispose();
    this.glass?.dispose();
    this.post?.dispose();
    disposeTarget(gl, this.refr);
    disposeTarget(gl, this.scene);
    disposeMsaa(gl, this.msaa);
    this.refr = null;
    this.scene = null;
    this.msaa = null;
  }

  private bindLifecycle(): void {
    this.canvas.addEventListener("webglcontextlost", this.handleLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleRestored, false);

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting && entry.intersectionRatio > 0.02;
        if (this.visible) this.start();
        else this.stop();
      },
      { threshold: [0, 0.02, 0.2] },
    );
    this.io.observe(this.host);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  private handleVisibility = (): void => {
    if (document.hidden) this.stop();
    else if (this.visible) this.start();
  };

  private handleLost = (event: Event): void => {
    event.preventDefault();
    this.stop();
    this.onFail("context-lost");
  };

  private handleRestored = (): void => {
    try {
      this.build();
      this.resize();
      this.start();
    } catch (err) {
      this.onFail(String(err));
    }
  };

  // ---------------------------------------------------------------------------
  resize(): void {
    const gl = this.gl;
    const rect = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * this.preset.scale;
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (w === this.canvas.width && h === this.canvas.height && this.scene) return;
    this.canvas.width = w;
    this.canvas.height = h;

    disposeTarget(gl, this.refr);
    disposeTarget(gl, this.scene);
    disposeMsaa(gl, this.msaa);
    const rs = this.preset.refractionScale;
    this.refr = createTarget(gl, w * rs, h * rs, this.hdr);
    gl.bindTexture(gl.TEXTURE_2D, this.refr.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    this.scene = createTarget(gl, w, h, this.hdr, true);
    this.msaa = this.preset.msaa ? createMsaa(gl, w, h, this.hdr, this.preset.msaa) : null;
    this.post.resize(w, h);
    this.stats.width = w;
    this.stats.height = h;
    if (!this.running) this.renderFrame(0); // keep a valid still frame (reduced motion / paused)
  }

  start(): void {
    if (this.running || state.reducedMotion) {
      if (state.reducedMotion) this.renderFrame(0);
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.fpsWindowStart = this.last;
    this.frames = 0;
    const loop = (now: number): void => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.renderFrame(dt);
      this.measure(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** FPS probe: one downgrade step if the first seconds run below ~40 fps. */
  private measure(now: number): void {
    this.frames++;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < 1000) return;
    this.stats.fps = Math.round((this.frames * 1000) / elapsed);
    this.frames = 0;
    this.fpsWindowStart = now;
    if (!this.probeDone && this.time > 2.5) {
      this.probeDone = true;
      if (this.stats.fps < 40 && this.quality !== "low") this.setQuality(downgrade(this.quality));
    }
  }

  setQuality(q: Quality): void {
    this.quality = q;
    this.preset = QUALITY[q];
    this.stats.quality = q;
    this.teardown();
    this.build();
    this.canvas.width = 0; // force target rebuild
    this.resize();
  }

  // ---------------------------------------------------------------------------
  private renderFrame(dt: number): void {
    const gl = this.gl;
    if (!this.scene || !this.refr || gl.isContextLost()) return;
    if (state.heroCover > 0.985 && this.onFirstFrame === null) return; // fully covered by the next slide
    if (state.hold && this.onFirstFrame === null) return; // "Let's talk" black hole is playing

    const reduced = state.reducedMotion;
    this.time = reduced ? 14.0 : this.time + dt * TEMPO;
    const t = this.time;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspect = w / h;
    const wide = aspect > 1.15;

    // --- pointer: real input when present, slow autopilot otherwise -----------
    const hasPointer = state.pointerActive && !reduced;
    const rect = this.host.getBoundingClientRect();
    let tx: number;
    let ty: number;
    if (hasPointer) {
      tx = ((state.pointerClient.x - rect.left) / rect.width) * 2 - 1;
      ty = -(((state.pointerClient.y - rect.top) / rect.height) * 2 - 1);
    } else {
      tx = Math.sin(t * 0.21) * 0.45 + 0.25;
      ty = Math.sin(t * 0.17 + 1.3) * 0.3;
    }
    this.pointer.x = damp(this.pointer.x, tx, 0.06, dt || 1);
    this.pointer.y = damp(this.pointer.y, ty, 0.06, dt || 1);

    // --- camera: orbits the crystal (point of interest) with the pointer -------
    // Yaw/pitch around the POI accentuate parallax: near ribbons sweep across
    // far ones while the crystal stays the fixed centre. Scroll pushes back.
    const scroll = Math.min(1, state.heroProgress * params.scrollInfluence);
    const par = params.parallaxStrength * (reduced ? 0 : 1);
    const crystal = this.glass.shape === "crystal";
    const yawT = this.pointer.x * 0.55 * par;
    const pitchT = 0.07 - this.pointer.y * 0.32 * par + scroll * 0.1;
    const distT = (wide ? (crystal ? 6.6 : 7.4) : 12.5) + scroll * 3.6;
    this.orbit.yaw = damp(this.orbit.yaw, yawT, 0.045, dt || 1);
    this.orbit.pitch = damp(this.orbit.pitch, pitchT, 0.045, dt || 1);
    this.orbit.dist = damp(this.orbit.dist, distT, 0.08, dt || 1);
    const cp = Math.cos(this.orbit.pitch);
    this.cam.x = POI.x + Math.sin(this.orbit.yaw) * cp * this.orbit.dist;
    this.cam.y = POI.y + Math.sin(this.orbit.pitch) * this.orbit.dist;
    this.cam.z = POI.z + Math.cos(this.orbit.yaw) * cp * this.orbit.dist;

    perspective(this.proj, FOV, aspect, 0.1, 80);
    lookAt(this.view, this.cam.x, this.cam.y, this.cam.z, POI.x, POI.y, POI.z);
    // the crystal turns slowly on its own axis and tumbles a little
    modelYX(
      this.model,
      t * params.sceneRotation * (crystal ? 2.2 : 1),
      (crystal ? 0.38 + Math.sin(t * 0.13) * 0.12 : 0.06) + this.pointer.y * 0.05,
      0, 0, 0,
    );

    // off-axis framing: right of the copy on desktop, upper area on mobile
    const lensX = wide ? 0.38 : 0.0;
    const lensY = wide ? 0.0 : 0.5;

    // pointer on the z=0 plane in world units (for gravitational bending)
    const halfH = Math.tan(FOV / 2) * this.orbit.dist;
    const px = (this.pointer.x - lensX) * halfH * aspect + POI.x;
    const py = (this.pointer.y - lensY) * halfH + POI.y;

    const intensity = params.trailIntensity * (1 - scroll * 0.35);
    const ribbonCount = Math.max(8, Math.round(this.trails.maxRibbons * Math.min(1, params.trailCount)));
    this.trails.ribbonCount = ribbonCount;

    let draws = 0;

    // ---------------- pass 1: trails → refraction source ---------------------
    bindTarget(gl, this.refr);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.setTrailUniforms(this.refr.width, this.refr.height, intensity, scroll, px, py, lensX, lensY);
    this.trails.drawRibbons();
    draws++;
    gl.bindTexture(gl.TEXTURE_2D, this.refr.tex);
    gl.generateMipmap(gl.TEXTURE_2D);

    // ---------------- pass 2: glass + trails + dust → scene ------------------
    // Rendered into an MSAA buffer when available (clean thin beams), then resolved.
    if (this.msaa) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa.fbo);
      gl.viewport(0, 0, this.msaa.width, this.msaa.height);
    } else {
      bindTarget(gl, this.scene);
    }
    gl.clearColor(0.004, 0.008, 0.016, 1);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const g = this.glass.program;
    g.use();
    gl.uniformMatrix4fv(g.uniform("uProj"), false, this.proj);
    gl.uniformMatrix4fv(g.uniform("uView"), false, this.view);
    gl.uniformMatrix4fv(g.uniform("uModel"), false, this.model);
    gl.uniform2f(g.uniform("uLensShift"), lensX, lensY);
    gl.uniform1f(g.uniform("uTime"), t);
    gl.uniform1f(g.uniform("uShape"), crystal ? 1 : 0);
    gl.uniform3f(g.uniform("uCamPos"), this.cam.x, this.cam.y, this.cam.z);
    gl.uniform1f(g.uniform("uRefraction"), params.refractionStrength * (1 + Math.hypot(this.pointer.x - 0.3, this.pointer.y) * 0.25));
    gl.uniform1f(g.uniform("uIOR"), params.glassIOR);
    gl.uniform1f(g.uniform("uFresnel"), params.fresnelStrength);
    gl.uniform2f(g.uniform("uPointerScreen"), this.pointer.x * 0.5 + 0.5, this.pointer.y * 0.5 + 0.5);
    bindTexture(gl, g, "uScene", this.refr.tex, 0);

    // 2a. glass — opaque, owns depth; its ends blend into the light behind it
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    this.glass.draw();
    draws++;

    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.depthFunc(gl.LEQUAL);
    // 2c. trails (additive), hidden only behind the solid core
    gl.blendFunc(gl.ONE, gl.ONE);
    this.setTrailUniforms(w, h, intensity, scroll, px, py, lensX, lensY);
    this.trails.drawRibbons();
    draws++;

    const d = this.trails.dust;
    d.use();
    gl.uniformMatrix4fv(d.uniform("uProj"), false, this.proj);
    gl.uniformMatrix4fv(d.uniform("uView"), false, this.view);
    gl.uniform2f(d.uniform("uLensShift"), lensX, lensY);
    gl.uniform1f(d.uniform("uPixelRatio"), w / Math.max(1, this.host.clientWidth));
    this.setVortexUniforms(d, scroll, px, py);
    gl.uniform1f(d.uniform("uIntensity"), intensity * 1.4);
    this.trails.drawDust();
    draws++;
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    if (this.msaa) resolveMsaa(gl, this.msaa, this.scene);

    // ---------------- pass 3: post → canvas -----------------------------------
    // focus centre = the crystal on screen (view → clip, plus lens shift)
    const v = this.view;
    const vx = v[0] * POI.x + v[4] * POI.y + v[8] * POI.z + v[12];
    const vy = v[1] * POI.x + v[5] * POI.y + v[9] * POI.z + v[13];
    const vz = v[2] * POI.x + v[6] * POI.y + v[10] * POI.z + v[14];
    const cw = -vz;
    if (cw > 0.01) {
      this.focusUv[0] = ((this.proj[0] * vx) / cw + lensX) * 0.5 + 0.5;
      this.focusUv[1] = ((this.proj[5] * vy) / cw + lensY) * 0.5 + 0.5;
    }
    const pointerUv: [number, number] = hasPointer
      ? [this.pointer.x * 0.5 + 0.5, this.pointer.y * 0.5 + 0.5]
      : [-2, -2]; // lens only follows a real cursor
    this.post.render(this.scene, w, h, {
      bloomStrength: params.bloomStrength,
      bloomThreshold: params.bloomThreshold,
      exposure: params.exposure,
      chromatic: params.chromaticAberration,
      focusY: this.focusUv[1] + (params.focusDistance - 0.48) + this.pointer.y * 0.05 - scroll * 0.2,
      focusRange: params.focusRange,
      focusCenter: this.focusUv,
      focusRadius: wide ? 0.2 : 0.26,
      // flare sits at the crystal's lower front, where the burst leaves it
      flare: crystal
        ? [this.focusUv[0] - 0.01, this.focusUv[1] - (wide ? 0.1 : 0.06), (1 - scroll * 0.6) * params.flareStrength]
        : [0, 0, 0],
      focusOn: this.preset.focus,
      pointerUv,
      time: t,
      copyFade: wide ? [0.12, 0.5] : [-1, -0.5],
    });
    draws += 4 + this.preset.bloomLevels * 2;

    this.stats.drawCalls = draws;
    this.stats.triangles =
      ribbonCount * this.preset.segments * 2 * 2 + this.glass.triangleCount;

    if (this.onFirstFrame) {
      const cb = this.onFirstFrame;
      this.onFirstFrame = null;
      cb();
    }
  }

  private setVortexUniforms(p: LightTrails["ribbons"], scroll: number, px: number, py: number): void {
    const gl = this.gl;
    gl.uniform1f(p.uniform("uTime"), this.time);
    gl.uniform1f(p.uniform("uSpeed"), params.trailSpeed);
    gl.uniform1f(p.uniform("uScroll"), scroll);
    gl.uniform3f(p.uniform("uPointer"), px, py, 0);
    gl.uniform1f(p.uniform("uMouseInfluence"), state.reducedMotion ? 0 : params.mouseInfluence);
    gl.uniform1f(p.uniform("uNoiseScale"), params.noiseScale);
    gl.uniform1f(p.uniform("uNoiseSpeed"), params.noiseSpeed);
  }

  private setTrailUniforms(
    w: number, h: number, intensity: number, scroll: number,
    px: number, py: number, lensX: number, lensY: number,
  ): void {
    const gl = this.gl;
    const r = this.trails.ribbons;
    r.use();
    gl.uniformMatrix4fv(r.uniform("uProj"), false, this.proj);
    gl.uniformMatrix4fv(r.uniform("uView"), false, this.view);
    gl.uniform2f(r.uniform("uLensShift"), lensX, lensY);
    gl.uniform2f(r.uniform("uResolution"), w, h);
    gl.uniform1f(r.uniform("uPixelRatio"), w / Math.max(1, this.host.clientWidth));
    gl.uniform1f(r.uniform("uIntensity"), intensity);
    this.setVortexUniforms(r, scroll, px, py);
  }

  dispose(): void {
    this.stop();
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    this.teardown();
    this.canvas.remove();
  }
}
