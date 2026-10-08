import { describe, expect, it } from 'vitest';
import { PLATYCOSMS } from '../src/data/platycosms';
import { analyze } from '../src/math/analyze';
import { describeIso, pairings } from '../src/math/gluing';

describe('gluing description', () => {
  it('prints readable pairings and generator descriptions', () => {
    for (const P of PLATYCOSMS) {
      const R = analyze(P, { samples: 0 });
      const ps = pairings(R);
      console.log(P.id, ps.map((p) => `${p.a.name}<->${p.b.name} ${p.kind}${p.count > 1 ? ' x' + p.count : ''}`).join(' | '));
      console.log('   maps:', ps.map((p) => describeIso(p.gamma)).join(' ; '));
      // each region appears in exactly one pairing, so the polygons cover the faces
      expect(ps.reduce((n, p) => n + p.count, 0)).toBe(R.regions.length / 2);
    }
  });
});
