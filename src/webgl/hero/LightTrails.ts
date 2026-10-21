import { createProgram, type Program } from "../gl";
import { rng } from "../math";
import common from "../shaders/common.glsl?raw";
import vortex from "../shaders/vortex.glsl?raw";
import trailsVert from "../shaders/trails.vert.glsl?raw";
import trailsFrag from "../shaders/trails.frag.glsl?raw";
import particlesVert from "../shaders/particles.vert.glsl?raw";
import particlesFrag from "../shaders/particles.frag.glsl?raw";

const withVortex = (src: string): string => src.replace("#include_vortex", vortex);

/**
 * Procedural light ribbons + dust. One instanced strip draw for all ribbons,
 * one point draw for the particles. Shapes are seeded (deterministic) so the
 * composition is art-directed rather than random each load.
 */
export class LightTrails {
  readonly ribbons: Program;
  readonly dust: Program;
  private stripVao: WebGLVertexArrayObject;
  private dustVao: WebGLVertexArrayObject;
  private buffers: WebGLBuffer[] = [];
  private stripVerts: number;
  ribbonCount: number;
  readonly maxRibbons: number;
  readonly particleCount: number;

  constructor(private gl: WebGL2RenderingContext, ribbons: number, segments: number, particles: number) {
    this.ribbons = createProgram(gl, common + withVortex(trailsVert), common + trailsFrag, "trails");
    this.dust = createProgram(gl, common + withVortex(particlesVert), common + particlesFrag, "particles");
    this.maxRibbons = ribbons;
    this.ribbonCount = ribbons;
    this.particleCount = particles;

    // --- base strip: (t, side) pairs --------------------------------------
    const strip = new Float32Array((segments + 1) * 2 * 2);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      strip.set([t, -1, t, 1], i * 4);
    }
    this.stripVerts = (segments + 1) * 2;

    // --- per-ribbon instance data ------------------------------------------
    const random = rng(20261020);
    const seeds = new Float32Array(ribbons * 4);
    const shapes = new Float32Array(ribbons * 4);
    for (let i = 0; i < ribbons; i++) {
      const s = [random(), random(), random(), random()];
      seeds.set(s, i * 4);
      const roll = random();
      const isBeam = roll < 0.08;
      const isRay = !isBeam && roll < 0.32;
      if (isRay) {
        // radial streak bursting out of the crystal: kind, start radius, length, core width
        shapes.set([2, 0.75 + random() * 0.5, 1.4 + random() * 3.6, 0.7 + random() * 1.5], i * 4);
      } else if (isBeam) {
        // kind, radius, turns, core width
        shapes.set([1, 0.25 + random() * 0.9, 0.6 + random() * 1.6, 1.15 + random() * 0.9], i * 4);
      } else {
        // inner orbits are dense and bright, outer ones are long sweeping streaks
        const radius = 0.9 + Math.pow(random(), 1.35) * 7.5;
        const span = (0.5 + random() * 1.9) * (radius > 5 ? 0.8 : 1);
        const width = 0.6 + random() * 1.4 + (radius > 5 ? 0.6 : 0);
        shapes.set([0, radius, span, width], i * 4);
      }
    }

    this.stripVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.stripVao);
    this.attr(0, strip, 2, 0);
    this.attr(1, seeds, 4, 1);
    this.attr(2, shapes, 4, 1);

    // --- particles -----------------------------------------------------------
    const dust = new Float32Array(particles * 4);
    for (let i = 0; i < dust.length; i++) dust[i] = random();
    this.dustVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.dustVao);
    this.attr(0, dust, 4, 0);
    gl.bindVertexArray(null);
  }

  private attr(loc: number, data: Float32Array, size: number, divisor: number): void {
    const gl = this.gl;
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(loc, divisor);
    this.buffers.push(buf);
  }

  drawRibbons(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.stripVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, this.stripVerts, this.ribbonCount);
  }

  drawDust(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.dustVao);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
  }

  dispose(): void {
    this.buffers.forEach((b) => this.gl.deleteBuffer(b));
    this.gl.deleteVertexArray(this.stripVao);
    this.gl.deleteVertexArray(this.dustVao);
    this.ribbons.dispose();
    this.dust.dispose();
  }
}
