import {
  AmbientLight, BufferGeometry, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, LineBasicMaterial, LineSegments,
  Material, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Vector3,
} from 'three';
import type { Domain } from '../math/domain';
import type { CellKit, Part } from './cellKit';
import { v3 } from './cellKit';
import type { Entry } from './entries';

/** Bright, even light so the colours stay saturated against the black. */
export function addLights(scene: Object3D): void {
  scene.add(new HemisphereLight(0xffffff, 0x5a6478, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, -4, 5);
  scene.add(sun);
  const fill = new DirectionalLight(0xffffff, 0.7);
  fill.position.set(-4, 2, -2);
  scene.add(fill);
  scene.add(new AmbientLight(0xffffff, 0.35));
}

/** What a mesh of the cell is, for hover-picking and recolouring (in `userData`). */
export interface PartTag { kind: Part['kind']; cls?: number; ball0: boolean }

export function meshOf(p: Part, material: Material = p.material): Mesh {
  const m = new Mesh(p.geometry, material);
  m.matrixAutoUpdate = false;
  m.matrix.copy(p.local);
  const tag: PartTag = { kind: p.kind, cls: p.cls, ball0: p.kind === 'ball' && p.cls === 0 };
  m.userData = tag;
  return m;
}

/**
 * The cell as seen from outside: tubes, arrows and balls in `body`, the crab in `crab`. With `own` the materials are
 * copies, so this view can dim or tint them without touching the shared kit.
 */
export function cellMeshes(kit: CellKit, own = false): { body: Group; crab: Group } {
  const body = new Group(), crab = new Group();
  for (const p of kit.parts) {
    const m = meshOf(p, own ? p.material.clone() : p.material);
    (p.kind === 'crab' ? crab : body).add(m);
  }
  return { body, crab };
}

/** the outline of the domain's faces, as line segments */
export function outlineGeometry(D: Domain): BufferGeometry {
  const lines: number[] = [];
  for (const f of D.F) f.poly.forEach((v, i) => lines.push(...D.V[v], ...D.V[f.poly[(i + 1) % f.poly.length]]));
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(lines, 3));
  return g;
}

/** The ghost copy used by the gluing animation: see-through, with an outline of the cell in the accent colour. */
export function ghostGroup(e: Entry, accent: LineBasicMaterial['color']): Group {
  const ghost = new Group();
  ghost.matrixAutoUpdate = false;
  for (const p of e.kit.parts) {
    const mat = p.material.clone() as MeshStandardMaterial;
    mat.transparent = true;
    mat.opacity = p.kind === 'crab' ? 0.75 : 0.55;
    mat.depthWrite = false;
    const m = meshOf(p, mat);
    m.renderOrder = 5;
    ghost.add(m);
  }
  const outline = new LineSegments(outlineGeometry(e.def.dom()), new LineBasicMaterial({ color: accent }));
  outline.renderOrder = 6;
  ghost.add(outline);
  ghost.visible = false;
  return ghost;
}

/** Aim the camera at the cell from the front right, slightly above, far enough back to see all of it. */
export function frameCell(e: Entry, camera: PerspectiveCamera, target: Vector3): void {
  const c = v3(e.kit.centroid);
  let rad = 0;
  for (const p of e.def.dom().V) rad = Math.max(rad, v3(p).distanceTo(c));
  target.copy(c);
  const dist = ((rad + e.kit.r * 2) / Math.sin((camera.fov * Math.PI) / 360)) * 1.15;
  camera.position.copy(c).add(new Vector3(0.62, -0.74, 0.5).normalize().multiplyScalar(dist));
  camera.up.set(0, 0, 1);
  camera.lookAt(c);
}
