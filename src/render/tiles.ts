import { InstancedMesh, Material, Matrix4, Object3D } from 'three';
import { Part, flipWinding } from './cellKit';

/** Crabs fade out between these distances from the camera (and are not drawn beyond `far`). */
export interface Fade { near: number; far: number }

/**
 * Many copies of the same cell. Each part is drawn with one InstancedMesh for copies that keep handedness and one
 * (with reversed triangle winding) for mirrored copies, so front-face culling and lighting stay right for both.
 */
export class TileField {
  readonly group = new Object3D();
  private meshes: { part: Part; plus: InstancedMesh; minus: InstancedMesh }[] = [];
  private own: Material[] = [];

  constructor(parts: Part[], private capacity: number, fade?: Fade) {
    for (const part of parts) {
      let material = part.material;
      if (fade && part.kind === 'crab') { material = fadingCopy(part.material, fade); this.own.push(material); }
      const plus = new InstancedMesh(part.geometry, material, capacity);
      const minus = new InstancedMesh(flipWinding(part.geometry), material, capacity);
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
    for (const m of this.own) m.dispose();
  }
}

/**
 * A copy of a material that dissolves with distance from the camera: a fragment is dropped when an ordered (Bayer)
 * dither threshold falls below the fade. Unlike real transparency this needs no sorting, so overlapping crabs stay right.
 */
function fadingCopy(src: Material, fade: Fade): Material {
  const m = src.clone();
  m.onBeforeCompile = (shader) => {
    shader.uniforms.fadeNear = { value: fade.near };
    shader.uniforms.fadeFar = { value: fade.far };
    shader.vertexShader = 'varying float vFadeDist;\n' + shader.vertexShader.replace(
      '#include <project_vertex>', '#include <project_vertex>\n\tvFadeDist = length( mvPosition.xyz );');
    shader.fragmentShader = 'uniform float fadeNear;\nuniform float fadeFar;\nvarying float vFadeDist;\n' + shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
	{
		const float bayer[16] = float[16]( 0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5. );
		ivec2 q = ivec2( mod( gl_FragCoord.xy, 4.0 ) );
		float threshold = ( bayer[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
		if ( smoothstep( fadeNear, fadeFar, vFadeDist ) > threshold ) discard;
	}`);
  };
  m.customProgramCacheKey = () => 'fade';
  return m;
}
