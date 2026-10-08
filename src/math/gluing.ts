import type { Analysis } from './analyze';
import { Iso, apply, det, inverse, isTranslation, key as isoKey, rotationAngle, screwOf } from './iso';
import { Vec3, mean } from './vec';

/** Plain names for the faces of the domain: left/right (x), front/back (y), bottom/top (z), otherwise "side k". */
export function faceName(n: Vec3, index: number): string {
  const ax = n.findIndex((v) => Math.abs(Math.abs(v) - 1) < 1e-6);
  if (ax < 0) return 'side ' + (index - 1);
  return [['left', 'right'], ['front', 'back'], ['bottom', 'top']][ax][n[ax] > 0 ? 1 : 0];
}

const TURN_NAME: Record<number, string> = { 60: 'one-sixth turn', 90: 'quarter turn', 120: 'one-third turn', 180: 'half turn' };

export function kindOf(g: Iso): string {
  if (isTranslation(g)) return 'translation';
  if (det(g) < 0) return 'mirror flip';
  const deg = Math.round(rotationAngle(g));
  return TURN_NAME[deg] ?? deg + '° turn';
}

const axisName = (v: Vec3): string => {
  const i = v.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-6);
  return i >= 0 ? 'xyz'[i] : '(' + v.map((x) => +x.toFixed(2)).join(', ') + ')';
};
/** numbers like 1, ½, 1½, -½, otherwise two decimals */
export function num(x: number): string {
  if (Math.abs(x) < 1e-9) return '0';
  const sign = x < 0 ? '-' : '', a = Math.abs(x);
  if (Math.abs(a - Math.round(a)) < 1e-6) return sign + Math.round(a);
  if (Math.abs(a * 2 - Math.round(a * 2)) < 1e-6) { const w = Math.floor(a); return sign + (w ? w : '') + '½'; }
  if (Math.abs(a * 4 - Math.round(a * 4)) < 1e-6) { const w = Math.floor(a); return sign + (w ? w : '') + (a - w < 0.5 ? '¼' : '¾'); }
  if (Math.abs(a - Math.sqrt(3) / 2) < 1e-6) return sign + '√3/2';
  return sign + a.toFixed(2);
}
const vec = (v: Vec3) => '(' + v.map(num).join(', ') + ')';

/** A short description of an isometry, naming its axis line or mirror plane (for the gluing list). */
export function describeIso(g: Iso): string {
  if (isTranslation(g)) return 'slide by ' + vec(g.t);
  if (det(g) > 0) {
    const s = screwOf(g);
    const turn = TURN_NAME[Math.round(s.angle)] ?? Math.round(s.angle) + '° turn';
    const i = s.axis.findIndex((x) => Math.abs(Math.abs(x) - 1) < 1e-6);
    if (i < 0) return turn + ' about the direction ' + axisName(s.axis) + ', sliding ' + num(Math.abs(s.slide));
    const others = [0, 1, 2].filter((j) => j !== i);
    const line = others.every((j) => Math.abs(s.point[j]) < 1e-9)
      ? 'the ' + 'xyz'[i] + '-axis'
      : 'the line ' + others.map((j) => 'xyz'[j] + ' = ' + num(s.point[j])).join(', ');
    return turn + ' about ' + line + ', sliding ' + num(Math.abs(s.slide)) + ' along ' + 'xyz'[i];
  }
  // glide reflection x_m -> -x_m + t_m (axis-aligned in our groups): mirror in the plane x_m = t_m / 2, then slide
  const m = [0, 1, 2].find((i) => g.A[4 * i] < 0)!;
  const u = g.t.map((x, i) => (i === m ? 0 : x)) as Vec3;
  const along = [0, 1, 2].filter((i) => Math.abs(u[i]) > 1e-9);
  const slide = along.length === 1 ? num(Math.abs(u[along[0]])) + ' along ' + 'xyz'[along[0]] : 'by ' + vec(u);
  return 'mirror in the plane ' + 'xyz'[m] + ' = ' + num(g.t[m] / 2) + ', then slide ' + slide;
}

/** A pairing of two sub-faces of the domain: every polygon of `a` is glued whole to a polygon of `b`. */
export interface Pairing {
  kind: string;
  a: { face: number; name: string };
  b: { face: number; name: string };
  /** polygons on both sides (the part of face a, and the matching part of face b) */
  polys: { face: number; poly: Vec3[] }[];
  count: number;
  /** maps the face-a part onto face b, so gamma(cell) is the neighbouring copy across face b */
  gamma: Iso;
}

export function pairings(R: Analysis): Pairing[] {
  const F = R.spec.dom().F;
  const out = new Map<string, Pairing>();
  for (const r of R.regions) {
    const other = r.poly.map((p) => apply(inverse(r.gamma), p));
    const ca = mean(r.poly), cb = mean(other);
    // count each pairing once: from the lower face, or (same face) from the lexicographically smaller region
    if (r.f > r.g) continue;
    if (r.f === r.g && (ca[0] - cb[0] || ca[1] - cb[1] || ca[2] - cb[2]) > 1e-9) continue;
    const kind = kindOf(r.gamma);
    // one entry per gluing map: halves of a face glued by different maps are listed (and animated) separately
    const key = `${r.f}-${r.g}-${isoKey(r.gamma)}`;
    if (!out.has(key)) out.set(key, { kind, a: { face: r.f, name: faceName(F[r.f].n, r.f) }, b: { face: r.g, name: faceName(F[r.g].n, r.g) }, polys: [], count: 0, gamma: inverse(r.gamma) });
    const p = out.get(key)!;
    p.polys.push({ face: r.f, poly: r.poly }, { face: r.g, poly: other });
    p.count++;
  }
  return [...out.values()].sort((x, y) => x.a.face - y.a.face || x.b.face - y.b.face);
}
