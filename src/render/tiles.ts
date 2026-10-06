import { InstancedMesh, Matrix4, Object3D } from 'three';
import { Part, flipWinding } from './cellKit';

/**
 * Many copies of the same cell. Each part is drawn with one InstancedMesh for copies that keep handedness and one
 * (with reversed triangle winding) for mirrored copies, so front-face culling and lighting stay right for both.
 */
export class TileField {
  readonly group = new Object3D();
  private meshes: { part: Part; plus: InstancedMesh; minus: InstancedMesh }[] = [];

  constructor(parts: Part[], private capacity: number) {
    for (const part of parts) {
      const plus = new InstancedMesh(part.geometry, part.material, capacity);
      const minus = new InstancedMesh(flipWinding(part.geometry), part.material, capacity);
      for (const m of [plus, minus]) {
        m.frustumCulled = false;
        m.count = 0;
        m.renderOrder = part.kind === 'tube' ? 2 : 1;
        this.group.add(m);
      }
      this.meshes.push({ part, plus, minus });
    }
  }

  /**
   * Place copies. `tiles` are the full placement matrices (cell coordinates -> world); `use(partKind, i)` can skip
   * some copies for some parts (the crab is drawn only for nearby copies).
   */
  update(tiles: Matrix4[], use: (kind: Part['kind'], i: number) => boolean = () => true): void {
    const tmp = new Matrix4();
    const signs = tiles.map((m) => (m.determinant() >= 0 ? 1 : -1));
    for (const { part, plus, minus } of this.meshes) {
      let np = 0, nm = 0;
      tiles.forEach((T, i) => {
        if (!use(part.kind, i)) return;
        tmp.multiplyMatrices(T, part.local);
        if (signs[i] > 0) { if (np < this.capacity) plus.setMatrixAt(np++, tmp); } else if (nm < this.capacity) minus.setMatrixAt(nm++, tmp);
      });
      plus.count = np;
      minus.count = nm;
      plus.instanceMatrix.needsUpdate = true;
      minus.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const { minus } of this.meshes) minus.geometry.dispose();
  }
}
