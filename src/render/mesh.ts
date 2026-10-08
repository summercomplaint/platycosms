/*
 * Builds the Egan-style solids (edge tubes, arrowheads, vertex balls) as closed meshes.
 * Each primitive is a convex polyhedron. It is clipped to the fundamental domain on the CPU and every cut is
 * closed with a flat cap, so the result has no hollow cuts and needs no GPU clipping planes.
 */
import type { Analysis } from '../math/analyze';
import { Vec3, add, cross, dot, len, mul, sub, unit } from '../math/vec';

const EPS = 1e-9;

export interface Vert { p: Vec3; n: Vec3 }
export type Poly = Vert[];
export interface Plane { n: Vec3; d: number }

const V = (p: Vec3, n: Vec3): Vert => ({ p, n });

function basis(d: Vec3): [Vec3, Vec3] {
  const t: Vec3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(d, t));
  return [u, cross(d, u)];
}
const ringOf = (d: Vec3, seg: number): Vec3[] => {
  const [u, v] = basis(d);
  return Array.from({ length: seg }, (_, i) => {
    const t = (2 * Math.PI * i) / seg;
    return add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
  });
};

/* ---- convex primitives ---- */
export function cylinder(a: Vec3, b: Vec3, r: number, seg: number): Poly[] {
  const d = unit(sub(b, a)), ring = ringOf(d, seg), polys: Poly[] = [];
  for (let i = 0; i < seg; i++) {
    const n0 = ring[i], n1 = ring[(i + 1) % seg];
    polys.push([V(add(a, mul(n0, r)), n0), V(add(a, mul(n1, r)), n1), V(add(b, mul(n1, r)), n1), V(add(b, mul(n0, r)), n0)]);
  }
  polys.push(ring.map((n) => V(add(a, mul(n, r)), mul(d, -1))));
  polys.push(ring.map((n) => V(add(b, mul(n, r)), d)));
  return polys;
}

export function sphere(c: Vec3, r: number, stacks: number, slices: number): Poly[] {
  const P = (i: number, j: number): Vert => {
    const f = (Math.PI * i) / stacks, t = (2 * Math.PI * j) / slices;
    const n: Vec3 = [Math.sin(f) * Math.cos(t), Math.sin(f) * Math.sin(t), Math.cos(f)];
    return V(add(c, mul(n, r)), n);
  };
  const polys: Poly[] = [];
  for (let i = 0; i < stacks; i++) for (let j = 0; j < slices; j++) {
    if (i === 0) polys.push([P(0, j), P(1, j + 1), P(1, j)]);
    else if (i === stacks - 1) polys.push([P(i, j), P(i, j + 1), P(i + 1, j)]);
    else polys.push([P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)]);
  }
  return polys;
}

export function cone(base: Vec3, apex: Vec3, rc: number, seg: number): Poly[] {
  const axis = sub(apex, base), h = len(axis), d = unit(axis), ring = ringOf(d, seg);
  const slant = (n: Vec3): Vec3 => unit(add(mul(n, h), mul(d, rc)));
  const polys: Poly[] = [];
  for (let i = 0; i < seg; i++) {
    const n0 = ring[i], n1 = ring[(i + 1) % seg], mid = unit(add(n0, n1));
    polys.push([V(add(base, mul(n0, rc)), slant(n0)), V(add(base, mul(n1, rc)), slant(n1)), V(apex, slant(mid))]);
  }
  polys.push(ring.map((n) => V(add(base, mul(n, rc)), mul(d, -1))));
  return polys;
}

/* ---- clipping a convex solid by half-spaces n.p <= d, closing each cut with a cap ---- */
const lerpV = (a: Vert, b: Vert, t: number): Vert =>
  V(add(mul(a.p, 1 - t), mul(b.p, t)), unit(add(mul(a.n, 1 - t), mul(b.n, t))));

function clipPoly(poly: Poly, n: Vec3, d: number, cut: Vec3[]): Poly {
  const out: Poly = [], m = poly.length, s = poly.map((v) => dot(n, v.p) - d);
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m, sa = s[i], sb = s[j];
    if (sa <= EPS) {
      out.push(poly[i]);
      if (sa >= -EPS) cut.push(poly[i].p);
    }
    if ((sa < -EPS && sb > EPS) || (sa > EPS && sb < -EPS)) {
      const v = lerpV(poly[i], poly[j], sa / (sa - sb));
      out.push(v);
      cut.push(v.p);
    }
  }
  return out;
}

function makeCap(cut: Vec3[], n: Vec3): Poly | null {
  const pts: Vec3[] = [];
  for (const p of cut) if (!pts.some((q) => len(sub(p, q)) < 1e-8)) pts.push(p);
  if (pts.length < 3) return null;
  const c = mul(pts.reduce(add, [0, 0, 0] as Vec3), 1 / pts.length), [u, v] = basis(n);
  const ang = (p: Vec3) => Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u));
  pts.sort((p, q) => ang(p) - ang(q));
  return pts.map((p) => V(p, n));
}

/** Clip each plane in turn, pushing the planes outward by `push` (so different layers' caps never coincide). */
export function clip(polys: Poly[], planes: Plane[], push: number): Poly[] {
  let cur = polys;
  for (const pl of planes) {
    const d = pl.d + push, cut: Vec3[] = [], next: Poly[] = [];
    let anyOut = false;
    for (const poly of cur) {
      if (poly.some((v) => dot(pl.n, v.p) - d > EPS)) anyOut = true;
      const o = clipPoly(poly, pl.n, d, cut);
      if (o.length >= 3) next.push(o);
    }
    if (anyOut) {
      const cap = makeCap(cut, pl.n);
      if (cap) next.push(cap);
    }
    cur = next;
    if (!cur.length) break;
  }
  return cur;
}

/** Polygons -> triangles (fan), wound so that the front side faces outward. */
export function triangulate(polys: Poly[], pos: number[], nrm: number[]): void {
  for (let poly of polys) {
    let N: Vec3 = [0, 0, 0], avg: Vec3 = [0, 0, 0];
    for (let i = 0; i < poly.length; i++) {
      N = add(N, cross(poly[i].p, poly[(i + 1) % poly.length].p));
      avg = add(avg, poly[i].n);
    }
    if (len(N) < 1e-12) continue;
    if (dot(N, avg) < 0) poly = poly.slice().reverse();
    for (let i = 1; i < poly.length - 1; i++) for (const v of [poly[0], poly[i], poly[i + 1]]) { pos.push(...v.p); nrm.push(...v.n); }
  }
}

/* ---- the whole model for one analysed platycosm ---- */
export type Kind = 'tube' | 'arrow' | 'ball';
export interface Group { kind: Kind; cls: number; pos: Float32Array; nrm: Float32Array }
export interface Piece { kind: Kind; cls: number; polys: Poly[] }
export interface Model { r: number; eps: number; planes: Plane[]; pieces: Piece[]; groups: Group[] }

export interface ModelOptions {
  /** tube radius as a fraction of the cell size L = volume^(1/3) */
  radius?: number;
  /** segments around tubes and cones, and sphere resolution */
  quality?: 'high' | 'low';
}

/** Proportions, in units of the tube radius r. Long arrowheads (they read as arrows from any side), flared out of the tube. */
export const STYLE = { ball: 1.65, arrowLen: 4.2, arrowFlare: 1.85 };

export function buildModel(R: Analysis, opts: ModelOptions = {}): Model {
  const D = R.D, planes: Plane[] = R.spec.dom().F.map((f) => ({ n: f.n, d: f.d }));
  const L = Math.cbrt(R.volume), r = (opts.radius ?? 0.06) * L, eps = 0.012 * r;
  const seg = opts.quality === 'low' ? 12 : 32, stacks = opts.quality === 'low' ? 10 : 20, slices = opts.quality === 'low' ? 14 : 32;
  const groups = new Map<string, { kind: Kind; cls: number; pos: number[]; nrm: number[] }>();
  const pieces: Piece[] = [];
  const emit = (kind: Kind, cls: number, polys: Poly[]) => {
    const key = kind + ':' + cls;
    if (!groups.has(key)) groups.set(key, { kind, cls, pos: [], nrm: [] });
    const g = groups.get(key)!;
    triangulate(polys, g.pos, g.nrm);
    pieces.push({ kind, cls, polys });
  };
  D.E.forEach((e, i) => {
    const a = D.V[e[0]], b = D.V[e[1]], d = unit(sub(b, a)), mid = mul(add(a, b), 0.5);
    const cls = R.eClass[i], pt = R.eFlip[i] ? mul(d, -1) : d;
    emit('tube', cls, clip(cylinder(a, b, r, seg), planes, eps));
    const h = STYLE.arrowLen * r, base = sub(mid, mul(pt, h / 2)), apex = add(mid, mul(pt, h / 2));
    emit('arrow', cls, clip(cone(base, apex, STYLE.arrowFlare * r, seg), planes, 2 * eps));
  });
  D.V.forEach((p, i) => emit('ball', R.vClass[i], clip(sphere(p, STYLE.ball * r, stacks, slices), planes, 3 * eps)));
  return {
    r, eps, planes, pieces,
    groups: [...groups.values()].map((g) => ({ kind: g.kind, cls: g.cls, pos: new Float32Array(g.pos), nrm: new Float32Array(g.nrm) })),
  };
}
