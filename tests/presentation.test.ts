import { describe, expect, it } from 'vitest';
import { factsFor } from '../src/data/facts';
import { PLATYCOSMS } from '../src/data/platycosms';
import { enumerate } from '../src/math/group';
import { IDENTITY, Iso, compose, diag, inverse, key, screwZ, translation as T } from '../src/math/iso';
import { abelianInvariants, formatPresentation, formatWord, letters } from '../src/math/presentation';

const S3 = Math.sqrt(3), h = 0.5;
/** what each generator letter of the presentation in facts.ts stands for, as an isometry of our group */
const GENS: Record<string, Record<string, Iso>> = {
  c1: { x: T(1, 0, 0), y: T(0, 1, 0), z: T(0, 0, 1) },
  c2: { x: T(1, 0, 0), y: T(0, 1, 0), t: diag(-1, -1, 1, [0, 0, 1]) },
  c3: { x: T(1, 0, 0), y: T(0.5, S3 / 2, 0), t: screwZ(120, 1) },
  c4: { x: T(1, 0, 0), y: T(0, 1, 0), t: { A: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [0, 0, 1] } },
  c6: { x: T(1, 0, 0), y: T(0.5, S3 / 2, 0), t: screwZ(60, 1) },
  c22: { a: diag(-1, 1, -1, [0, h, h]), b: diag(1, -1, -1, [h, 0, 0]) },
  a1p: { t: diag(1, 1, -1, [1, 0, 0]), y: T(0, 1, 0), z: T(0, 0, 1) },
  a1m: { t: diag(-1, 1, 1, [0, 0, h]), u: T(h, h, 0), v: T(-h, h, 0) },
  a2p: { s: diag(1, -1, 1, [h, 0, 0]), t: diag(-1, 1, 1, [0, 0, h]), y: T(0, 1, 0) },
  a2m: { s: diag(1, -1, 1, [h, 0, 0]), t: diag(-1, 1, 1, [0, h, h]), y: T(0, 1, 0) },
};

const evalWord = (w: string, g: Record<string, Iso>): Iso =>
  letters(w).reduce((acc, [l, e]) => compose(acc, e === 1 ? g[l] : inverse(g[l])), IDENTITY);

/** 'ℤ × (ℤ/2)²' -> [2, 2, 0] (0 for a free factor), sorted like abelianInvariants */
const parseH1 = (s: string): number[] => s.split('×').flatMap((p) => {
  const m = /^\(?ℤ(?:\/(\d+))?\)?([²³])?$/.exec(p.trim())!;
  return Array(m[2] === '²' ? 2 : m[2] === '³' ? 3 : 1).fill(m[1] ? Number(m[1]) : 0);
}).sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));

describe('formatting', () => {
  it('writes powers, inverses and commutators', () => {
    expect(formatWord('aabaaB')).toBe('a²ba²b⁻¹');
    expect(formatWord('txTYx')).toBe('txt⁻¹y⁻¹x');
    expect(formatWord('[x,y]')).toBe('[x, y]');
    expect(formatPresentation({ gens: ['x', 'y'], relators: ['[x,y]', 'xxY'] })).toBe('⟨x, y | [x, y], x²y⁻¹⟩');
  });
});

describe('the presentations in facts.ts are presentations of our groups', () => {
  for (const P of PLATYCOSMS) {
    const F = factsFor(P.id), G = GENS[P.id];
    it(`${P.id}: ${formatPresentation(F.pi1)}`, () => {
      expect(Object.keys(G).sort()).toEqual([...F.pi1.gens].sort());
      // every relator is the identity map
      for (const r of F.pi1.relators) expect(key(evalWord(r, G))).toBe(key(IDENTITY));
      // the generators generate the same group as the ones in platycosms.ts
      const ours = new Set(enumerate(Object.values(G), 12, 4).map(key));
      const theirs = new Set(enumerate(P.gens, 12, 4).map(key));
      for (const g of enumerate(P.gens, 6, 2.5)) expect(ours.has(key(g))).toBe(true);
      for (const g of enumerate(Object.values(G), 6, 2.5)) expect(theirs.has(key(g))).toBe(true);
      // and the abelianization is the paper's H1 (Table 6)
      expect(abelianInvariants(F.pi1)).toEqual(parseH1(F.h1));
    });
  }
});
