import { describe, expect, it } from 'vitest';
import { PLATYCOSMS, byId } from '../src/data/platycosms';
import { factsFor } from '../src/data/facts';
import { analyze } from '../src/math/analyze';
import { holonomyReps } from '../src/math/group';
import { volume } from '../src/math/domain';
import {
  Mat3, defaultValues, deformSpec, inv3, metricOf, mmul, presetValues, ranges, shapeDef, shapeMatrix, transpose,
} from '../src/math/shape';
import type { Vec3 } from '../src/math/vec';

/** rank of a matrix given as rows, by Gaussian elimination */
function rank(rows: number[][], tol = 1e-7): number {
  const a = rows.map((r) => [...r]);
  let r = 0;
  for (let c = 0; c < (a[0]?.length ?? 0) && r < a.length; c++) {
    let p = r;
    for (let i = r; i < a.length; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
    if (Math.abs(a[p][c]) < tol) continue;
    [a[r], a[p]] = [a[p], a[r]];
    for (let i = 0; i < a.length; i++) if (i !== r) {
      const k = a[i][c] / a[r][c];
      for (let j = c; j < a[i].length; j++) a[i][j] -= k * a[r][j];
    }
    r++;
  }
  return r;
}

const SYM: Mat3[] = [[0, 0], [1, 1], [2, 2], [0, 1], [0, 2], [1, 2]].map(([i, j]) => {
  const E = Array(9).fill(0);
  E[3 * i + j] = E[3 * j + i] = 1;
  return E;
});
const linearParts = (id: string): Mat3[] => holonomyReps(byId(id)!.gens).map((g) => g.A);
const close = (a: Mat3, b: Mat3, tol = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < tol);
const sub3 = (a: Mat3, b: Mat3) => a.map((v, i) => v - b[i]);

/** a few shapes inside the slider ranges, different from the default */
function samples(id: string): number[][] {
  const P = byId(id)!, r = ranges(P), d = defaultValues(P);
  return [0.2, 0.55, 0.85].map((t, k) => r.map(([lo, hi], i) => {
    const s = shapeDef(id).sliders[i];
    if (s.kind === 'angle') return [75, 100, 118][(k + i) % 3];
    return d[i] * (lo / d[i]) ** (1 - t) * (hi / d[i]) ** t * (1 + 0.07 * i);
  }));
}

describe('shape parameters [paper Table 2]', () => {
  for (const P of PLATYCOSMS) {
    const N = factsFor(P.id).shapeParameters;
    it(`${P.id}: the invariant metrics form a space of dimension ${N}`, () => {
      // G symmetric with G L = L G for every linear part L: solve the linear equations on G's 6 entries
      const rows: number[][] = [];
      for (const L of linearParts(P.id)) for (let k = 0; k < 9; k++)
        rows.push(SYM.map((E) => sub3(mmul(E, L), mmul(L, E))[k]));
      expect(6 - rank(rows)).toBe(N);
    });
    it(`${P.id}: ${N - 1} sliders, and they move the shape in ${N - 1} independent directions`, () => {
      expect(shapeDef(P.id).sliders.length).toBe(N - 1);
      for (const v of [defaultValues(P), ...samples(P.id)]) {
        const G0 = metricOf(P, v)!, J: number[][] = [];
        v.forEach((_, i) => {
          const w = [...v];
          w[i] += 1e-5;
          J.push(metricOf(P, w)!.map((x, k) => (x - G0[k]) / 1e-5));
        });
        expect(rank(J, 1e-4)).toBe(N - 1);
      }
    });
    it(`${P.id}: the deformed group has the same linear parts, volume 1, and the domain still tiles`, () => {
      expect(close(shapeMatrix(P, defaultValues(P))!, [1, 0, 0, 0, 1, 0, 0, 0, 1].map((x) => x * Math.cbrt(1 / P.covolume)))).toBe(true);
      for (const v of samples(P.id)) {
        const G = metricOf(P, v)!, M = shapeMatrix(P, v)!;
        expect(close(mmul(M, M), G)).toBe(true);
        for (const L of linearParts(P.id)) {
          expect(close(mmul(G, L), mmul(L, G))).toBe(true);
          expect(close(mmul(mmul(M, L), inv3(M)), L)).toBe(true);
          expect(close(mmul(L, transpose(L)), [1, 0, 0, 0, 1, 0, 0, 0, 1])).toBe(true);
        }
        const S = deformSpec(P, M);
        expect(S.covolume).toBeCloseTo(1, 9);
        expect(volume(S.dom())).toBeCloseTo(1, 9);
        const R = analyze(S, { samples: 300, maxT: 9 }), R0 = analyze(P, { samples: 0 });
        expect(R.errors).toEqual([]);
        expect([R.nVertexClasses, R.nEdgeClasses, R.nFaceClasses]).toEqual([R0.nVertexClasses, R0.nEdgeClasses, R0.nFaceClasses]);
      }
    });
  }
});

describe('Bravais presets [paper §11]', () => {
  it('there is one preset per Bravais type, and none when there is only one', () => {
    for (const P of PLATYCOSMS) {
      const n = factsFor(P.id).bravaisTypes;
      expect(shapeDef(P.id).presets.length).toBe(n > 1 ? n : 0);
    }
  });
  it('every preset lies inside the slider ranges and is a valid shape', () => {
    for (const P of PLATYCOSMS) for (const p of shapeDef(P.id).presets) {
      const v = presetValues(P, p), r = ranges(P);
      v.forEach((x, i) => { expect(x).toBeGreaterThanOrEqual(r[i][0] - 1e-9); expect(x).toBeLessThanOrEqual(r[i][1] + 1e-9); });
      expect(metricOf(P, v)).not.toBeNull();
    }
  });

  /** the number of lattice automorphisms of the Gram matrix G (integer matrices U with Uᵀ G U = G) */
  function symmetries(G: Mat3): number {
    const q = (u: Vec3, v: Vec3) => [0, 1, 2].reduce((s, i) => s + [0, 1, 2].reduce((t, j) => t + u[i] * G[3 * i + j] * v[j], 0), 0);
    const vs: Vec3[] = [];
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (let c = -3; c <= 3; c++) vs.push([a, b, c]);
    const e: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const cand = e.map((ei) => vs.filter((v) => Math.abs(q(v, v) - q(ei, ei)) < 1e-9));
    let n = 0;
    for (const u of cand[0]) for (const v of cand[1]) {
      if (Math.abs(q(u, v) - q(e[0], e[1])) > 1e-9) continue;
      for (const w of cand[2]) {
        if (Math.abs(q(u, w) - q(e[0], e[2])) > 1e-9 || Math.abs(q(v, w) - q(e[1], e[2])) > 1e-9) continue;
        const det = u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]);
        if (Math.abs(det) === 1) n++;
      }
    }
    return n;
  }
  it('c1: the 14 presets have the symmetry orders of the 14 Bravais lattices [literature]', () => {
    const P = byId('c1')!;
    const want: Record<string, number> = { cP: 48, cI: 48, cF: 48, tP: 16, tI: 16, oP: 8, oS: 8, oI: 8, oF: 8, hP: 24, hR: 12, mP: 4, mS: 4, aP: 2 };
    const got = Object.fromEntries(shapeDef('c1').presets.map((p) => [p.name, symmetries(metricOf(P, presetValues(P, p))!)]));
    expect(got).toEqual(want);
  });

  /** conorms of the plane lattice spanned by x, y (paper Figure 1): A = -w·x, B = -w·y, C = -x·y with w = -x-y */
  const conorms = (G: Mat3, i: number, j: number) => {
    const xx = G[4 * i], yy = G[4 * j], xy = G[3 * i + j];
    return { A: xx + xy, B: yy + xy, C: -xy };
  };
  /** the pattern of a conorm triple as the paper writes it: 0 for a zero, equal values share a letter (ABC, AAB, AB0, 0BB, ...) */
  const pattern = ({ A, B, C }: { A: number; B: number; C: number }) => {
    const seen: [number, string][] = [];
    let next = 0;
    return [A, B, C].map((x) => {
      if (Math.abs(x) < 1e-9) { next++; return '0'; }
      const old = seen.find(([y]) => Math.abs(x - y) < 1e-9);
      if (old) return old[1];
      const l = 'ABC'[next++];
      seen.push([x, l]);
      return l;
    }).join('');
  };
  it('c2: the plane lattice under the screw is oblique, rectangular, rhombic, square or hexagonal [paper Table 1]', () => {
    const P = byId('c2')!;
    const got = shapeDef('c2').presets.map((p) => [p.name, pattern(conorms(metricOf(P, presetValues(P, p))!, 0, 1))]);
    expect(Object.fromEntries(got)).toEqual({ Square: 'AA0', Rectangular: 'AB0', Rhombic: 'AAB', Hexagonal: 'AAA', Oblique: 'ABC' });
  });
  it('±a1: the conorms of the glide vector and the other vector in the mirror plane give the five types', () => {
    for (const [id, gx, gy] of [['a1p', 0, 1], ['a1m', 2, 1]] as const) {
      const P = byId(id)!;
      const got = shapeDef(id).presets.map((p) => [p.name, pattern(conorms(metricOf(P, presetValues(P, p))!, gx, gy))]);
      // AB0 is the default box, where also A = B
      expect(Object.fromEntries(got)).toEqual({ AB0: 'AA0', ABC: 'ABC', ABB: 'ABB', '0BC': '0BC', '0BB': '0BB' });
    }
  });
  it('c22: all equal, two equal, all different screw vectors', () => {
    const P = byId('c22')!;
    const got = shapeDef('c22').presets.map((p) => new Set(metricOf(P, presetValues(P, p))!.filter((_, k) => k % 4 === 0).map((x) => x.toFixed(9))).size);
    expect(got).toEqual([1, 2, 3]);
  });
});

describe('carrying an analysis over to a new shape', () => {
  it('gives the same cell structure, skeleton and gluings as analysing the new shape afresh', async () => {
    const { deformAnalysis, deformPairings } = await import('../src/math/shape');
    const { pairings } = await import('../src/math/gluing');
    for (const P of PLATYCOSMS) {
      const v = samples(P.id)[1], M = shapeMatrix(P, v)!, R0 = analyze(P, { samples: 0 });
      const R = deformAnalysis(R0, M), fresh = analyze(deformSpec(P, M), { samples: 0, maxT: 9 });
      expect(R.D.V.length).toBe(fresh.D.V.length);
      for (const p of R.D.V) expect(fresh.D.V.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-9)).toBe(true);
      expect(R.volume).toBeCloseTo(1, 9);
      const a = deformPairings(pairings(R0), M), b = pairings(fresh);
      expect(a.length).toBe(b.length);
      for (const p of a) expect(b.some((q) => q.gamma.t.every((x, i) => Math.abs(x - p.gamma.t[i]) < 1e-9) && q.gamma.A.every((x, i) => Math.abs(x - p.gamma.A[i]) < 1e-9))).toBe(true);
    }
  });
});
