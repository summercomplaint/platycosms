import type { Analysis } from './analyze';
import type { Pairing } from './gluing';
import type { Domain } from './domain';
import type { Iso } from './iso';
import type { Spec } from './spec';
import { Vec3 } from './vec';

/*
 * The shape of a platycosm. Our generators all have orthogonal linear parts L, so a flat metric on R³/Γ is a symmetric
 * positive G that commutes with every L (an invariant metric). With M = √G (symmetric), M commutes with every L too, so
 * MΓM⁻¹ has the same linear parts and translation parts M t, and M(D) is a fundamental domain for it: same faces,
 * same gluings, new shape. NOTES.md §7a.
 *
 * G is built in the axes of our default box (x length, y depth, z height) as G = S C S, S = diag(m) the stretch of each
 * axis and C the cosines of the angles between the stretched axes. Which angles may move is set by the holonomy: an
 * entry of G may be non-zero only if it commutes with every L.
 */

export type Mat3 = number[]; // row-major 3x3

export interface Slider {
  kind: 'depth' | 'height' | 'angle';
  label: string;
  /** for an angle: the two axes (0 x, 1 y, 2 z) */
  pair?: [number, number];
}

export interface Preset { name: string; title: string; m: Vec3; angles: Record<string, number> }

export interface ShapeDef {
  sliders: Slider[];
  /** x and y stretched together (the helicosms with a turn of order 3, 4, 6) */
  tied: boolean;
  /** Bravais types (paper §11); empty when there is just one */
  presets: Preset[];
}

const depth: Slider = { kind: 'depth', label: 'Depth' };
const height: Slider = { kind: 'height', label: 'Height' };
const NAMES = ['length', 'depth', 'height'];
const angle = (i: number, j: number, label = 'Angle'): Slider => ({ kind: 'angle', label, pair: [i, j] });
const pk = (i: number, j: number) => `${i}${j}`;

/* ---------- small linear algebra ---------- */
export const mmul = (a: Mat3, b: Mat3): Mat3 => {
  const o: number[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]);
  return o;
};
export const mvec = (a: Mat3, v: Vec3): Vec3 => [
  a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]];
export const transpose = (a: Mat3): Mat3 => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
export const det3 = (a: Mat3): number =>
  a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
export function inv3(a: Mat3): Mat3 {
  const [p, q, r, s, t, u, v, w, x] = a, D = det3(a);
  return [(t * x - u * w) / D, (r * w - q * x) / D, (q * u - r * t) / D, (u * v - s * x) / D, (p * x - r * v) / D,
    (r * s - p * u) / D, (s * w - t * v) / D, (q * v - p * w) / D, (p * t - q * s) / D];
}
export const I3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Eigen-decomposition of a symmetric 3x3 matrix (Jacobi): G = V diag(w) Vᵀ, eigenvectors in the columns of V. */
function eigSym(G: Mat3): { w: Vec3; V: Mat3 } {
  const a = [...G], V = [...I3];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = a[1] ** 2 + a[2] ** 2 + a[5] ** 2;
    if (off < 1e-30) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      const apq = a[3 * p + q];
      if (Math.abs(apq) < 1e-300) continue;
      const th = (a[3 * q + q] - a[3 * p + p]) / (2 * apq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      // a <- Jᵀ a J, V <- V J with the rotation J in the (p, q) plane
      for (let k = 0; k < 3; k++) {
        const akp = a[3 * k + p], akq = a[3 * k + q];
        a[3 * k + p] = c * akp - s * akq;
        a[3 * k + q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[3 * p + k], aqk = a[3 * q + k];
        a[3 * p + k] = c * apk - s * aqk;
        a[3 * q + k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = V[3 * k + p], vkq = V[3 * k + q];
        V[3 * k + p] = c * vkp - s * vkq;
        V[3 * k + q] = s * vkp + c * vkq;
      }
    }
  }
  return { w: [a[0], a[4], a[8]], V };
}

/** The symmetric positive square root of a symmetric positive matrix. */
export function sqrtSym(G: Mat3): Mat3 {
  const { w, V } = eigSym(G);
  const D = [Math.sqrt(w[0]), 0, 0, 0, Math.sqrt(w[1]), 0, 0, 0, Math.sqrt(w[2])];
  const S = mmul(mmul(V, D), transpose(V));
  return S.map((v, i) => (v + S[3 * (i % 3) + Math.floor(i / 3)]) / 2); // exactly symmetric
}

/* ---------- the shapes ---------- */
/** a preset from basis vectors: their lengths and the angles between them */
function fromBasis(name: string, title: string, b: Vec3[]): Preset {
  const n = b.map((v) => Math.hypot(...v));
  const ang = (i: number, j: number) => (Math.acos((b[i][0] * b[j][0] + b[i][1] * b[j][1] + b[i][2] * b[j][2]) / (n[i] * n[j])) * 180) / Math.PI;
  return { name, title, m: n as Vec3, angles: { [pk(0, 1)]: ang(0, 1), [pk(1, 2)]: ang(1, 2), [pk(0, 2)]: ang(0, 2) } };
}
const rad = (d: number) => (d * Math.PI) / 180;
/** conventional cell a, b, c with the angle beta between a and c (monoclinic, unique axis b) */
const cell = (a: number, b: number, c: number, beta = 90): Vec3[] => [[a, 0, 0], [0, b, 0], [c * Math.cos(rad(beta)), 0, c * Math.sin(rad(beta))]];
const sum = (...vs: [number, Vec3][]): Vec3 => vs.reduce<Vec3>((s, [k, v]) => [s[0] + k * v[0], s[1] + k * v[1], s[2] + k * v[2]], [0, 0, 0]);
const primitive = (A: Vec3[], centring: 'P' | 'C' | 'I' | 'F'): Vec3[] => {
  const [a, b, c] = A, h = 0.5;
  if (centring === 'C') return [sum([h, a], [h, b]), sum([h, a], [-h, b]), c];
  if (centring === 'I') return [sum([-h, a], [h, b], [h, c]), sum([h, a], [-h, b], [h, c]), sum([h, a], [h, b], [-h, c])];
  if (centring === 'F') return [sum([h, b], [h, c]), sum([h, a], [h, c]), sum([h, a], [h, b])];
  return A;
};
/** The 14 Bravais lattices of the torocosm, as primitive bases of standard conventional cells [literature]. */
const C1_PRESETS: Preset[] = [
  fromBasis('cP', 'Cubic', cell(1, 1, 1)),
  fromBasis('cI', 'Body-centred cubic', primitive(cell(1, 1, 1), 'I')),
  fromBasis('cF', 'Face-centred cubic', primitive(cell(1, 1, 1), 'F')),
  fromBasis('tP', 'Tetragonal', cell(1, 1, 1.5)),
  fromBasis('tI', 'Body-centred tetragonal', primitive(cell(1, 1, 1.5), 'I')),
  fromBasis('oP', 'Orthorhombic', cell(1, 1.25, 1.5)),
  fromBasis('oS', 'Base-centred orthorhombic', primitive(cell(1, 1.4, 1.2), 'C')),
  fromBasis('oI', 'Body-centred orthorhombic', primitive(cell(1, 1.2, 1.4), 'I')),
  fromBasis('oF', 'Face-centred orthorhombic', primitive(cell(1, 1.2, 1.4), 'F')),
  fromBasis('hP', 'Hexagonal', [[1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [0, 0, 1.3]]),
  fromBasis('hR', 'Rhombohedral', rhombohedral(75)),
  fromBasis('mP', 'Monoclinic', cell(1, 1.2, 1.4, 105)),
  fromBasis('mS', 'Base-centred monoclinic', primitive(cell(1, 1.4, 1.2, 105), 'C')),
  fromBasis('aP', 'Triclinic', triclinic(1, 1.15, 1.3, 80, 95, 105)),
];
function rhombohedral(alpha: number): Vec3[] {
  return triclinic(1, 1, 1, alpha, alpha, alpha);
}
/** basis with lengths a, b, c and angles alpha (b, c), beta (a, c), gamma (a, b) */
function triclinic(a: number, b: number, c: number, al: number, be: number, ga: number): Vec3[] {
  const [ca, cb, cg, sg] = [Math.cos(rad(al)), Math.cos(rad(be)), Math.cos(rad(ga)), Math.sin(rad(ga))];
  const cx = cb, cy = (ca - cb * cg) / sg;
  return [[a, 0, 0], [b * cg, b * sg, 0], [c * cx, c * cy, c * Math.sqrt(1 - cx * cx - cy * cy)]];
}

/**
 * The amphicosms (paper §4 and §11): the glide vector x and a second vector y span the mirror plane, z is normal to it.
 * With conorms A = -w·x, B = -w·y, C = -x·y (w = -x-y): N(x) = A + C, N(y) = B + C. The five Bravais types keep the
 * glide's role: ABC, ABB (B = C), 0BC (A = 0), 0BB, AB0 (C = 0).
 */
function amphiPresets(gx: number, gy: number): Preset[] {
  const t = (name: string, title: string, A: number, B: number, C: number): Preset => {
    const x = Math.sqrt(A + C), y = Math.sqrt(B + C), m: Vec3 = [1, 1, 1];
    m[gx] = x;
    m[gy] = y;
    return { name, title, m, angles: { [pk(Math.min(gx, gy), Math.max(gx, gy))]: (Math.acos(-C / (x * y)) * 180) / Math.PI } };
  };
  return [
    t('AB0', 'C = 0', 1, 1, 0),
    t('ABC', 'A, B, C all different', 1, 0.6, 0.3),
    t('ABB', 'B = C', 1, 0.4, 0.4),
    t('0BC', 'A = 0', 0, 1, 0.5),
    t('0BB', 'A = 0, B = C', 0, 0.5, 0.5),
  ];
}

/** The plane lattice of the dicosm, under the screw: its five Bravais types [paper §11, Table 1]. */
const plane = (name: string, y: number, ang: number): Preset => ({ name, title: name, m: [1, y, 1], angles: { '01': ang } });
const C2_PRESETS = [plane('Square', 1, 90), plane('Rectangular', 1.4, 90), plane('Rhombic', 1, 110), plane('Hexagonal', 1, 120), plane('Oblique', 1.3, 105)];
/** the didicosm's three screw vectors have lengths m/2 */
const box = (name: string, m: Vec3): Preset => ({ name, title: name, m, angles: {} });
const C22_PRESETS = [box('All equal', [1, 1, 1]), box('Two equal', [1, 1, 1.4]), box('All different', [1, 1.25, 1.5])];

const SHAPES: Record<string, ShapeDef> = {
  c1: { sliders: [depth, height, angle(0, 1, 'Angle length–depth'), angle(1, 2, 'Angle depth–height'), angle(0, 2, 'Angle length–height')], tied: false, presets: C1_PRESETS },
  c2: { sliders: [depth, height, angle(0, 1)], tied: false, presets: C2_PRESETS },
  c3: { sliders: [height], tied: true, presets: [] },
  c4: { sliders: [height], tied: true, presets: [] },
  c6: { sliders: [height], tied: true, presets: [] },
  c22: { sliders: [depth, height], tied: false, presets: C22_PRESETS },
  a1p: { sliders: [depth, height, angle(0, 1)], tied: false, presets: amphiPresets(0, 1) },
  a1m: { sliders: [depth, height, angle(1, 2)], tied: false, presets: amphiPresets(2, 1) },
  a2p: { sliders: [depth, height], tied: false, presets: [] },
  a2m: { sliders: [depth, height], tied: false, presets: [] },
};

export const shapeDef = (id: string): ShapeDef => SHAPES[id];
export const angleName = (s: Slider) => (s.pair ? `${NAMES[s.pair[0]]}–${NAMES[s.pair[1]]}` : '');

/** extent of the default domain along each axis */
export function sides(spec: Spec): Vec3 {
  const V = spec.dom().V;
  return [0, 1, 2].map((i) => Math.max(...V.map((p) => p[i])) - Math.min(...V.map((p) => p[i]))) as Vec3;
}

/** A shape as stretches m and the cosine matrix C, before the volume is fixed. */
interface Raw { m: Vec3; C: Mat3 }

function cosines(def: ShapeDef, angles: (pair: [number, number]) => number): Mat3 {
  const C = [...I3];
  for (const s of def.sliders) if (s.pair) {
    const [i, j] = s.pair, c = Math.cos(rad(angles(s.pair)));
    C[3 * i + j] = C[3 * j + i] = c;
  }
  return C;
}

/** The scale k that gives volume 1: covolume · k³ m_x m_y m_z √det C = 1. */
const volumeScale = (spec: Spec, r: Raw) => Math.cbrt(1 / (spec.covolume * r.m[0] * r.m[1] * r.m[2] * Math.sqrt(det3(r.C))));

/** The slider values of the default shape (scaled to volume 1). */
export function defaultValues(spec: Spec): number[] {
  return valuesOf(spec, { m: [1, 1, 1], C: [...I3] });
}

function valuesOf(spec: Spec, r: Raw): number[] {
  const def = SHAPES[spec.id], L = sides(spec), k = volumeScale(spec, r);
  return def.sliders.map((s) => {
    if (s.kind === 'depth') return k * r.m[1] * L[1];
    if (s.kind === 'height') return k * r.m[2] * L[2];
    const [i, j] = s.pair!;
    return (Math.acos(r.C[3 * i + j]) * 180) / Math.PI;
  });
}

export function presetValues(spec: Spec, p: Preset): number[] {
  const def = SHAPES[spec.id];
  return valuesOf(spec, { m: p.m, C: cosines(def, ([i, j]) => p.angles[pk(i, j)] ?? 90) });
}

/** Slider ranges: lengths from half to twice the default, angles 40° to 140°. */
export function ranges(spec: Spec): [number, number][] {
  const d = defaultValues(spec);
  return SHAPES[spec.id].sliders.map((s, i) => (s.kind === 'angle' ? [40, 140] : [d[i] / 2, d[i] * 2]));
}

/** The metric G (in the default axes) of a shape given by its slider values, at volume 1; null if the angles are impossible. */
export function metricOf(spec: Spec, values: number[]): Mat3 | null {
  const def = SHAPES[spec.id], L = sides(spec);
  const C = cosines(def, (pair) => values[def.sliders.findIndex((s) => s.pair && s.pair[0] === pair[0] && s.pair[1] === pair[1])]);
  const dC = det3(C);
  if (!(dC > 0.02)) return null;
  const m: Vec3 = [1, 1, 1];
  def.sliders.forEach((s, i) => {
    if (s.kind === 'depth') m[1] = values[i] / L[1];
    if (s.kind === 'height') m[2] = values[i] / L[2];
  });
  // the length (and for tied axes the width too) follows from volume 1
  if (def.tied) m[0] = m[1] = Math.sqrt(1 / (spec.covolume * m[2] * Math.sqrt(dC)));
  else m[0] = 1 / (spec.covolume * m[1] * m[2] * Math.sqrt(dC));
  return [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => m[i] * m[j] * C[3 * i + j]));
}

/** The deformation M = √G for some slider values (null if impossible). */
export function shapeMatrix(spec: Spec, values: number[]): Mat3 | null {
  const G = metricOf(spec, values);
  return G ? sqrtSym(G) : null;
}

/** The length of the default box after the deformation (the quantity no slider sets). */
export const lengthOf = (spec: Spec, M: Mat3): number => sides(spec)[0] * Math.hypot(M[0], M[3], M[6]);

/* ---------- the deformed group and domain ---------- */
export function deformIso(g: Iso, M: Mat3): Iso {
  return { A: g.A, t: mvec(M, g.t) };
}

export function deformDomain(D: Domain, M: Mat3): Domain {
  const Mit = transpose(inv3(M));
  return {
    V: D.V.map((p) => mvec(M, p)),
    E: D.E.map((e) => [...e] as [number, number]),
    F: D.F.map((f) => {
      const n = mvec(Mit, f.n), l = Math.hypot(...n);
      return { n: [n[0] / l, n[1] / l, n[2] / l] as Vec3, d: f.d / l, poly: f.poly };
    }),
  };
}

/** The platycosm in another shape: MΓM⁻¹ acting on M(D). The linear parts are unchanged since M commutes with them. */
export function deformSpec<S extends Spec>(spec: S, M: Mat3): S {
  return {
    ...spec,
    dom: () => deformDomain(spec.dom(), M),
    gens: spec.gens.map((g) => deformIso(g, M)),
    lattice: spec.lattice.map((v) => mvec(M, v)) as [Vec3, Vec3, Vec3],
    covolume: spec.covolume * det3(M),
    extraEdges: spec.extraEdges?.map(([p, q]) => [mvec(M, p), mvec(M, q)] as [Vec3, Vec3]),
  };
}

/**
 * An analysis of the default shape, carried over to the shape M (the cell structure does not change, only where it
 * sits), so moving a slider need not run the analysis again. Gluings keep their face names from the default box.
 */
export function deformAnalysis(R: Analysis, M: Mat3): Analysis {
  const spec = deformSpec(R.spec, M), d = det3(M);
  return {
    ...R,
    spec,
    D: { ...deformDomain(R.D, M), V: R.D.V.map((p) => mvec(M, p)) },
    els: R.els.map((g) => deformIso(g, M)),
    regions: R.regions.map((r) => ({ ...r, gamma: deformIso(r.gamma, M), poly: r.poly.map((p) => mvec(M, p)) })),
    volume: R.volume * d,
  };
}

export function deformPairings(pairs: Pairing[], M: Mat3): Pairing[] {
  return pairs.map((p) => ({
    ...p,
    gamma: deformIso(p.gamma, M),
    polys: p.polys.map((q) => ({ face: q.face, poly: q.poly.map((v) => mvec(M, v)) })),
  }));
}
