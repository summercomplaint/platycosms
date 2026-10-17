import { describe, expect, it, vi } from 'vitest';
import { PLATYCOSMS, byId } from '../src/data/platycosms';
import { enumerate } from '../src/math/group';
import { apply } from '../src/math/iso';
import { diameter, farthestPair, injectivityRadius } from '../src/math/metric';
import { Mat3, defaultValues, deformSpec, mvec, presetValues, shapeDef, shapeMatrix } from '../src/math/shape';
import { Vec3, dist, dot } from '../src/math/vec';

/*
 * Injectivity radius and diameter against the paper's Table 9 (p.33), in the paper's parameters computed from the
 * shape. Table 9's "squared injectivity radius" is the squared length of the shortest closed geodesic, which is
 * (2 · injectivity radius)²; the formulas are checked in that form (NOTES.md §7a).
 */

vi.setConfig({ testTimeout: 120000 }); // the didicosm's search is in three dimensions

const n2 = (v: Vec3) => dot(v, v);
const shapeOf = (id: string, v: number[]) => {
  const P = byId(id)!, M = shapeMatrix(P, v)!;
  return { S: deformSpec(P, M), M, at: (p: Vec3) => mvec(M, p) };
};
/** conorms of the plane lattice x, y (paper Figure 1), asserting the superbase is obtuse */
function conorms(x: Vec3, y: Vec3) {
  const A = n2(x) + dot(x, y), B = n2(y) + dot(x, y), C = -dot(x, y);
  expect(Math.min(A, B, C)).toBeGreaterThanOrEqual(-1e-12);
  return { A, B, C };
}
/** the c2 / +a1 diameter: (B+C)(C+A)(A+B) / (4(BC+CA+AB)) + D/4 */
const planeDiam = (A: number, B: number, C: number, D: number) => ((B + C) * (C + A) * (A + B)) / (4 * (B * C + C * A + A * B)) + D / 4;
/** the didicosm's α (and β, γ by permuting): A + (B+C)² / max(B, C) */
const alpha = (A: number, B: number, C: number) => A + (B + C) ** 2 / Math.max(B, C);

const SHAPES: Record<string, number[][]> = {
  c2: [[1, 1, 90], [1.3, 0.8, 100], [0.8, 1.4, 115], [1.1, 0.6, 120]],
  c3: [[1.05], [0.6], [1.8]],
  c4: [[1], [0.6], [1.7]],
  c6: [[1.05], [0.6], [1.8]],
  c22: [[0.794, 0.794], [0.6, 1.1], [1.3, 0.5]],
  a1p: [[1, 1, 90], [1.3, 0.8, 100], [0.8, 1.4, 115], [1.1, 0.6, 105]],
  a1m: [[0.794, 0.794, 90], [0.7, 1.1, 100], [1.2, 0.6, 115], [0.9, 1.3, 95]],
  a2p: [[0.794, 0.794], [0.6, 1.1], [1.3, 0.5]],
  a2m: [[0.794, 0.794], [0.6, 1.1], [1.3, 0.5]],
};
/** the formula must lie in the certified interval [best, upper] that the search returns */
const inRange = (S: ReturnType<typeof shapeOf>['S'], want: number, tol = 1e-3) => {
  const { best, upper } = farthestPair(S, { tol });
  expect(want).toBeGreaterThan(best.r - 1e-9);
  expect(want).toBeLessThan(upper + 1e-9);
};

describe('injectivity radius: (2 inj)² equals Table 9', () => {
  it('c1: the shortest lattice vector [paper: the minimal vonorm]', () => {
    const P = byId('c1')!;
    for (const p of shapeDef('c1').presets) {
      const { S } = shapeOf('c1', presetValues(P, p));
      let m = Infinity;
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (let c = -3; c <= 3; c++) if (a || b || c)
        m = Math.min(m, n2(S.lattice.reduce<Vec3>((s, v, i) => [s[0] + [a, b, c][i] * v[0], s[1] + [a, b, c][i] * v[1], s[2] + [a, b, c][i] * v[2]], [0, 0, 0])));
      expect(4 * injectivityRadius(S) ** 2).toBeCloseTo(m, 9);
    }
  });
  const table: Record<string, (at: (p: Vec3) => Vec3) => number> = {
    c2: (at) => { const { A, B, C } = conorms(at([1, 0, 0]), at([0, 1, 0])), D = n2(at([0, 0, 1])); return Math.min(B + C, C + A, A + B, D); },
    c3: (at) => { const A = n2(at([1, 0, 0])) / 2, D = n2(at([0, 0, 1])); return Math.min(2 * A, D); },
    c4: (at) => { const A = n2(at([1, 0, 0])), D = n2(at([0, 0, 1])); return Math.min(A, D); },
    c6: (at) => { const A = n2(at([1, 0, 0])) / 2, D = n2(at([0, 0, 1])); return Math.min(2 * A, D); },
    // the three screw vectors
    c22: (at) => Math.min(n2(at([0.5, 0, 0])), n2(at([0, 0.5, 0])), n2(at([0, 0, 0.5]))),
    // x the glide vector, y the second vector in the mirror plane, z normal to it
    a1p: (at) => { const { A, B, C } = conorms(at([1, 0, 0]), at([0, 1, 0])), D = n2(at([0, 0, 1])); return Math.min(A + B, B + C, A + C, D); },
    a1m: (at) => {
      const { A, B, C } = conorms(at([0, 0, 0.5]), at([0, 0.5, 0])), D = n2(at([0.5, 0, 0]));
      return Math.min(A + B, A + C, B + C + D, 4 * D, 4 * (B + C));
    },
    // the two glide vectors and the translation
    a2p: (at) => Math.min(n2(at([0.5, 0, 0])), n2(at([0, 0, 0.5])), n2(at([0, 1, 0]))),
    // the glide vector x, the screw vector y, and z with 2z a translation but z, alone, no geodesic
    a2m: (at) => Math.min(n2(at([0.5, 0, 0])), n2(at([0, 0, 0.5])), 4 * n2(at([0, 0.5, 0]))),
  };
  for (const [id, f] of Object.entries(table)) it(id, () => {
    for (const v of SHAPES[id]) {
      const { S, at } = shapeOf(id, v);
      expect(4 * injectivityRadius(S) ** 2).toBeCloseTo(f(at), 9);
    }
  });
});

describe('diameter: equals Table 9 where the paper proves it', () => {
  it('c1: cubic, body-centred and face-centred cubic (covering radii √3/2 s, √5/4 s, s/2 of the cube of side s) [literature]', () => {
    const P = byId('c1')!, pre = (n: string) => presetValues(P, shapeDef('c1').presets.find((p) => p.name === n)!);
    expect(diameter(shapeOf('c1', pre('cP')).S)).toBeCloseTo(Math.sqrt(3) / 2, 9);
    expect(diameter(shapeOf('c1', pre('cI')).S)).toBeCloseTo((Math.cbrt(2) * Math.sqrt(5)) / 4, 9);
    expect(diameter(shapeOf('c1', pre('cF')).S)).toBeCloseTo(Math.cbrt(4) / 2, 9);
  });
  const table: Record<string, (at: (p: Vec3) => Vec3) => number> = {
    c2: (at) => { const { A, B, C } = conorms(at([1, 0, 0]), at([0, 1, 0])); return planeDiam(A, B, C, n2(at([0, 0, 1]))); },
    c3: (at) => (2 / 3) * (n2(at([1, 0, 0])) / 2) + n2(at([0, 0, 1])) / 4,
    c4: (at) => n2(at([1, 0, 0])) / 2 + n2(at([0, 0, 1])) / 4,
    c6: (at) => (2 / 3) * (n2(at([1, 0, 0])) / 2) + n2(at([0, 0, 1])) / 4,
    a1p: (at) => { const { A, B, C } = conorms(at([1, 0, 0]), at([0, 1, 0])); return planeDiam(A, B, C, n2(at([0, 0, 1]))); },
    a2p: (at) => (n2(at([0.5, 0, 0])) + n2(at([0, 0, 0.5])) + n2(at([0, 1, 0]))) / 4,
  };
  for (const [id, f] of Object.entries(table)) it(id, () => {
    for (const v of SHAPES[id]) {
      const { S, at } = shapeOf(id, v);
      inRange(S, Math.sqrt(f(at)));
    }
  });
});

/** −a1's orbit lattice bound (paper p.33): 4R0² = max(min(I, II, III, IV), min(I, V), and the same with B and C swapped) */
function a1mBound(A: number, B: number, C: number, D: number): number {
  const one = (A: number, B: number, C: number) => {
    const De = B * C + C * A + A * B;
    const I = A + B + 4 * D + ((A + B) * (D - C) ** 2) / De;
    const II = A + B + 4 * C + ((A + B + 4 * C) * (D - C) ** 2) / De;
    const III = 2 * B + 2 * C + D + (B + C) ** 2 / D + ((B + C) * (B - A) ** 2) / De;
    const IV = 2 * A + 2 * C + D + (A + C) ** 2 / D + ((A + C) * (B - A) ** 2) / De;
    const V = A + B + 2 * C + (C * C) / D;
    return Math.max(Math.min(I, II, III, IV), Math.min(I, V));
  };
  return Math.max(one(A, B, C), one(A, C, B)) / 4;
}

describe("the paper's orbit-lattice bound (a lower bound for the diameter, conjectured to equal it)", () => {
  const bounds: Record<string, (at: (p: Vec3) => Vec3) => number> = {
    c22: (at) => {
      const [A, B, C] = [n2(at([0.5, 0, 0])), n2(at([0, 0.5, 0])), n2(at([0, 0, 0.5]))];
      return Math.max(alpha(A, B, C), alpha(B, C, A), alpha(C, A, B)) / 4;
    },
    // the paper's −a2AC:B uses two of the three: we find they are the ones led by the glide vector x and the screw vector y
    a2m: (at) => {
      const [x, y, z] = [n2(at([0.5, 0, 0])), n2(at([0, 0, 0.5])), n2(at([0, 0.5, 0]))];
      return Math.max(alpha(x, y, z), alpha(y, z, x)) / 4;
    },
    a1m: (at) => { const { A, B, C } = conorms(at([0, 0, 0.5]), at([0, 0.5, 0])); return a1mBound(A, B, C, n2(at([0.5, 0, 0]))); },
  };
  for (const [id, f] of Object.entries(bounds)) it(`${id}: the diameter is never below it, and equals it for the default shape`, () => {
    for (const v of SHAPES[id]) {
      const { S, at } = shapeOf(id, v);
      expect(farthestPair(S, { tol: 1e-2 }).upper).toBeGreaterThan(Math.sqrt(f(at)) - 1e-9);
    }
    const { S, at } = shapeOf(id, defaultValues(byId(id)!));
    inRange(S, Math.sqrt(f(at)), 5e-3);
  });

  /**
   * Some shapes have two points farther apart than the bound. The pair is checked with nothing but the generators: no
   * image of p (from a plain breadth-first search of the group) is closer to y than p itself.
   */
  const beyond: [string, number[]][] = [['c22', [1.2, 0.6]], ['a2m', [1.2, 0.6]]];
  for (const [id, v] of beyond) it(`${id} at ${v.join(', ')}: two points farther apart than the bound`, () => {
    const { S, at } = shapeOf(id, v);
    const { best } = farthestPair(S, { tol: 1e-2 });
    expect(best.r ** 2).toBeGreaterThan(bounds[id](at) * 1.02);
    const images = enumerate(S.gens, 16, 7).map((g) => apply(g, best.p));
    const nearest = Math.min(...images.map((q) => dist(q, best.y)));
    expect(nearest).toBeCloseTo(best.r, 9);
  });
});

describe('every default shape', () => {
  it('has diameter and injectivity radius computed without trouble', () => {
    for (const P of PLATYCOSMS) {
      const S = deformSpec(P, shapeMatrix(P, defaultValues(P))! as Mat3);
      expect(injectivityRadius(S)).toBeGreaterThan(0.3);
      expect(diameter(S, { tol: 1e-2 })).toBeLessThan(1.2);
    }
  });
});
