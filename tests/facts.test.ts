import { describe, expect, it } from 'vitest';
import { FACTS, factsFor } from '../src/data/facts';
import { PLATYCOSMS } from '../src/data/platycosms';
import { orientableCoverId } from '../src/math/covers';
import { holonomyReps } from '../src/math/group';
import { summarize } from '../src/math/fibration';

/** number of free ℤ factors in a string like "ℤ² × ℤ/2" */
const freeRank = (h1: string) =>
  h1.split('×').map((s) => s.trim()).filter((s) => /^ℤ[²³]?$/.test(s)).reduce((n, s) => n + (s.endsWith('²') ? 2 : s.endsWith('³') ? 3 : 1), 0);

describe('typed facts agree with what the generators say', () => {
  for (const P of PLATYCOSMS) {
    const F = factsFor(P.id);
    it(`${P.id}: b1, holonomy, H1 rank, orientability, mapping torus`, () => {
      const s = summarize(P.gens);
      expect(F.b1).toBe(s.b1);
      expect(freeRank(F.h1)).toBe(F.b1);
      expect(F.holonomyOrder).toBe(holonomyReps(P.gens).length);
      expect(F.mappingTorus.is).toBe(s.mappingTorus);
      expect(F.orientableDoubleCover !== undefined).toBe(!P.orientable);
    });
    if (!P.orientable) {
      it(`${P.id}: orientable double cover is ${factsFor(P.id).orientableDoubleCover}`, () => {
        const want = F.orientableDoubleCover!.includes('torocosm') ? 'c1' : 'c2';
        expect(orientableCoverId(P.gens)).toBe(want);
      });
    }
  }
  it('every platycosm has facts, once', () => {
    expect(FACTS.map((f) => f.id).sort()).toEqual(PLATYCOSMS.map((p) => p.id).sort());
  });
  it('number of shape parameters sums as in the paper (Table 2): 6+4+2+2+2+3+4+4+3+3 = 33', () => {
    expect(FACTS.reduce((n, f) => n + f.shapeParameters, 0)).toBe(33);
  });
  it('Bravais types total 37 (section 11)', () => {
    expect(FACTS.reduce((n, f) => n + f.bravaisTypes, 0)).toBe(37);
  });
});
