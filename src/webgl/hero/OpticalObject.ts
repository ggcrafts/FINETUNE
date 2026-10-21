import { createProgram, type Program } from "../gl";
import common from "../shaders/common.glsl?raw";
import glassVert from "../shaders/glass.vert.glsl?raw";
import glassFrag from "../shaders/glass.frag.glsl?raw";

/**
 * The optical focal object. Two shapes:
 *
 *  - "crystal" (default): a cut gem at the centre of the vortex — a
 *    dodecahedron whose 20 corners are cut by icosahedron planes (a lapidated
 *    form with pentagonal and small triangular facets), with slightly rounded
 *    edges so the light rolls over them and refracts dramatically. Built as a
 *    subdivided icosphere pushed onto a smooth-max (p-norm) of the face planes.
 *  - "twist" (?shape=twist): the previous three-lobed, twisted glass column.
 *
 * Geometry is generated once on the CPU.
 */
export type OpticalShape = "crystal" | "twist";

// Radius profile along the height (y). Catmull-Rom through hand-placed points.
// The ends continue as long, thin glass "tails" into the light beam; together
// with the alpha fade in glass.frag the object never shows a hard start or end.
const PROFILE: Array<[number, number]> = [
  [-6.2, 0.0],
  [-4.6, 0.025],
  [-3.1, 0.06],
  [-2.15, 0.12],
  [-1.85, 0.2],
  [-1.35, 0.5],
  [-0.75, 0.74],
  [-0.15, 0.56],
  [0.3, 0.46],
  [0.85, 0.62],
  [1.35, 0.44],
  [1.85, 0.18],
  [2.7, 0.08],
  [3.9, 0.04],
  [5.4, 0.018],
  [7.0, 0.0],
];

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function radiusAt(y: number): number {
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [y1, r1] = PROFILE[i];
    const [y2, r2] = PROFILE[i + 1];
    if (y >= y1 && y <= y2) {
      const r0 = PROFILE[Math.max(0, i - 1)][1];
      const r3 = PROFILE[Math.min(PROFILE.length - 1, i + 2)][1];
      return Math.max(0, catmull(r0, r1, r2, r3, (y - y1) / (y2 - y1)));
    }
  }
  return 0;
}

/** Surface point: three lobes that twist with height. */
function surface(u: number, v: number, out: Float32Array, o: number): void {
  const y = PROFILE[0][0] + v * (PROFILE[PROFILE.length - 1][0] - PROFILE[0][0]);
  const theta = u * Math.PI * 2;
  const twist = y * 1.35;
  const lobes = 1 + 0.26 * Math.cos(3 * (theta + twist));
  const r = radiusAt(y) * lobes;
  out[o] = Math.cos(theta) * r;
  out[o + 1] = y;
  out[o + 2] = Math.sin(theta) * r;
}

// ---- crystal ---------------------------------------------------------------
const PHI = (1 + Math.sqrt(5)) / 2;
const CRYSTAL_RADIUS = 0.84; // inradius of the dodecahedron faces (world units)
const CORNER_CUT = 1.12;     // icosahedron planes, relative to the face planes
const ROUNDNESS = 80;        // p-norm exponent: higher = sharper edges (just softened)

function normalized(list: number[][]): number[][] {
  return list.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  });
}

// dodecahedron face normals = icosahedron vertices (and vice versa)
const ICO_VERTS = normalized([
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
]);
const ICO_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];
const DODECA_N = ICO_VERTS;
const ICO_N = normalized(
  ICO_FACES.map(([a, b, c]) => [
    ICO_VERTS[a][0] + ICO_VERTS[b][0] + ICO_VERTS[c][0],
    ICO_VERTS[a][1] + ICO_VERTS[b][1] + ICO_VERTS[c][1],
    ICO_VERTS[a][2] + ICO_VERTS[b][2] + ICO_VERTS[c][2],
  ]),
);

/** Distance from the centre to the rounded gem surface along unit dir d. */
function gemRadius(x: number, y: number, z: number): number {
  let sum = 0;
  for (const n of DODECA_N) {
    const k = n[0] * x + n[1] * y + n[2] * z;
    if (k > 0) sum += Math.pow(k, ROUNDNESS);
  }
  for (const n of ICO_N) {
    const k = (n[0] * x + n[1] * y + n[2] * z) / CORNER_CUT;
    if (k > 0) sum += Math.pow(k, ROUNDNESS);
  }
  return CRYSTAL_RADIUS / Math.pow(sum, 1 / ROUNDNESS);
}

/**
 * Edge factor along unit dir d: 1 on a facet edge, 0 inside a facet.
 * Compares the two strongest face planes — where they tie, two facets meet.
 */
function gemEdge(x: number, y: number, z: number): number {
  let k1 = 0;
  let k2 = 0;
  const take = (k: number): void => {
    if (k > k1) { k2 = k1; k1 = k; } else if (k > k2) k2 = k;
  };
  for (const n of DODECA_N) take(n[0] * x + n[1] * y + n[2] * z);
  for (const n of ICO_N) take((n[0] * x + n[1] * y + n[2] * z) / CORNER_CUT);
  const d = (k1 - k2) / Math.max(k1, 1e-4);
  return Math.max(0, 1 - d / 0.016);
}

function buildCrystal(subdiv: number): { pos: Float32Array; nor: Float32Array; idx: Uint32Array; edge: Float32Array } {
  // icosphere
  const verts: number[][] = ICO_VERTS.map((v) => [...v]);
  let faces = ICO_FACES.map((f) => [...f]);
  for (let s = 0; s < subdiv; s++) {
    const cache = new Map<number, number>();
    const mid = (a: number, b: number): number => {
      const key = a < b ? a * 1e6 + b : b * 1e6 + a;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const [ax, ay, az] = verts[a];
      const [bx, by, bz] = verts[b];
      const mx = ax + bx, my = ay + by, mz = az + bz;
      const l = Math.hypot(mx, my, mz);
      verts.push([mx / l, my / l, mz / l]);
      cache.set(key, verts.length - 1);
      return verts.length - 1;
    };
    const next: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const n = verts.length;
  const pos = new Float32Array(n * 3);
  const edge = new Float32Array(n);
  verts.forEach(([x, y, z], i) => {
    const r = gemRadius(x, y, z);
    edge[i] = gemEdge(x, y, z);
    pos[i * 3] = x * r;
    pos[i * 3 + 1] = y * r;
    pos[i * 3 + 2] = z * r;
  });
  // smooth (area-weighted) vertex normals: flat on facets, rolling over edges
  const nor = new Float32Array(n * 3);
  const idx = new Uint32Array(faces.length * 3);
  faces.forEach(([a, b, c], f) => {
    idx[f * 3] = a; idx[f * 3 + 1] = b; idx[f * 3 + 2] = c;
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    // orient outward
    const cx = pos[a * 3] + pos[b * 3] + pos[c * 3];
    const cy = pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1];
    const cz = pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2];
    if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    for (const v of [a, b, c]) {
      nor[v * 3] += nx; nor[v * 3 + 1] += ny; nor[v * 3 + 2] += nz;
    }
  });
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1;
    nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l;
  }
  return { pos, nor, idx, edge };
}

export class OpticalObject {
  readonly program: Program;
  private vao: WebGLVertexArrayObject;
  private buffers: WebGLBuffer[] = [];
  private count: number;

  constructor(private gl: WebGL2RenderingContext, detail: number, readonly shape: OpticalShape = "crystal") {
    this.program = createProgram(gl, common + glassVert, common + glassFrag, "glass");

    if (shape === "crystal") {
      const { pos, nor, idx, edge } = buildCrystal(detail < 1 ? 5 : 6);
      this.count = idx.length;
      this.vao = gl.createVertexArray()!;
      gl.bindVertexArray(this.vao);
      this.attr(0, pos, 3);
      this.attr(1, nor, 3);
      this.attr(2, edge, 1);
      const ib = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      this.buffers.push(ib);
      gl.bindVertexArray(null);
      return;
    }

    const segU = Math.round(96 * detail);
    const segV = Math.round(260 * detail);
    const verts = (segU + 1) * (segV + 1);
    const pos = new Float32Array(verts * 3);
    const nor = new Float32Array(verts * 3);
    const a = new Float32Array(3);
    const b = new Float32Array(3);
    const c = new Float32Array(3);
    const e = 1e-3;

    let k = 0;
    for (let j = 0; j <= segV; j++) {
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        const v = j / segV;
        surface(u, v, pos, k * 3);
        surface(u + e, v, a, 0);
        surface(u, Math.min(1, v + e), b, 0);
        surface(u, Math.max(0, v - e), c, 0);
        const tx = a[0] - pos[k * 3], ty = a[1] - pos[k * 3 + 1], tz = a[2] - pos[k * 3 + 2];
        const bx = b[0] - c[0], by = b[1] - c[1], bz = b[2] - c[2];
        // n = dv × du  (outward)
        let nx = by * tz - bz * ty;
        let ny = bz * tx - bx * tz;
        let nz = bx * ty - by * tx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        // poles: point straight up/down
        if (j === 0) { nx = 0; ny = -1; nz = 0; }
        if (j === segV) { nx = 0; ny = 1; nz = 0; }
        nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
        k++;
      }
    }

    const idx = new Uint32Array(segU * segV * 6);
    let n = 0;
    for (let j = 0; j < segV; j++) {
      for (let i = 0; i < segU; i++) {
        const p = j * (segU + 1) + i;
        const q = p + segU + 1;
        idx[n++] = p; idx[n++] = q; idx[n++] = p + 1;
        idx[n++] = p + 1; idx[n++] = q; idx[n++] = q + 1;
      }
    }
    this.count = n;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.attr(0, pos, 3);
    this.attr(1, nor, 3);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.buffers.push(ib);
    gl.bindVertexArray(null);
  }

  private attr(loc: number, data: Float32Array, size: number): void {
    const gl = this.gl;
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    this.buffers.push(buf);
  }

  get triangleCount(): number {
    return this.count / 3;
  }

  draw(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
  }

  dispose(): void {
    this.buffers.forEach((b) => this.gl.deleteBuffer(b));
    this.gl.deleteVertexArray(this.vao);
    this.program.dispose();
  }
}
