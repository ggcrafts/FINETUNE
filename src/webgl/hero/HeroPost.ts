import {
  bindTarget,
  bindTexture,
  createFullscreen,
  createProgram,
  createTarget,
  disposeTarget,
  type Program,
  type Target,
} from "../gl";
import common from "../shaders/common.glsl?raw";
import fullscreenVert from "../shaders/fullscreen.vert.glsl?raw";
import brightFrag from "../shaders/bright.frag.glsl?raw";
import downFrag from "../shaders/down.frag.glsl?raw";
import upFrag from "../shaders/up.frag.glsl?raw";
import compositeFrag from "../shaders/composite.frag.glsl?raw";

export interface PostUniforms {
  bloomStrength: number;
  bloomThreshold: number;
  exposure: number;
  chromatic: number;
  focusY: number;
  focusRange: number;
  focusOn: boolean;
  /** screen uv of the point of interest (sharpest spot) */
  focusCenter: [number, number];
  /** radius (aspect-corrected uv) that stays sharp around it */
  focusRadius: number;
  /** core flare: screen uv + strength */
  flare: [number, number, number];
  pointerUv: [number, number];
  time: number;
  copyFade: [number, number];
}

/**
 * Post chain: bright-pass → dual-Kawase bloom pyramid → composite
 * (focus band, chromatic aberration, pointer lens, ACES, grain).
 * A separate 3-level soft copy feeds the depth-of-field so blur ≠ bloom.
 */
export class HeroPost {
  private bright: Program;
  private down: Program;
  private up: Program;
  private composite: Program;
  private quad: ReturnType<typeof createFullscreen>;
  private downs: Target[] = [];
  private ups: Target[] = [];
  private soft: Target[] = [];

  constructor(private gl: WebGL2RenderingContext, private hdr: boolean, private levels: number) {
    this.bright = createProgram(gl, fullscreenVert, brightFrag, "bright");
    this.down = createProgram(gl, fullscreenVert, downFrag, "down");
    this.up = createProgram(gl, fullscreenVert, upFrag, "up");
    this.composite = createProgram(gl, fullscreenVert, common + compositeFrag, "composite");
    this.quad = createFullscreen(gl);
  }

  resize(width: number, height: number): void {
    const gl = this.gl;
    [...this.downs, ...this.ups, ...this.soft].forEach((t) => disposeTarget(gl, t));
    this.downs = [];
    this.ups = [];
    this.soft = [];
    let w = width / 2;
    let h = height / 2;
    for (let i = 0; i < this.levels; i++) {
      this.downs.push(createTarget(gl, w, h, this.hdr));
      this.ups.push(createTarget(gl, w, h, this.hdr));
      w /= 2;
      h /= 2;
    }
    this.soft.push(createTarget(gl, width / 2, height / 2, this.hdr));
    this.soft.push(createTarget(gl, width / 4, height / 4, this.hdr));
    this.soft.push(createTarget(gl, width / 8, height / 8, this.hdr));
  }

  private pass(p: Program, src: Target, dst: Target): void {
    const gl = this.gl;
    bindTarget(gl, dst);
    p.use();
    bindTexture(gl, p, "uTex", src.tex, 0);
    gl.uniform2f(p.uniform("uTexel"), 1 / src.width, 1 / src.height);
    this.quad.draw();
  }

  render(scene: Target, canvasW: number, canvasH: number, u: PostUniforms): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    // soft copy for the focus band
    this.pass(this.down, scene, this.soft[0]);
    this.pass(this.down, this.soft[0], this.soft[1]);
    this.pass(this.down, this.soft[1], this.soft[2]);

    // bright pass into the first pyramid level
    bindTarget(gl, this.downs[0]);
    this.bright.use();
    bindTexture(gl, this.bright, "uTex", scene.tex, 0);
    gl.uniform1f(this.bright.uniform("uThreshold"), u.bloomThreshold);
    this.quad.draw();

    for (let i = 1; i < this.levels; i++) this.pass(this.down, this.downs[i - 1], this.downs[i]);

    // upsample + accumulate
    let src = this.downs[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      const dst = this.ups[i];
      bindTarget(gl, dst);
      this.up.use();
      bindTexture(gl, this.up, "uTex", src.tex, 0);
      bindTexture(gl, this.up, "uBase", this.downs[i].tex, 1);
      gl.uniform2f(this.up.uniform("uTexel"), 1 / src.width, 1 / src.height);
      this.quad.draw();
      src = dst;
    }

    // composite to screen
    bindTarget(gl, null, canvasW, canvasH);
    const c = this.composite;
    c.use();
    bindTexture(gl, c, "uScene", scene.tex, 0);
    bindTexture(gl, c, "uBloom", src.tex, 1);
    bindTexture(gl, c, "uSoft", this.soft[1].tex, 2);
    bindTexture(gl, c, "uSoft2", this.soft[2].tex, 3);
    gl.uniform2f(c.uniform("uSoftTexel"), 1 / this.soft[1].width, 1 / this.soft[1].height);
    gl.uniform2f(c.uniform("uSoft2Texel"), 1 / this.soft[2].width, 1 / this.soft[2].height);
    gl.uniform2f(c.uniform("uFocusCenter"), u.focusCenter[0], u.focusCenter[1]);
    gl.uniform1f(c.uniform("uFocusRadius"), u.focusRadius);
    gl.uniform3f(c.uniform("uFlare"), u.flare[0], u.flare[1], u.flare[2]);
    gl.uniform1f(c.uniform("uBloomStrength"), u.bloomStrength);
    gl.uniform1f(c.uniform("uExposure"), u.exposure);
    gl.uniform1f(c.uniform("uCA"), u.chromatic);
    gl.uniform1f(c.uniform("uFocusY"), u.focusY);
    gl.uniform1f(c.uniform("uFocusRange"), u.focusRange);
    gl.uniform1f(c.uniform("uFocusOn"), u.focusOn ? 1 : 0);
    gl.uniform2f(c.uniform("uPointerUv"), u.pointerUv[0], u.pointerUv[1]);
    gl.uniform1f(c.uniform("uTime"), u.time);
    gl.uniform2f(c.uniform("uResolution"), canvasW, canvasH);
    gl.uniform2f(c.uniform("uCopyFade"), u.copyFade[0], u.copyFade[1]);
    this.quad.draw();
  }

  dispose(): void {
    const gl = this.gl;
    [...this.downs, ...this.ups, ...this.soft].forEach((t) => disposeTarget(gl, t));
    [this.bright, this.down, this.up, this.composite].forEach((p) => p.dispose());
    this.quad.dispose();
  }
}
