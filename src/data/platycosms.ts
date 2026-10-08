import { boxDomain, prismDomain } from '../math/domain';
import { Iso, diag, screwZ, translation } from '../math/iso';
import type { Spec } from '../math/spec';
import type { Vec3 } from '../math/vec';

/** A platycosm as the maths sees it, with its display name. */
export interface PlatycosmDef extends Spec {
  name: string;
  /** Conway's symbol, as displayed */
  sym: string;
}

const S3 = Math.sqrt(3);
const h = 0.5, q = 0.25;
const T = translation;
const e1: Vec3 = [1, 0, 0], e2: Vec3 = [0, 1, 0], e3: Vec3 = [0, 0, 1];
const hexA: Vec3 = [1, 0, 0], hexB: Vec3 = [0.5, S3 / 2, 0];
const hexPrism = () => prismDomain(6, 1 / S3, 30, -h, h);
const cube = () => boxDomain([-h, -h, -h], [h, h, h]);
/** a loop of four segments around a box, across its long faces: x = c on the box [0,1]x[0,h]x[0,h], or z = c on [0,h]x[0,h]x[-h,h] */
const loopX = (c: number): [Vec3, Vec3][] => [[[c, 0, 0], [c, h, 0]], [[c, h, 0], [c, h, h]], [[c, h, h], [c, 0, h]], [[c, 0, h], [c, 0, 0]]];
const loopZ = (c: number): [Vec3, Vec3][] => [[[0, 0, c], [h, 0, c]], [[h, 0, c], [h, h, c]], [[h, h, c], [0, h, c]], [[0, h, c], [0, 0, c]]];

// Generators follow Conway & Rossetti, Table 12 (translation lattice Z^3 unless noted).
const screw2 = diag(-1, -1, 1, [0, 0, 1]);
const screw4: Iso = { A: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [0, 0, 1] };
const screw3 = screwZ(120, 1);
const screw6 = screwZ(60, 1);
const g22a = diag(-1, 1, -1, [0, h, h]);
const g22b = diag(1, -1, -1, [h, 0, 0]);
const glideA1 = diag(1, 1, -1, [h, 0, 0]);
// +a1 stretched by 2 along x so that its cell is a cube (the shape is a free parameter; it is the same platycosm)
const glideA1Cube = diag(1, 1, -1, [1, 0, 0]);
const a2g1p = diag(-1, 1, 1, [0, 0, h]);
const a2g1m = diag(-1, 1, 1, [0, h, h]);
const a2g2 = diag(1, -1, 1, [h, 0, 0]);

export const PLATYCOSMS: PlatycosmDef[] = [
  { id: 'c1', name: 'Torocosm', sym: 'c1', orientable: true, covolume: 1, dom: cube,
    gens: [T(1, 0, 0), T(0, 1, 0), T(0, 0, 1)], lattice: [e1, e2, e3] },
  { id: 'c2', name: 'Dicosm', sym: 'c2', orientable: true, covolume: 1, dom: cube,
    gens: [T(1, 0, 0), T(0, 1, 0), screw2], lattice: [e1, e2, [0, 0, 2]] },
  { id: 'c3', name: 'Tricosm', sym: 'c3', orientable: true, covolume: S3 / 2, dom: hexPrism,
    gens: [T(1, 0, 0), T(0.5, S3 / 2, 0), screw3], lattice: [hexA, hexB, [0, 0, 3]] },
  { id: 'c4', name: 'Tetracosm', sym: 'c4', orientable: true, covolume: 1, dom: cube,
    gens: [T(1, 0, 0), T(0, 1, 0), screw4], lattice: [e1, e2, [0, 0, 4]] },
  { id: 'c6', name: 'Hexacosm', sym: 'c6', orientable: true, covolume: S3 / 2, dom: hexPrism,
    gens: [T(1, 0, 0), T(0.5, S3 / 2, 0), screw6], lattice: [hexA, hexB, [0, 0, 6]] },
  { id: 'c22', name: 'Didicosm', sym: 'c22', orientable: true, covolume: q,
    dom: () => boxDomain([0, 0, 0], [1, h, h]),
    gens: [g22a, g22b, T(1, 0, 0), T(0, 1, 0), T(0, 0, 1)], lattice: [e1, e2, e3],
    // a midline round the long faces, so the box reads as two cubes and the half turns are easier to follow
    extraEdges: loopX(h) },
  { id: 'a1p', name: 'First amphicosm', sym: '+a1', orientable: false, covolume: 1, dom: cube,
    gens: [glideA1Cube, T(2, 0, 0), T(0, 1, 0), T(0, 0, 1)], lattice: [[2, 0, 0], e2, e3] },
  { id: 'a1m', name: 'Second amphicosm', sym: '−a1', orientable: false, covolume: q,
    dom: () => boxDomain([0, 0, -h], [h, h, h]),
    gens: [glideA1, T(1, 0, 0), T(0, h, h), T(0, h, -h)], lattice: [e1, [0, h, h], [0, h, -h]],
    extraEdges: loopZ(0) },
  { id: 'a2p', name: 'First amphidicosm', sym: '+a2', orientable: false, covolume: q,
    dom: () => boxDomain([0, 0, 0], [1, h, h]),
    gens: [a2g1p, a2g2, T(1, 0, 0), T(0, 1, 0), T(0, 0, 1)], lattice: [e1, e2, e3],
    extraEdges: loopX(h) },
  { id: 'a2m', name: 'Second amphidicosm', sym: '−a2', orientable: false, covolume: q,
    dom: () => boxDomain([0, 0, 0], [1, h, h]),
    gens: [a2g1m, a2g2, T(1, 0, 0), T(0, 1, 0), T(0, 0, 1)], lattice: [e1, e2, e3] },
];

export const byId = (id: string): PlatycosmDef | undefined => PLATYCOSMS.find((p) => p.id === id);
