/**
 * Thin WebGL2 layer: programs with cached uniforms, render targets, a shared
 * fullscreen triangle. Kept deliberately small — the hero owns its passes.
 */

export class ShaderError extends Error {}

export interface Program {
  handle: WebGLProgram;
  uniform: (name: string) => WebGLUniformLocation | null;
  use: () => void;
  dispose: () => void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string, label: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new ShaderError(`[${label}] could not create shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new ShaderError(`[${label}] ${log}`);
  }
  return shader;
}

/** `#version` and precision are injected so .glsl files stay readable. */
const HEADER = "#version 300 es\nprecision highp float;\nprecision highp int;\n";

export function createProgram(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
  label: string,
  defines: Record<string, string | number> = {},
): Program {
  const defs = Object.entries(defines)
    .map(([k, v]) => `#define ${k} ${v}`)
    .join("\n");
  const head = `${HEADER}${defs}\n`;
  const vs = compile(gl, gl.VERTEX_SHADER, head + vertex, `${label}.vert`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, head + fragment, `${label}.frag`);
  const handle = gl.createProgram();
  if (!handle) throw new ShaderError(`[${label}] could not create program`);
  gl.attachShader(handle, vs);
  gl.attachShader(handle, fs);
  gl.linkProgram(handle);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new ShaderError(`[${label}] link: ${gl.getProgramInfoLog(handle) ?? ""}`);
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    handle,
    uniform(name) {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(handle, name));
      return cache.get(name) ?? null;
    },
    use: () => gl.useProgram(handle),
    dispose: () => gl.deleteProgram(handle),
  };
}

export interface Target {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  depth: WebGLRenderbuffer | null;
  width: number;
  height: number;
}

export function createTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  hdr: boolean,
  withDepth = false,
): Target {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  let depth: WebGLRenderbuffer | null = null;
  if (withDepth) {
    depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, depth, width: w, height: h };
}

export function disposeTarget(gl: WebGL2RenderingContext, t: Target | null): void {
  if (!t) return;
  gl.deleteFramebuffer(t.fbo);
  gl.deleteTexture(t.tex);
  if (t.depth) gl.deleteRenderbuffer(t.depth);
}

export function bindTarget(gl: WebGL2RenderingContext, t: Target | null, canvasW = 0, canvasH = 0): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
  gl.viewport(0, 0, t ? t.width : canvasW, t ? t.height : canvasH);
}

/** One oversized triangle covers the screen; no index buffer needed. */
export function createFullscreen(gl: WebGL2RenderingContext): { vao: WebGLVertexArrayObject; draw: () => void; dispose: () => void } {
  const vao = gl.createVertexArray()!;
  const buf = gl.createBuffer()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    vao,
    draw: () => {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose: () => {
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buf);
    },
  };
}

export function bindTexture(gl: WebGL2RenderingContext, program: Program, name: string, tex: WebGLTexture, unit: number): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(program.uniform(name), unit);
}

/** Multisampled render buffer (colour + depth) resolved into a Target by blit. */
export interface MsaaTarget {
  fbo: WebGLFramebuffer;
  color: WebGLRenderbuffer;
  depth: WebGLRenderbuffer;
  width: number;
  height: number;
}

export function createMsaa(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  hdr: boolean,
  samples: number,
): MsaaTarget | null {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const max = gl.getParameter(gl.MAX_SAMPLES) as number;
  const s = Math.min(samples, max || 0);
  if (s < 2) return null;
  const fbo = gl.createFramebuffer()!;
  const color = gl.createRenderbuffer()!;
  const depth = gl.createRenderbuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.bindRenderbuffer(gl.RENDERBUFFER, color);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, s, hdr ? gl.RGBA16F : gl.RGBA8, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, s, gl.DEPTH_COMPONENT24, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    gl.deleteFramebuffer(fbo);
    gl.deleteRenderbuffer(color);
    gl.deleteRenderbuffer(depth);
    return null;
  }
  return { fbo, color, depth, width: w, height: h };
}

export function disposeMsaa(gl: WebGL2RenderingContext, m: MsaaTarget | null): void {
  if (!m) return;
  gl.deleteFramebuffer(m.fbo);
  gl.deleteRenderbuffer(m.color);
  gl.deleteRenderbuffer(m.depth);
}

export function resolveMsaa(gl: WebGL2RenderingContext, m: MsaaTarget, dst: Target): void {
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, m.fbo);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.fbo);
  gl.blitFramebuffer(0, 0, m.width, m.height, 0, 0, dst.width, dst.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
}
