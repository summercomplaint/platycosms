import { Iso, det, key } from './iso';
import { enumerate } from './group';

/**
 * Which orientable platycosm is the orientable double cover of a non-orientable one?
 * The cover corresponds to the subgroup of orientation-preserving elements; an orientable platycosm is
 * recognised by its holonomy group: order 1 is c1, order 2 is c2 (order 3, 6 would be c3, c6; order 4 is c4 if cyclic, else c22).
 */
export function orientationSubgroupHolonomy(gens: Iso[]): { order: number; cyclic: boolean } {
  const els = enumerate(gens, 10, 4).filter((g) => det(g) > 0);
  const linear = new Map<string, Iso>();
  for (const g of els) linear.set(g.A.map((v) => Math.round(v * 1e4)).join(','), { A: g.A, t: [0, 0, 0] });
  const mats = [...linear.values()];
  const order = mats.length;
  // cyclic iff some element generates the whole group
  const mul = (a: Iso, b: Iso): Iso => {
    const A: number[] = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A.push(a.A[3 * i] * b.A[j] + a.A[3 * i + 1] * b.A[3 + j] + a.A[3 * i + 2] * b.A[6 + j]);
    return { A, t: [0, 0, 0] };
  };
  const ident = key({ A: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] });
  const cyclic = mats.some((m) => {
    let p = m, n = 1;
    while (key(p) !== ident && n <= order) { p = mul(p, m); n++; }
    return n === order;
  });
  return { order, cyclic };
}

export function orientableCoverId(gens: Iso[]): 'c1' | 'c2' | 'c3' | 'c4' | 'c6' | 'c22' {
  const { order, cyclic } = orientationSubgroupHolonomy(gens);
  if (order === 1) return 'c1';
  if (order === 2) return 'c2';
  if (order === 3) return 'c3';
  if (order === 6) return 'c6';
  return cyclic ? 'c4' : 'c22';
}
