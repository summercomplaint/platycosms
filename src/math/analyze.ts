import { Domain, Face, cloneDomain, faceCorners, inClosed, inOpen, outside, volume } from './domain';
import { Iso, IDENTITY, apply, det, inverse, key } from './iso';
import { enumerate } from './group';
import type { Spec } from './spec';
import { Vec3, add, cross, dist, dot, len, mean, mul, sub } from './vec';

const TOL = 1e-6;

/** A sub-face: the part of face f that is glued, as a whole, to a part of face g by gamma (gamma maps g's part onto this polygon). */
export interface Region { f: number; g: number; gamma: Iso; poly: Vec3[] }

export interface Analysis {
  spec: Spec;
  /** The domain with its skeleton refined: edge subdivisions and seams added. */
  D: Domain;
  els: Iso[];
  /** class index per skeleton vertex / edge, and whether the arrow points b->a rather than a->b */
  vClass: number[];
  eClass: number[];
  eFlip: number[];
  /** true for edges that lie in the interior of a face (Egan's extra edges) */
  isSeam: boolean[];
  nVertexClasses: number;
  nEdgeClasses: number;
  regions: Region[];
  /** number of sub-face classes (regions come in pairs) */
  nFaceClasses: number;
  /** V - E + F - C over classes, which must be 0 for a closed 3-manifold */
  euler: number;
  volume: number;
  orientable: boolean;
  tilingBad: number;
  errors: string[];
  warnings: string[];
  ok: boolean;
}

/* ---------- planar helpers ---------- */
function polygonArea(poly: Vec3[]): number {
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) n = add(n, cross(poly[i], poly[(i + 1) % poly.length]));
  return len(n) / 2;
}

/** outward in-plane unit normal of polygon edge i (orientation-agnostic: uses the centroid) */
function edgeNormal(corners: Vec3[], i: number, n: Vec3, c: Vec3): Vec3 {
  const a = corners[i], b = corners[(i + 1) % corners.length];
  let m = cross(sub(b, a), n);
  if (dot(m, sub(mul(add(a, b), 0.5), c)) < 0) m = mul(m, -1);
  return mul(m, 1 / len(m));
}

/** Clip the segment pq to the convex polygon (corners) lying in a plane with normal n. Returns null if nothing is left. */
function clipSegmentToPolygon(p: Vec3, q: Vec3, corners: Vec3[], n: Vec3): [Vec3, Vec3] | null {
  const c = mean(corners);
  let t0 = 0, t1 = 1;
  for (let i = 0; i < corners.length; i++) {
    const m = edgeNormal(corners, i, n, c), a = corners[i];
    const g0 = dot(m, sub(p, a)), g1 = dot(m, sub(q, a));
    if (g0 > TOL && g1 > TOL) return null;
    if (g0 > TOL) t0 = Math.max(t0, g0 / (g0 - g1));
    else if (g1 > TOL) t1 = Math.min(t1, g0 / (g0 - g1));
  }
  if (t1 - t0 < 1e-9) return null;
  const d = sub(q, p);
  return [add(p, mul(d, t0)), add(p, mul(d, t1))];
}

/** Clip a coplanar convex polygon by a coplanar convex polygon (Sutherland-Hodgman). */
function clipPolygon(subject: Vec3[], clipper: Vec3[], n: Vec3): Vec3[] {
  let out = subject;
  const c = mean(clipper);
  for (let i = 0; i < clipper.length && out.length; i++) {
    const m = edgeNormal(clipper, i, n, c), a = clipper[i];
    const next: Vec3[] = [];
    for (let k = 0; k < out.length; k++) {
      const P = out[k], Q = out[(k + 1) % out.length];
      const sp = dot(m, sub(P, a)), sq = dot(m, sub(Q, a));
      if (sp <= TOL) next.push(P);
      if ((sp < -TOL && sq > TOL) || (sp > TOL && sq < -TOL)) next.push(add(P, mul(sub(Q, P), sp / (sp - sq))));
    }
    out = next;
  }
  return out;
}

/** is c (assumed coplanar) inside the closed convex polygon? */
function insidePolygon(c: Vec3, poly: Vec3[]): boolean {
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) n = add(n, cross(poly[i], poly[(i + 1) % poly.length]));
  n = mul(n, 1 / len(n));
  const m = mean(poly);
  for (let i = 0; i < poly.length; i++) if (dot(edgeNormal(poly, i, n, m), sub(c, poly[i])) > 1e-6) return false;
  return true;
}

/** The skeleton of the domain's boundary: points and segments, kept consistent as pieces are inserted. */
class Skeleton {
  V: Vec3[];
  E: [number, number][];
  constructor(D: Domain) {
    this.V = D.V.map((p) => [...p] as Vec3);
    this.E = D.E.map((e) => [...e] as [number, number]);
  }
  nearVertex(p: Vec3): number {
    for (let i = 0; i < this.V.length; i++) if (dist(p, this.V[i]) < TOL) return i;
    return -1;
  }
  private onInterior(e: [number, number], p: Vec3): boolean {
    const A = this.V[e[0]], B = this.V[e[1]], ab = sub(B, A);
    const t = dot(sub(p, A), ab) / dot(ab, ab);
    return t > TOL && t < 1 - TOL && dist(p, add(A, mul(ab, t))) < TOL;
  }
  hasEdge(a: number, b: number): boolean {
    return this.E.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
  }
  /** Make p a vertex, splitting the segment it lies inside. */
  insertPoint(p: Vec3): number {
    const v = this.nearVertex(p);
    if (v >= 0) return v;
    const m = this.V.length;
    this.V.push(p);
    for (let i = 0; i < this.E.length; i++) {
      if (this.onInterior(this.E[i], p)) {
        const [a, b] = this.E[i];
        this.E[i] = [a, m];
        this.E.push([m, b]);
        break;
      }
    }
    return m;
  }
  /** Insert the segment pq, splitting at every vertex on it and every crossing with an existing segment. Returns true if anything changed. */
  insertSegment(p: Vec3, q: Vec3): boolean {
    const sig = () => this.V.length + ':' + this.E.length;
    const before = sig();
    const a = this.insertPoint(p), b = this.insertPoint(q);
    if (a === b) return before !== sig();
    const A = this.V[a], B = this.V[b], d = sub(B, A), L2 = dot(d, d);
    for (const [i, j] of [...this.E]) {
      const C = this.V[i], e = sub(this.V[j], C), w = cross(d, e), ww = dot(w, w);
      if (len(w) < 1e-9 * len(d) * len(e)) continue; // parallel
      const rhs = sub(C, A);
      const t = dot(cross(rhs, e), w) / ww, u = dot(cross(rhs, d), w) / ww;
      if (t <= TOL || t >= 1 - TOL || u <= TOL || u >= 1 - TOL) continue;
      const X = add(A, mul(d, t));
      if (dist(X, add(C, mul(e, u))) > TOL) continue; // skew lines, not a real crossing
      this.insertPoint(X);
    }
    const cuts: { t: number; i: number }[] = [{ t: 0, i: a }, { t: 1, i: b }];
    this.V.forEach((P, i) => {
      if (i === a || i === b) return;
      const t = dot(sub(P, A), d) / L2;
      if (t > TOL && t < 1 - TOL && dist(P, add(A, mul(d, t))) < TOL) cuts.push({ t, i });
    });
    cuts.sort((x, y) => x.t - y.t);
    for (let k = 0; k + 1 < cuts.length; k++) if (!this.hasEdge(cuts[k].i, cuts[k + 1].i)) this.E.push([cuts[k].i, cuts[k + 1].i]);
    return before !== sig();
  }
}

/** A seeded generator so the sampling is repeatable. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AnalyzeOptions { samples?: number; depth?: number; maxT?: number }

export function analyze(spec: Spec, opts: AnalyzeOptions = {}): Analysis {
  const D0 = spec.dom();
  const els = enumerate(spec.gens, opts.depth ?? 8, opts.maxT ?? 4);
  const errors: string[] = [], warnings: string[] = [];
  const idKey = key(IDENTITY);
  const nonId = els.filter((g) => key(g) !== idKey);

  // 1. D must be a fundamental domain: every nearby point has exactly one image inside D.
  let tilingBad = 0;
  const rnd = rng(7), N = opts.samples ?? 1500;
  for (let s = 0; s < N; s++) {
    const p: Vec3 = [(rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4];
    let c = 0;
    for (const g of els) if (inOpen(D0, apply(g, p), 1e-7)) c++;
    if (c !== 1) tilingBad++;
  }
  if (tilingBad) errors.push(`tiling: ${tilingBad}/${N} sample points do not have exactly one image in the domain`);
  const vol = volume(D0);
  if (Math.abs(vol - spec.covolume) > 1e-6) errors.push(`domain volume ${vol} differs from covolume ${spec.covolume}`);
  const orientable = els.every((g) => det(g) > 0);
  if (orientable !== spec.orientable) errors.push(`orientable is ${orientable}, expected ${spec.orientable}`);

  // 2. Refine the skeleton until it is invariant: every image of a skeleton piece that lies in the boundary
  //    of D is a union of skeleton pieces, and every image of a vertex that lies in D is a vertex or on a piece.
  const D: Domain = cloneDomain(D0);
  const sk = new Skeleton(D0);
  const corners = D0.F.map((f) => faceCorners(D0, f));
  for (let round = 0; round < 40; round++) {
    let changed = false;
    for (const g of nonId) for (const v of [...sk.V]) {
      const p = apply(g, v);
      if (!inClosed(D0, p, 1e-5) || sk.nearVertex(p) >= 0) continue;
      const before = sk.V.length;
      sk.insertPoint(p);
      if (sk.V.length !== before) changed = true;
    }
    const pieces: [Vec3, Vec3][] = [];
    for (const g of nonId) for (const [i, j] of sk.E) {
      const P = apply(g, sk.V[i]), Q = apply(g, sk.V[j]);
      D0.F.forEach((f: Face, fi: number) => {
        if (Math.abs(outside(f, P)) > TOL || Math.abs(outside(f, Q)) > TOL) return;
        const piece = clipSegmentToPolygon(P, Q, corners[fi], f.n);
        if (piece && dist(piece[0], piece[1]) > 1e-7) pieces.push(piece);
      });
    }
    for (const [P, Q] of pieces) if (sk.insertSegment(P, Q)) changed = true;
    if (!changed) break;
    if (round === 39) warnings.push('skeleton refinement did not settle');
  }
  D.V = sk.V;
  D.E = sk.E;

  // 3. Vertex classes and oriented edge classes (union-find with parity).
  const nV = D.V.length, nE = D.E.length;
  const vp = [...Array(nV).keys()];
  const vfind = (x: number): number => (vp[x] === x ? x : (vp[x] = vfind(vp[x])));
  const ep = [...Array(nE).keys()], epar: number[] = Array(nE).fill(0);
  const efind = (x: number): [number, number] => {
    if (ep[x] === x) return [x, 0];
    const [r, p] = efind(ep[x]);
    ep[x] = r;
    epar[x] ^= p;
    return [r, epar[x]];
  };
  const ekey = new Map<string, number>(D.E.map((e, i) => [Math.min(...e) + ',' + Math.max(...e), i]));
  let conflicts = 0;
  for (const g of els) {
    const img = D.V.map((v) => sk.nearVertex(apply(g, v)));
    for (let i = 0; i < nV; i++) if (img[i] >= 0) vp[vfind(i)] = vfind(img[i]);
    for (let e = 0; e < nE; e++) {
      const c = img[D.E[e][0]], d = img[D.E[e][1]];
      if (c < 0 || d < 0) continue;
      const f = ekey.get(Math.min(c, d) + ',' + Math.max(c, d));
      if (f === undefined) continue;
      const par = D.E[f][0] === c ? 0 : 1;
      const [rx, px] = efind(e), [ry, py] = efind(f);
      if (rx === ry) { if ((px ^ py) !== par) conflicts++; } else { ep[rx] = ry; epar[rx] = px ^ py ^ par; }
    }
  }
  if (conflicts) errors.push(`edge orientation conflicts: ${conflicts}`);
  const vClass: number[] = [], eClass: number[] = [], eFlip: number[] = [];
  const vr = new Map<number, number>(), er = new Map<number, number>();
  for (let i = 0; i < nV; i++) { const r = vfind(i); if (!vr.has(r)) vr.set(r, vr.size); vClass.push(vr.get(r)!); }
  for (let e = 0; e < nE; e++) { const [r, p] = efind(e); if (!er.has(r)) er.set(r, er.size); eClass.push(er.get(r)!); eFlip.push(p); }

  // seams: edges whose midpoint is in the interior of a face (on exactly one face plane)
  const isSeam = D.E.map(([a, b]) => {
    const m = mul(add(D.V[a], D.V[b]), 0.5);
    return D0.F.filter((f) => Math.abs(outside(f, m)) < TOL).length === 1;
  });

  // 4. Regions: overlaps of a face of D with a coplanar, opposed face of a neighbouring tile.
  const regions: Region[] = [];
  for (const g of nonId) D0.F.forEach((gf, gi) => {
    const gc = corners[gi].map((p) => apply(g, p));
    const gn = apply({ A: g.A, t: [0, 0, 0] }, gf.n);
    D0.F.forEach((f, fi) => {
      if (dot(gn, f.n) > -1 + 1e-6) return;
      if (gc.some((p) => Math.abs(outside(f, p)) > TOL)) return;
      const Q = clipPolygon(gc, corners[fi], f.n);
      if (Q.length >= 3 && polygonArea(Q) > 1e-7) regions.push({ f: fi, g: gi, gamma: g, poly: Q });
    });
  });
  D0.F.forEach((_f, fi) => {
    const area = polygonArea(corners[fi]);
    const got = regions.filter((r) => r.f === fi).reduce((s, r) => s + polygonArea(r.poly), 0);
    if (Math.abs(area - got) > 1e-6) errors.push(`face ${fi}: regions cover area ${got.toFixed(6)} of ${area.toFixed(6)}`);
  });
  if (regions.length % 2) errors.push(`odd number of regions (${regions.length})`);
  const nFaceClasses = regions.length / 2;
  const euler = vr.size - er.size + nFaceClasses - 1;
  if (euler !== 0) errors.push(`Euler characteristic V-E+F-C = ${euler}, expected 0`);
  for (const r of regions) {
    const c = mean(r.poly.map((p) => apply(inverse(r.gamma), p)));
    if (!regions.some((s) => s.f === r.g && insidePolygon(c, s.poly))) { errors.push(`a region of face ${r.f} has no partner`); break; }
  }

  return {
    spec, D, els, vClass, eClass, eFlip, isSeam, nVertexClasses: vr.size, nEdgeClasses: er.size,
    regions, nFaceClasses, euler, volume: vol, orientable, tilingBad, errors, warnings, ok: errors.length === 0,
  };
}
