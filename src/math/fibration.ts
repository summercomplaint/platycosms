import { Iso, IDENTITY, det, key, applyLinear } from './iso';
import { enumerate, holonomyReps } from './group';
import { Vec3, add, cross, dot, len, mul, sub, unit } from './vec';

/**
 * Mapping tori. R^3/Gamma fibres over a circle exactly when the holonomy group fixes a nonzero vector v
 * (a parallel 1-form, hence b1 > 0). The fibre is then R^2/Gamma_0, where Gamma_0 = {t.v = 0} acts on the plane v-perp,
 * and the monodromy is any element with the smallest positive t.v.
 */
export interface Fibration {
  direction: Vec3;
  /** torus if every element of Gamma_0 is orientation preserving on the plane, otherwise Klein bottle */
  fibre: 'torus' | 'Klein bottle';
  /** the length of the circle direction (smallest positive t.v) */
  base: number;
  /** true if Gamma = Gamma_0 x Z, i.e. the bundle is the product fibre x S^1 */
  product: boolean;
  /** for a torus fibre: the linear part of the monodromy on the fibre lattice, otherwise how the point group quotient acts */
  monodromy: Monodromy;
}
export type Monodromy =
  | { kind: 'identity' }
  | { kind: 'rotation'; order: number; degrees: number }
  | { kind: 'reflection'; split: boolean }
  | { kind: 'quotient'; order: number };

export interface FibrationSummary {
  /** dimension of the space of holonomy-fixed vectors */
  b1: number;
  mappingTorus: boolean;
  fibrations: Fibration[];
}

const holonomyMats = (gens: Iso[]): Iso[] => holonomyReps(gens);

/** Basis of the vectors fixed by every holonomy element (null space of the stacked A - I). */
export function fixedSpace(gens: Iso[]): Vec3[] {
  const rows: number[][] = [];
  for (const g of holonomyMats(gens)) {
    const A = g.A;
    rows.push([A[0] - 1, A[1], A[2]], [A[3], A[4] - 1, A[5]], [A[6], A[7], A[8] - 1]);
  }
  // reduced row echelon form
  const M = rows.map((r) => [...r]);
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < 3 && r < M.length; c++) {
    let best = r;
    for (let i = r; i < M.length; i++) if (Math.abs(M[i][c]) > Math.abs(M[best][c])) best = i;
    if (Math.abs(M[best][c]) < 1e-9) continue;
    [M[r], M[best]] = [M[best], M[r]];
    const p = M[r][c];
    M[r] = M[r].map((v) => v / p);
    for (let i = 0; i < M.length; i++) if (i !== r) { const f = M[i][c]; M[i] = M[i].map((v, k) => v - f * M[r][k]); }
    pivots.push(c);
    r++;
  }
  const free = [0, 1, 2].filter((c) => !pivots.includes(c));
  return free.map((fc) => {
    const v: Vec3 = [0, 0, 0];
    v[fc] = 1;
    pivots.forEach((pc, i) => { v[pc] = -M[i][fc]; });
    return unit(v);
  });
}

/** An orthonormal basis of the plane perpendicular to v. */
function planeBasis(v: Vec3): [Vec3, Vec3] {
  const t: Vec3 = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(v, t));
  return [u, cross(v, u)];
}

export function fibrationAlong(gens: Iso[], v: Vec3): Fibration {
  const els = enumerate(gens, 10, 6);
  const phi = (g: Iso) => dot(g.t, v);
  const positives = els.map(phi).filter((x) => x > 1e-6);
  const base = Math.min(...positives);
  const [u, w] = planeBasis(v);
  const planeDet = (g: Iso) => {
    const a = applyLinear(g, u), b = applyLinear(g, w);
    return dot(a, u) * dot(b, w) - dot(a, w) * dot(b, u);
  };
  const kernel = els.filter((g) => Math.abs(phi(g)) < 1e-6);
  const fibre = kernel.every((g) => planeDet(g) > 0) ? 'torus' : 'Klein bottle';
  const product = els.some((g) => key({ A: g.A, t: [0, 0, 0] }) === key(IDENTITY) && len(sub(g.t, mul(v, base))) < 1e-6);
  // monodromy: an element with phi = base
  const mono = els.find((g) => Math.abs(phi(g) - base) < 1e-6)!;
  let monodromy: Monodromy;
  if (fibre === 'torus') {
    const a = applyLinear(mono, u), b = applyLinear(mono, w);
    const tr = dot(a, u) + dot(b, w), dt = planeDet(mono);
    if (dt < 0) {
      // reflection of the fibre lattice: split (diagonalisable over Z) or not. Test with the fibre lattice (kernel translations).
      const lat = kernel.filter((g) => key({ A: g.A, t: [0, 0, 0] }) === key(IDENTITY)).map((g) => g.t).filter((t) => len(t) > 1e-6);
      monodromy = { kind: 'reflection', split: reflectionIsSplit(lat, mono) };
    } else if (Math.abs(tr - 2) < 1e-6) monodromy = { kind: 'identity' };
    else {
      const degrees = Math.round((Math.acos(Math.max(-1, Math.min(1, tr / 2))) * 180) / Math.PI);
      monodromy = { kind: 'rotation', order: Math.round(360 / degrees), degrees };
    }
  } else {
    // Klein bottle fibre: the monodromy matters modulo the fibre's own point group
    const holo = new Set(kernel.map((g) => planeKey(g, u, w)));
    const all = new Set(els.map((g) => planeKey(g, u, w)));
    monodromy = product ? { kind: 'identity' } : { kind: 'quotient', order: all.size / holo.size };
  }
  return { direction: v, fibre, base, product, monodromy };
}

const planeKey = (g: Iso, u: Vec3, w: Vec3): string => {
  const a = applyLinear(g, u), b = applyLinear(g, w);
  return [dot(a, u), dot(a, w), dot(b, u), dot(b, w)].map((x) => Math.round(x * 1e4)).join(',');
};

/** Is the reflection (on the plane lattice) conjugate in GL2(Z) to diag(1,-1)? True iff every lattice vector's projection onto the +1 eigenspace is again a lattice vector. */
function reflectionIsSplit(lat: Vec3[], g: Iso): boolean {
  const sorted = [...lat].sort((a, b) => len(a) - len(b));
  const b1 = sorted[0];
  const b2 = sorted.find((t) => len(cross(b1, t)) > 1e-6)!;
  // coordinates of p in the basis (b1, b2) via the Gram matrix
  const g11 = dot(b1, b1), g12 = dot(b1, b2), g22 = dot(b2, b2), D = g11 * g22 - g12 * g12;
  const coords = (p: Vec3): [number, number] => {
    const r1 = dot(p, b1), r2 = dot(p, b2);
    return [(r1 * g22 - r2 * g12) / D, (r2 * g11 - r1 * g12) / D];
  };
  const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6;
  return [b1, b2].every((x) => {
    const half = mul(add(x, applyLinear(g, x)), 0.5);
    const [p, q] = coords(half);
    return isInt(p) && isInt(q);
  });
}

export function summarize(gens: Iso[]): FibrationSummary {
  const fixed = fixedSpace(gens);
  const b1 = fixed.length;
  if (b1 === 0) return { b1, mappingTorus: false, fibrations: [] };
  // candidate directions: the fixed basis vectors and, for b1 > 1, coordinate and diagonal directions inside the fixed space
  const cands: Vec3[] = [];
  const seen = new Set<string>();
  const addC = (v: Vec3) => { const k = v.map((x) => Math.round(Math.abs(x) * 1e4)).join(','); if (!seen.has(k)) { seen.add(k); cands.push(unit(v)); } };
  fixed.forEach(addC);
  for (const e of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec3[]) {
    // project onto the fixed space
    const p = fixed.reduce((acc, f) => { const s = dot(e, f); return [acc[0] + s * f[0], acc[1] + s * f[1], acc[2] + s * f[2]] as Vec3; }, [0, 0, 0] as Vec3);
    if (len(p) > 1e-6) addC(p);
  }
  const fibrations = cands.map((v) => fibrationAlong(gens, v));
  return { b1, mappingTorus: true, fibrations };
}

export { det };
