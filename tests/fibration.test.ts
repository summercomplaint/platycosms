import { describe, expect, it } from 'vitest';
import { PLATYCOSMS, byId } from '../src/data/platycosms';
import { summarize } from '../src/math/fibration';
import { enumerate } from '../src/math/group';

const sum = (id: string) => summarize(byId(id)!.gens);

describe('mapping tori, computed from the generators', () => {
  it('b1 and the mapping-torus test', () => {
    const b1 = Object.fromEntries(PLATYCOSMS.map((P) => [P.id, summarize(P.gens).b1]));
    expect(b1).toEqual({ c1: 3, c2: 1, c3: 1, c4: 1, c6: 1, c22: 0, a1p: 2, a1m: 2, a2p: 1, a2m: 1 });
    expect(sum('c22').mappingTorus).toBe(false);
  });
  it('torocosm is T^2 x S^1', () => {
    for (const f of sum('c1').fibrations) { expect(f.fibre).toBe('torus'); expect(f.product).toBe(true); }
  });
  it('helicosms are torus bundles with a rotation as monodromy', () => {
    const want: Record<string, number> = { c2: 2, c3: 3, c4: 4, c6: 6 };
    for (const [id, order] of Object.entries(want)) {
      const s = sum(id);
      expect(s.fibrations).toHaveLength(1);
      expect(s.fibrations[0].fibre).toBe('torus');
      expect(s.fibrations[0].monodromy).toMatchObject({ kind: 'rotation', order });
    }
  });
  it('+a1 is K x S^1 (and also a torus bundle with a split reflection)', () => {
    const fs = sum('a1p').fibrations;
    expect(fs.some((f) => f.fibre === 'Klein bottle' && f.product)).toBe(true);
    expect(fs.some((f) => f.fibre === 'torus' && f.monodromy.kind === 'reflection' && f.monodromy.split)).toBe(true);
  });
  it('-a1 has both fibre types, no Klein bottle product', () => {
    const fs = sum('a1m').fibrations;
    expect(fs.some((f) => f.fibre === 'torus')).toBe(true);
    expect(fs.some((f) => f.fibre === 'torus' && f.monodromy.kind === 'reflection' && !f.monodromy.split)).toBe(true);
    expect(fs.some((f) => f.fibre === 'Klein bottle')).toBe(true);
    expect(fs.some((f) => f.fibre === 'Klein bottle' && f.product)).toBe(false);
  });
  it('amphidicosms are Klein bottle bundles only, with nontrivial monodromy', () => {
    for (const id of ['a2p', 'a2m']) {
      const fs = sum(id).fibrations;
      expect(fs).toHaveLength(1);
      expect(fs[0].fibre).toBe('Klein bottle');
      expect(fs[0].product).toBe(false);
    }
  });
  it('amphidicosms: horizontal slices, one cell high; the monodromy is a mirror (+a2) or a mirror with a half slide along it (-a2)', () => {
    for (const id of ['a2p', 'a2m']) {
      const f = sum(id).fibrations[0];
      expect(Math.abs(f.direction[2])).toBeCloseTo(1);
      expect(f.base).toBeCloseTo(0.5);
    }
    // lifts of the monodromy that mirror x and keep y: the front-to-back shift they carry, mod 1
    const mirror = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
    const shifts = (id: string) => [...new Set(enumerate(byId(id)!.gens, 10, 6)
      .filter((g) => Math.abs(g.t[2] - 0.5) < 1e-6 && g.A.every((v, i) => Math.abs(v - mirror[i]) < 1e-6))
      .map((g) => (((g.t[1] % 1) + 1) % 1).toFixed(4)))];
    expect(shifts('a2p')).toEqual(['0.0000']);
    expect(shifts('a2m')).toEqual(['0.5000']);
  });
});
