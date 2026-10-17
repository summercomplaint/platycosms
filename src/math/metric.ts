import { Gamma } from './group';
import { Iso, IDENTITY, applyLinear, isTranslation } from './iso';
import type { Spec } from './spec';
import { Vec3, add, dist, dot, len, mean, mul, sub } from './vec';

/*
 * Metric facts of R³/Γ, computed from the group (NOTES.md §7a).
 * - Injectivity radius: half the length of the shortest closed geodesic. A closed geodesic is the axis of some γ ≠ 1
 *   (translation, screw or glide), and its length is γ's smallest displacement, |P t| with P the projection onto the
 *   vectors L fixes.
 * - Diameter: the largest distance between two points. From p, the farthest point is the farthest corner of the
 *   Voronoi cell of p among its images Γp; the diameter is the largest of these over p.
 */

/** the part of t that L fixes: the average of L^j t over the cyclic group L generates (order at most 6) */
function fixedPart(g: Iso): Vec3 {
  if (isTranslation(g)) return g.t;
  const L: Iso = { A: g.A, t: [0, 0, 0] };
  let sum: Vec3 = [0, 0, 0], cur = g.t, P = IDENTITY.A, k = 0;
  do {
    sum = add(sum, cur);
    cur = applyLinear(L, cur);
    P = mul3(g.A, P);
    k++;
  } while (k < 12 && !P.every((v, i) => Math.abs(v - IDENTITY.A[i]) < 1e-9));
  return mul(sum, 1 / k);
}
const mul3 = (a: number[], b: number[]): number[] => {
  const o: number[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o.push(a[3 * r] * b[c] + a[3 * r + 1] * b[3 + c] + a[3 * r + 2] * b[6 + c]);
  return o;
};

/** The smallest displacement of γ: the length of the closed geodesic it gives. */
export const translationLength = (g: Iso): number => len(fixedPart(g));

/** Half the length of the shortest closed geodesic. */
export function injectivityRadius(spec: Spec, gamma = new Gamma(spec.gens, spec.lattice)): number {
  const D = spec.dom(), c = mean(D.V);
  const rho = Math.max(...D.V.map((v) => dist(v, c)));
  let best = Math.min(...spec.lattice.map(len));
  // every closed geodesic is conjugate to one through D; for such γ the displacement at c is at most
  // √(s² + (2ρ)²), s its translation length, so this radius finds every γ that could beat `best`
  const R = Math.sqrt(best * best + 4 * rho * rho) + 1e-9;
  for (const g of gamma.near(c, c, R)) {
    const s = translationLength(g);
    if (s > 1e-9) best = Math.min(best, s);
  }
  return best / 2;
}

/* ---------- Voronoi cells by clipping a convex polytope ---------- */
type Poly = Vec3[][]; // faces, each a polygon

function cube(c: Vec3, h: number): Poly {
  const P = (i: number, j: number, k: number): Vec3 => [c[0] + (i ? h : -h), c[1] + (j ? h : -h), c[2] + (k ? h : -h)];
  return [
    [P(0, 0, 0), P(0, 1, 0), P(1, 1, 0), P(1, 0, 0)], [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)],
    [P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], [P(0, 1, 0), P(0, 1, 1), P(1, 1, 1), P(1, 1, 0)],
    [P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0)], [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)],
  ];
}

/** keep the part with n·x <= d */
function clip(poly: Poly, n: Vec3, d: number): Poly {
  const out: Poly = [], cut: Vec3[] = [];
  for (const f of poly) {
    const next: Vec3[] = [];
    for (let i = 0; i < f.length; i++) {
      const P = f[i], Q = f[(i + 1) % f.length], sp = dot(n, P) - d, sq = dot(n, Q) - d;
      if (sp <= 0) next.push(P);
      if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
        const X = add(P, mul(sub(Q, P), sp / (sp - sq)));
        next.push(X);
        cut.push(X);
      } else if (sp === 0) cut.push(P);
    }
    if (next.length >= 3) out.push(next);
  }
  const pts: Vec3[] = [];
  for (const p of cut) if (!pts.some((q) => dist(p, q) < 1e-12)) pts.push(p);
  if (pts.length >= 3) {
    // the new face: the cut points in order round their centre
    const m = mean(pts), u0 = sub(pts[0], m), u = mul(u0, 1 / (len(u0) || 1));
    const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    out.push(pts.map((p) => ({ p, a: Math.atan2(dot(sub(p, m), v), dot(sub(p, m), u)) })).sort((a, b) => a.a - b.a).map((x) => x.p));
  }
  return out;
}

/** The farthest corner y of the Voronoi cell of p among the points Γp, and its distance r from p. */
export function farthest(gamma: Gamma, p: Vec3, guess: number, near?: (p: Vec3, r: number) => Iso[]): { r: number; y: Vec3 } {
  let r = 2.2 * guess;
  const find = near ?? ((q: Vec3, rr: number) => gamma.near(q, q, rr));
  for (let tries = 0; tries < 8; tries++) {
    let cell = cube(p, 2 * r), far = Infinity, y = p;
    // nearest images first; once an image is more than twice as far as every corner, it and the rest cannot cut
    const images = find(p, r).map((g) => sub(applyIso(g, p), p)).filter((d) => dot(d, d) > 1e-18)
      .sort((a, b) => dot(a, a) - dot(b, b));
    for (const dq of images) {
      if (dot(dq, dq) >= 4 * far * far) break;
      cell = clip(cell, dq, dot(dq, add(p, mul(dq, 0.5))));
      far = 0;
      for (const f of cell) for (const v of f) { const d = dist(v, p); if (d > far) { far = d; y = v; } }
    }
    if (2 * far <= r) return { r: far, y }; // every image that could cut the cell was used
    r = 2.05 * far;
  }
  throw new Error('covering radius did not settle');
}
const applyIso = (g: Iso, p: Vec3): Vec3 => add(applyLinear(g, p), g.t);

/** Two points at the largest distance apart: p, and y the copy of the other point nearest p (so r = |y - p|). */
export interface Pair { r: number; p: Vec3; y: Vec3 }
/** A certified range for the diameter: `best` is a real pair of points, and no pair is farther apart than `upper`. */
export interface DiameterBounds { best: Pair; upper: number; done: boolean }

interface Box { c: number[]; h: number; ub: number; R: number; els: Iso[] }

/** candidate lists reach this many half-diagonals past 2.2 R (see DiameterSearch) */
const KAPPA = 11;

/**
 * The diameter by branch and bound. Two facts about the covering radius R(p):
 * - if u is fixed by every linear part, γ(p + u) = γp + u, so R(p + u) = R(p): R only depends on p's position across
 *   the fixed directions (none for c22, all three for the 3-torus);
 * - moving p by δ across them moves each image γp - p by at most |δ| relative to p (choose the frame in which the
 *   images move by Lδ - Pδ, P the projection onto the fixed directions), so R changes by at most |δ|.
 * So on a cube of half-side h in the k across directions (half-diagonal δ = √k h), R is at most R(centre) + δ. Cubes
 * are split, best bound first, until no cube can beat the best pair found by more than `tol`.
 *
 * Each cube keeps the elements γ with |γc - c| <= 2.2 R(c) + KAPPA δ. For p in the cube that holds every γ with
 * |γp - p| <= 2.2 R(c) + (KAPPA - 2) δ, which is more than the 2.2 (R(c) + δ) a Voronoi cell of p needs, and more
 * than its children's lists need (2.2 (R(c) + δ + δ/2) + KAPPA δ/2 <= 2.2 R(c) + (KAPPA - 2) δ once KAPPA >= 10.6).
 * `step` works for a time budget, so a page can spread the search over frames.
 */
export class DiameterSearch {
  private heap: Box[] = [];
  private gamma: Gamma;
  /** origin and orthonormal directions across the fixed space */
  private o: Vec3;
  private axes: Vec3[];
  best: Pair = { r: 0, p: [0, 0, 0], y: [0, 0, 0] };
  readonly tol: number;
  private L: number;
  /** the largest bound of a cube dropped without splitting */
  private pruned = 0;

  constructor(spec: Spec, opts: { tol?: number; gamma?: Gamma } = {}) {
    this.gamma = opts.gamma ?? new Gamma(spec.gens, spec.lattice);
    const D = spec.dom(), L = Math.cbrt(spec.covolume);
    this.L = L;
    this.tol = (opts.tol ?? 1e-3) * L;
    this.axes = acrossFixed(this.gamma.reps.map((g) => g.A));
    this.o = mean(D.V);
    const k = this.axes.length;
    const proj = D.V.map((v) => this.axes.map((e) => dot(sub(v, this.o), e)));
    const lo = this.axes.map((_, i) => Math.min(...proj.map((q) => q[i]))), hi = this.axes.map((_, i) => Math.max(...proj.map((q) => q[i])));
    const h = 0.125 * L, n = lo.map((l, i) => Math.max(1, Math.ceil((hi[i] - l) / (2 * h))));
    const idx = (m: number): number[][] => (m === k ? [[]] : idx(m + 1).flatMap((rest) => [...Array(n[m]).keys()].map((i) => [i, ...rest])));
    for (const I of idx(0)) this.add(I.map((i, m) => lo[m] + (2 * i + 1) * h), h, null);
  }

  private point(c: number[]): Vec3 {
    return this.axes.reduce((p, e, i) => add(p, mul(e, c[i])), this.o);
  }

  /** evaluate R at the centre of a new cube (using its parent's list), then keep the cube if it could still win */
  private add(c: number[], h: number, parent: Box | null): void {
    const p = this.point(c), delta = Math.sqrt(c.length) * h;
    const f = parent
      ? farthest(this.gamma, p, parent.R + Math.sqrt(c.length) * parent.h, (q, r) => parent.els.filter((g) => dist(applyIso(g, q), q) <= r))
      : farthest(this.gamma, p, this.L);
    if (f.r > this.best.r) this.best = { r: f.r, p, y: f.y };
    const ub = f.r + delta;
    if (ub <= this.best.r + this.tol || !c.length) { this.pruned = Math.max(this.pruned, ub); return; }
    const reach = 2.2 * f.r + KAPPA * delta;
    const els = parent
      ? parent.els.filter((g) => dist(applyIso(g, p), p) <= reach)
      : this.gamma.near(p, p, reach);
    // binary max-heap on ub
    const H = this.heap;
    H.push({ c, h, ub, R: f.r, els });
    for (let i = H.length - 1; i > 0;) {
      const j = (i - 1) >> 1;
      if (H[j].ub >= H[i].ub) break;
      [H[i], H[j]] = [H[j], H[i]];
      i = j;
    }
  }

  private pop(): Box | undefined {
    const H = this.heap, top = H[0], last = H.pop();
    if (!H.length || !last) return top;
    H[0] = last;
    for (let i = 0; ;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < H.length && H[l].ub > H[m].ub) m = l;
      if (r < H.length && H[r].ub > H[m].ub) m = r;
      if (m === i) break;
      [H[i], H[m]] = [H[m], H[i]];
      i = m;
    }
    return top;
  }

  get upper(): number { return Math.max(this.best.r, this.pruned, this.heap.length ? this.heap[0].ub : 0); }
  get done(): boolean { return !this.heap.length || this.heap[0].ub <= this.best.r + this.tol; }

  /** search for about `ms` milliseconds (Infinity: to the end) */
  step(ms = Infinity): DiameterBounds {
    const end = performance.now() + ms;
    while (!this.done && performance.now() < end) {
      const b = this.pop()!;
      if (b.ub <= this.best.r + this.tol) { this.pruned = Math.max(this.pruned, b.ub); continue; }
      const h = b.h / 2;
      for (let corner = 0; corner < 1 << b.c.length; corner++) this.add(b.c.map((x, i) => x + ((corner >> i) & 1 ? h : -h)), h, b);
    }
    return { best: this.best, upper: this.upper, done: this.done };
  }
}

/** The diameter, to within `tol` (in units of the cube root of the volume). */
export function diameter(spec: Spec, opts: { tol?: number } = {}): number {
  return new DiameterSearch(spec, opts).step().best.r;
}
export function farthestPair(spec: Spec, opts: { tol?: number } = {}): DiameterBounds {
  return new DiameterSearch(spec, opts).step();
}

/** An orthonormal basis of the directions perpendicular to every vector that all the linear parts fix. */
function acrossFixed(linear: number[][]): Vec3[] {
  // P = average of the linear parts (the holonomy is a group) projects onto the fixed vectors; I - P across them
  const Q = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) - linear.reduce((s, A) => s + A[3 * i + j], 0) / linear.length));
  const out: Vec3[] = [];
  for (const col of [0, 1, 2]) {
    let v: Vec3 = [Q[0][col], Q[1][col], Q[2][col]];
    for (const e of out) v = sub(v, mul(e, dot(v, e)));
    if (len(v) > 1e-6) out.push(mul(v, 1 / len(v)));
  }
  return out;
}
