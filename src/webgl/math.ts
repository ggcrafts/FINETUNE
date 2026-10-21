/**
 * Minimal column-major mat4 helpers (no dependency). Only what the hero needs.
 * All functions write into `out` to avoid allocations inside the render loop.
 */
export type Mat4 = Float32Array;

export const mat4 = (): Mat4 => {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
};

export function perspective(out: Mat4, fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function lookAt(
  out: Mat4,
  ex: number, ey: number, ez: number,
  tx: number, ty: number, tz: number,
): Mat4 {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;
  // up = (0,1,0); x = up × z
  let xx = zz, xy = 0, xz = -zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len; xy /= len; xz /= len;
  // y = z × x
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
  return out;
}

/** Model matrix: rotation around Y, then tilt around X, then translation. */
export function modelYX(out: Mat4, rotY: number, tiltX: number, tx: number, ty: number, tz: number): Mat4 {
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
  // R = Rx * Ry
  out[0] = cy;        out[1] = sx * sy;  out[2] = -cx * sy; out[3] = 0;
  out[4] = 0;         out[5] = cx;       out[6] = sx;       out[7] = 0;
  out[8] = sy;        out[9] = -sx * cy; out[10] = cx * cy; out[11] = 0;
  out[12] = tx;       out[13] = ty;      out[14] = tz;      out[15] = 1;
  return out;
}

export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

/** Deterministic PRNG (mulberry32) — seeded, so compositions are art-directable. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
