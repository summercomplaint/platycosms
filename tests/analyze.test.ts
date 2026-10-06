import { describe, expect, it } from 'vitest';
import { analyze } from '../src/math/analyze';
import { PLATYCOSMS } from '../src/data/platycosms';

describe('analysis of each platycosm', () => {
  for (const P of PLATYCOSMS) {
    it(`${P.id}: tiles space, skeleton is invariant, Euler characteristic is 0`, () => {
      const R = analyze(P, { samples: 400 });
      console.log(
        `${P.id.padEnd(4)} V=${R.nVertexClasses} E=${R.nEdgeClasses} F=${R.nFaceClasses} ` +
          `skeleton ${R.D.V.length}v/${R.D.E.length}e seams=${R.isSeam.filter(Boolean).length} regions=${R.regions.length}`,
      );
      expect(R.errors).toEqual([]);
      expect(R.warnings).toEqual([]);
      expect(R.euler).toBe(0);
    });
  }
});
