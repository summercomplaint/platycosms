import { BufferAttribute, BufferGeometry, Color, Material, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import type { Analysis } from '../math/analyze';
import { faceCorners } from '../math/domain';
import { Vec3, mean } from '../math/vec';
import { buildModel, Kind } from './mesh';
import { edgeColor, vertColor } from './palette';
import type { CrabModel } from './crab';

/** One drawable piece of a cell: a geometry with a material, placed by `local` inside the cell. */
export interface Part {
  kind: Kind | 'crab';
  /** edge or vertex class (for tubes, arrows, balls) */
  cls?: number;
  geometry: BufferGeometry;
  material: Material;
  local: Matrix4;
}

export interface CellKit {
  parts: Part[];
  /** centre of the cell, and the radius of the largest ball inside it */
  centroid: Vec3;
  inradius: number;
  /** tube radius */
  r: number;
}

export interface KitOptions { quality: 'high' | 'low'; crab: CrabModel | null }

export function buildKit(R: Analysis, opts: KitOptions): CellKit {
  const model = buildModel(R, { quality: opts.quality });
  const parts: Part[] = [];
  const I = new Matrix4();
  for (const g of model.groups) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(g.pos, 3));
    geometry.setAttribute('normal', new BufferAttribute(g.nrm, 3));
    // solid, bright plastic; the arrowhead is a lighter tint of its tube so it stands out where it flares out
    let material: Material;
    if (g.kind === 'tube') {
      material = new MeshStandardMaterial({ color: new Color(edgeColor(g.cls)), roughness: 0.35, metalness: 0 });
    } else if (g.kind === 'arrow') {
      material = new MeshStandardMaterial({ color: new Color(edgeColor(g.cls)).lerp(new Color('#ffffff'), 0.32), roughness: 0.35, metalness: 0 });
    } else {
      material = new MeshStandardMaterial({ color: new Color(vertColor(g.cls)), roughness: 0.3, metalness: 0 });
    }
    parts.push({ kind: g.kind, cls: g.cls, geometry, material, local: I });
  }

  const D = R.spec.dom();
  const corners = D.V;
  const centroid = mean(corners);
  const inradius = Math.min(...D.F.map((f) => f.d - (f.n[0] * centroid[0] + f.n[1] * centroid[1] + f.n[2] * centroid[2])));
  if (opts.crab) {
    // one crab at the centre of the cell, scaled to fit well inside the largest ball in the cell
    const k = inradius * 0.5;
    const local = new Matrix4().makeTranslation(centroid[0], centroid[1], centroid[2]).multiply(new Matrix4().makeScale(k, k, k));
    for (const p of opts.crab.parts) parts.push({ kind: 'crab', geometry: p.geometry, material: p.material, local });
  }
  void faceCorners;
  return { parts, centroid, inradius, r: model.r };
}

/** Reverse the winding of every triangle (for placing mirrored copies with front-face culling). */
export function flipWinding(g: BufferGeometry): BufferGeometry {
  const out = g.clone();
  const idx = out.getIndex();
  if (idx) {
    const a = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    idx.needsUpdate = true;
  } else {
    for (const name of Object.keys(out.attributes)) {
      const attr = out.getAttribute(name) as BufferAttribute;
      const n = attr.itemSize, arr = attr.array as Float32Array;
      for (let t = 0; t < attr.count; t += 3) for (let c = 0; c < n; c++) {
        const i1 = (t + 1) * n + c, i2 = (t + 2) * n + c, tmp = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = tmp;
      }
      attr.needsUpdate = true;
    }
  }
  return out;
}

export const v3 = (p: Vec3) => new Vector3(p[0], p[1], p[2]);
