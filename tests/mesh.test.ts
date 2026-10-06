import { describe, expect, it } from 'vitest';
import { analyze } from '../src/math/analyze';
import { PLATYCOSMS } from '../src/data/platycosms';
import { buildModel, triangulate } from '../src/render/mesh';

/** Every clipped solid must be closed (each directed edge matched by its reverse), have positive volume, and sit inside the domain. */
describe('clipped solids are closed and inside the domain', () => {
  for (const P of PLATYCOSMS) {
    it(P.id, () => {
      const R = analyze(P, { samples: 0 });
      const model = buildModel(R);
      const tol = 4 * model.eps + 1e-6;
      let solids = 0;
      for (const piece of model.pieces) {
        if (!piece.polys.length) continue;
        solids++;
        const pos: number[] = [], nrm: number[] = [];
        triangulate(piece.polys, pos, nrm);
        for (let i = 0; i < pos.length; i += 3)
          for (const pl of model.planes) expect(pl.n[0] * pos[i] + pl.n[1] * pos[i + 1] + pl.n[2] * pos[i + 2] - pl.d).toBeLessThan(tol);
        const id = new Map<string, number>();
        const vid = (x: number, y: number, z: number) => {
          const k = [x, y, z].map((v) => Math.round(v * 1e6)).join(',');
          if (!id.has(k)) id.set(k, id.size);
          return id.get(k)!;
        };
        const dir = new Map<string, number>();
        let vol = 0;
        for (let t = 0; t < pos.length; t += 9) {
          const v = [0, 3, 6].map((o) => vid(pos[t + o], pos[t + o + 1], pos[t + o + 2]));
          if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue;
          for (let e = 0; e < 3; e++) { const k = v[e] + '>' + v[(e + 1) % 3]; dir.set(k, (dir.get(k) ?? 0) + 1); }
          const [a, b, c] = [pos.slice(t, t + 3), pos.slice(t + 3, t + 6), pos.slice(t + 6, t + 9)];
          vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
        }
        let open = 0;
        for (const [k, n] of dir) { const [a, b] = k.split('>'); if (n !== 1 || dir.get(b + '>' + a) !== 1) open++; }
        expect(open, `${piece.kind}:${piece.cls} has unmatched edges`).toBe(0);
        expect(vol).toBeGreaterThan(1e-9);
      }
      expect(solids).toBeGreaterThan(10);
    });
  }
});
