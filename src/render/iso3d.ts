import { Matrix4, Vector3 } from 'three';
import { Iso, det, screwOf } from '../math/iso';
import { Vec3, dot, len, mul, sub, unit } from '../math/vec';

export const toMatrix4 = (g: Iso): Matrix4 =>
  new Matrix4().set(g.A[0], g.A[1], g.A[2], g.t[0], g.A[3], g.A[4], g.A[5], g.t[1], g.A[6], g.A[7], g.A[8], g.t[2], 0, 0, 0, 1);

/**
 * A continuous path of maps from the identity (tau = 0) to g (tau = 1), as matrices.
 * - translation: linear slide
 * - screw (proper rotation plus slide): rotate about the screw axis while sliding along it
 * - glide reflection: slide in the mirror plane while the mirror direction is squashed through zero and flipped
 */
export function isoPath(g: Iso): (tau: number) => Matrix4 {
  if (det(g) > 0) {
    const s = screwOf(g);
    const axis = new Vector3(...s.axis), point = new Vector3(...s.point);
    return (tau) => {
      const M = new Matrix4().makeTranslation(point.x + axis.x * s.slide * tau, point.y + axis.y * s.slide * tau, point.z + axis.z * s.slide * tau);
      M.multiply(new Matrix4().makeRotationAxis(axis, ((s.angle * Math.PI) / 180) * tau));
      M.multiply(new Matrix4().makeTranslation(-point.x, -point.y, -point.z));
      return M;
    };
  }
  const m = mirrorNormal(g);
  const sOff = dot(g.t, m);
  const u: Vec3 = sub(g.t, mul(m, sOff));
  return (tau) => {
    // x -> x - 2 tau (m.x - tau s/2) m, then slide by tau u
    const k = 2 * tau;
    return new Matrix4().set(
      1 - k * m[0] * m[0], -k * m[0] * m[1], -k * m[0] * m[2], tau * tau * sOff * m[0] + tau * u[0],
      -k * m[1] * m[0], 1 - k * m[1] * m[1], -k * m[1] * m[2], tau * tau * sOff * m[1] + tau * u[1],
      -k * m[2] * m[0], -k * m[2] * m[1], 1 - k * m[2] * m[2], tau * tau * sOff * m[2] + tau * u[2],
      0, 0, 0, 1,
    );
  };
}

/** The unit normal m of the mirror of a pure reflection A = I - 2 m m^T. */
export function mirrorNormal(g: Iso): Vec3 {
  const A = g.A;
  const cols: Vec3[] = [
    [(1 - A[0]) / 2, -A[3] / 2, -A[6] / 2],
    [-A[1] / 2, (1 - A[4]) / 2, -A[7] / 2],
    [-A[2] / 2, -A[5] / 2, (1 - A[8]) / 2],
  ];
  const best = cols.reduce((b, c) => (len(c) > len(b) ? c : b), cols[0]);
  return unit(best);
}
