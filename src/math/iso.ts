import { Vec3, add, cross, dot, len, mul, sub, unit } from './vec';

/** An isometry x -> A x + t of R^3. A is orthogonal, row-major 3x3. */
export interface Iso {
  A: number[];
  t: Vec3;
}

export const apply = (g: Iso, p: Vec3): Vec3 => {
  const A = g.A, t = g.t;
  return [
    A[0] * p[0] + A[1] * p[1] + A[2] * p[2] + t[0],
    A[3] * p[0] + A[4] * p[1] + A[5] * p[2] + t[1],
    A[6] * p[0] + A[7] * p[1] + A[8] * p[2] + t[2],
  ];
};
/** The linear part only. */
export const applyLinear = (g: Iso, p: Vec3): Vec3 => apply({ A: g.A, t: [0, 0, 0] }, p);

/** g after h: x -> g(h(x)). */
export const compose = (g: Iso, h: Iso): Iso => {
  const a = g.A, b = h.A, A: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) A.push(a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]);
  return { A, t: apply(g, h.t) };
};
export const inverse = (g: Iso): Iso => {
  const a = g.A;
  const A = [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
  const t = applyLinear({ A, t: [0, 0, 0] }, g.t);
  return { A, t: [-t[0], -t[1], -t[2]] };
};
export const det = (g: Iso): number => {
  const a = g.A;
  return a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
};
export const key = (g: Iso): string => g.A.concat(g.t).map((v) => Math.round(v * 1e4)).join(',');

export const IDENTITY: Iso = { A: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
export const translation = (a: number, b: number, c: number): Iso => ({ A: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [a, b, c] });
/** diag(sx, sy, sz) x + t, with each s = +1 or -1. */
export const diag = (sx: number, sy: number, sz: number, t: Vec3): Iso => ({ A: [sx, 0, 0, 0, sy, 0, 0, 0, sz], t });
/** Rotation by `deg` about the z axis through the origin, then a slide of `tz` along z. */
export const screwZ = (deg: number, tz: number): Iso => {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  return { A: [c, -s, 0, s, c, 0, 0, 0, 1], t: [0, 0, tz] };
};

export const isTranslation = (g: Iso): boolean =>
  g.A.every((v, i) => Math.abs(v - IDENTITY.A[i]) < 1e-9);

/** The rotation angle (degrees, 0..180) of a proper rotation. */
export const rotationAngle = (g: Iso): number => {
  const c = Math.max(-1, Math.min(1, (g.A[0] + g.A[4] + g.A[8] - 1) / 2));
  return (Math.acos(c) * 180) / Math.PI;
};

/**
 * Decompose a proper isometry as a screw: rotation by `angle` about an axis with direction `axis`
 * through the point `point`, followed by a slide `slide` along the axis. A pure translation has angle 0.
 */
export interface Screw { angle: number; axis: Vec3; point: Vec3; slide: number }
export const screwOf = (g: Iso): Screw => {
  if (isTranslation(g)) {
    const L = len(g.t);
    return { angle: 0, axis: L > 1e-12 ? unit(g.t) : [0, 0, 1], point: [0, 0, 0], slide: L };
  }
  const A = g.A;
  const angle = rotationAngle(g);
  let axis: Vec3;
  if (Math.abs(angle - 180) < 1e-7) {
    // A = 2 n n^T - I, so the columns of (A + I)/2 are multiples of n
    const M = [(A[0] + 1) / 2, (A[1]) / 2, (A[2]) / 2, (A[3]) / 2, (A[4] + 1) / 2, (A[5]) / 2, (A[6]) / 2, (A[7]) / 2, (A[8] + 1) / 2];
    const cols: Vec3[] = [[M[0], M[3], M[6]], [M[1], M[4], M[7]], [M[2], M[5], M[8]]];
    axis = unit(cols.reduce((best, c) => (len(c) > len(best) ? c : best), cols[0]));
  } else {
    axis = unit([A[7] - A[5], A[2] - A[6], A[3] - A[1]]);
  }
  const slide = dot(g.t, axis);
  const tPerp = sub(g.t, mul(axis, slide));
  // choose point p on the axis plane so that (I - R) p = tPerp, i.e. solve in the plane perpendicular to the axis
  const R: Iso = { A, t: [0, 0, 0] };
  // p = (I - R)^+ tPerp : for a rotation by `angle` in the plane, (I - R) = 2 sin(angle/2) * (rotation by 90 - angle/2)
  const half = (angle * Math.PI) / 360;
  const k = 1 / (2 * Math.sin(half));
  const rot90 = cross(axis, tPerp); // axis x v turns v by +90 about the axis
  const ang = Math.PI / 2 - half;
  const p = mul(add(mul(tPerp, Math.cos(ang)), mul(rot90, Math.sin(ang))), k);
  void R;
  return { angle, axis, point: p, slide };
};
