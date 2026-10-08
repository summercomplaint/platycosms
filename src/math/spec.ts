import type { Domain } from './domain';
import type { Iso } from './iso';
import type { Vec3 } from './vec';

/** Everything the maths needs to know about one platycosm: the group and a fundamental domain. */
export interface Spec {
  id: string;
  /** Builds a fresh fundamental domain (it is mutated by the analysis). */
  dom: () => Domain;
  /** A generating set of the group, including all lattice translations. */
  gens: Iso[];
  /** A basis of the translation subgroup (as vectors). */
  lattice: [Vec3, Vec3, Vec3];
  orientable: boolean;
  /** Volume of R^3 / Gamma. */
  covolume: number;
  /** Extra segments to draw on the boundary of the domain (closed up under the gluings by the analysis). */
  extraEdges?: [Vec3, Vec3][];
}
