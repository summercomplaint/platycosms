import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { PLATYCOSMS } from '../src/data/platycosms';
import { apply } from '../src/math/iso';
import { analyze } from '../src/math/analyze';
import { pairings } from '../src/math/gluing';
import { isoPath, toMatrix4 } from '../src/render/iso3d';
import type { Vec3 } from '../src/math/vec';

describe('animation paths run from the identity to the symmetry', () => {
  for (const P of PLATYCOSMS) pairings(analyze(P, { samples: 0 })).map((p) => p.gamma).forEach((g, i) => {
    it(`${P.id} pairing ${i + 1}`, () => {
      const path = isoPath(g);
      const probes: Vec3[] = [[0.3, -0.7, 1.1], [0, 0, 0], [-2, 1, 0.5]];
      for (const p of probes) {
        const v = new Vector3(...p);
        expect(v.clone().applyMatrix4(path(0)).distanceTo(v)).toBeLessThan(1e-9);
        const want = new Vector3(...apply(g, p));
        expect(v.clone().applyMatrix4(path(1)).distanceTo(want)).toBeLessThan(1e-9);
        expect(v.clone().applyMatrix4(toMatrix4(g)).distanceTo(want)).toBeLessThan(1e-9);
      }
    });
  });
});
