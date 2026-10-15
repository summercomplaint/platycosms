import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three';
import type { Vec3 } from '../../math/vec';
import type { Overlay, ViewContext } from './overlay';

type Polys = { poly: Vec3[] }[];

/** Outside view: tints the faces of the hovered gluing, or else of the one being animated. */
export class FaceHighlight implements Overlay {
  private hover: Polys | null = null;
  private shown: unknown = undefined;
  private group = new Group();

  set(polys: Polys | null): void { this.hover = polys; }

  build(ctx: ViewContext): void {
    this.group = new Group();
    this.shown = undefined;
    ctx.root?.add(this.group);
  }

  theme(): void { this.shown = undefined; }

  frame(ctx: ViewContext): void {
    if (!ctx.root) return;
    const a = ctx.anim, playing = a.gen !== null ? ctx.entry.pairs[a.gen]?.polys ?? null : null;
    const want = this.hover ?? playing;
    if (want === this.shown) return;
    this.shown = want;
    this.group.clear();
    if (!want) return;
    const mat = new MeshBasicMaterial({ color: ctx.accent, transparent: true, opacity: ctx.light ? 0.3 : 0.24, side: DoubleSide, depthWrite: false });
    for (const { poly } of want) {
      const pos: number[] = [];
      for (let i = 1; i < poly.length - 1; i++) for (const k of [0, i, i + 1]) pos.push(...poly[k]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      const m = new Mesh(g, mat);
      m.renderOrder = 4;
      this.group.add(m);
    }
  }
}
