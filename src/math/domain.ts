import { Vec3, cross, dot, sub } from './vec';

/** A face of the convex domain: outward unit normal n, plane n.p = d, and the corner indices of its polygon (cyclic). */
export interface Face { n: Vec3; d: number; poly: number[] }

/** A convex polyhedron. V and E are the *skeleton* (they grow when edges are subdivided or seams are added). */
export interface Domain { V: Vec3[]; E: [number, number][]; F: Face[] }

export const EPS = 1e-6;

export function boxDomain(lo: Vec3, hi: Vec3): Domain {
  const V: Vec3[] = [], E: [number, number][] = [], F: Face[] = [];
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++)
    V.push([i ? hi[0] : lo[0], j ? hi[1] : lo[1], k ? hi[2] : lo[2]]);
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
    const x = a ^ b;
    if (x === 1 || x === 2 || x === 4) E.push([a, b]);
  }
  for (let ax = 0; ax < 3; ax++) for (const s of [0, 1]) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3, n: Vec3 = [0, 0, 0];
    n[ax] = s ? 1 : -1;
    const idx = (bu: number, bv: number) => (s << ax) | (bu << u) | (bv << v);
    F.push({ n, d: s ? hi[ax] : -lo[ax], poly: [idx(0, 0), idx(1, 0), idx(1, 1), idx(0, 1)] });
  }
  return { V, E, F };
}

/** A regular n-gon prism with circumradius R, first corner at phaseDeg, between z0 and z1. */
export function prismDomain(n: number, R: number, phaseDeg: number, z0: number, z1: number): Domain {
  const V: Vec3[] = [], E: [number, number][] = [], F: Face[] = [];
  for (const z of [z0, z1]) for (let i = 0; i < n; i++) {
    const a = ((phaseDeg + (360 * i) / n) * Math.PI) / 180;
    V.push([R * Math.cos(a), R * Math.sin(a), z]);
  }
  for (let i = 0; i < n; i++) {
    E.push([i, (i + 1) % n]);
    E.push([n + i, n + ((i + 1) % n)]);
    E.push([i, n + i]);
  }
  F.push({ n: [0, 0, -1], d: -z0, poly: [...Array(n).keys()].reverse() });
  F.push({ n: [0, 0, 1], d: z1, poly: [...Array(n).keys()].map((i) => n + i) });
  for (let i = 0; i < n; i++) {
    const a = ((phaseDeg + (360 * (i + 0.5)) / n) * Math.PI) / 180;
    F.push({ n: [Math.cos(a), Math.sin(a), 0], d: R * Math.cos(Math.PI / n), poly: [i, (i + 1) % n, n + ((i + 1) % n), n + i] });
  }
  return { V, E, F };
}

export const cloneDomain = (D: Domain): Domain => ({
  V: D.V.map((p) => [...p] as Vec3),
  E: D.E.map((e) => [...e] as [number, number]),
  F: D.F,
});

/** Signed distance outside face f (<= 0 means on the inner side). */
export const outside = (f: Face, p: Vec3): number => dot(f.n, p) - f.d;
export const inClosed = (D: Domain, p: Vec3, e = EPS): boolean => D.F.every((f) => outside(f, p) <= e);
export const inOpen = (D: Domain, p: Vec3, e = EPS): boolean => D.F.every((f) => outside(f, p) < -e);
export const onBoundary = (D: Domain, p: Vec3): boolean => D.F.some((f) => Math.abs(outside(f, p)) <= EPS);

/** Volume of the convex domain from its original polygons. */
export function volume(D: Domain): number {
  let v = 0;
  for (const f of D.F) {
    let a: Vec3 = [0, 0, 0];
    for (let i = 1; i < f.poly.length - 1; i++) {
      const p0 = D.V[f.poly[0]], p1 = D.V[f.poly[i]], p2 = D.V[f.poly[i + 1]];
      const c = cross(sub(p1, p0), sub(p2, p0));
      a = [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
    }
    v += (f.d * Math.abs(dot(a, f.n))) / 6;
  }
  return v;
}

/** The polygon corners of face f, taken from the original corner vertices. */
export const faceCorners = (D: Domain, f: Face): Vec3[] => f.poly.map((i) => D.V[i]);
