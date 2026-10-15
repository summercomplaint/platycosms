import { Material, Mesh, Object3D, Raycaster, Vector2 } from 'three';
import type { PartTag } from '../cellGroup';
import { edgeColor, vertColor } from '../palette';
import type { Overlay, ViewContext } from './overlay';

export interface ClassInfo { kind: 'edge' | 'vertex'; cls: number; color: string }

/**
 * Outside view: point at a tube, an arrow or a ball and everything else fades, leaving the pieces that are one edge
 * (or one point) of the space. With a mouse it follows the pointer; on a touch screen a tap picks and a tap on
 * nothing clears.
 */
export class ClassHover implements Overlay {
  /** told what is picked (null when nothing is), for a caption in the view */
  onChange: ((info: ClassInfo | null) => void) | null = null;
  private ray = new Raycaster();
  private ptr: Vector2 | null = null;
  private dirty = false;
  private picked: ClassInfo | null = null;
  private down: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return; // not while dragging the view round
      this.ptr = at(e);
      this.dirty = true;
    });
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { this.ptr = null; this.dirty = true; } });
    canvas.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' || !this.down) return;
      if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 8) { this.ptr = at(e); this.dirty = true; }
      this.down = null;
    });
  }

  build(): void {
    // a new view has fresh materials, nothing faded; pick again where the pointer is
    this.picked = null;
    this.dirty = true;
    this.onChange?.(null);
  }

  frame(ctx: ViewContext): void {
    if (!this.dirty || !ctx.body) return;
    this.dirty = false;
    let next: ClassInfo | null = null;
    if (this.ptr) {
      this.ray.setFromCamera(this.ptr, ctx.camera);
      const hit = this.ray.intersectObjects(ctx.body.children, false)[0];
      const tag = hit?.object.userData as PartTag | undefined;
      if (tag && tag.cls !== undefined) {
        const edge = tag.kind === 'tube' || tag.kind === 'arrow';
        next = { kind: edge ? 'edge' : 'vertex', cls: tag.cls, color: edge ? edgeColor(tag.cls) : vertColor(tag.cls) };
      }
    }
    if (next?.kind === this.picked?.kind && next?.cls === this.picked?.cls) return;
    this.picked = next;
    fade(ctx.body, ctx.crab, next);
    this.onChange?.(next);
  }
}

const isPicked = (tag: PartTag, p: ClassInfo) =>
  tag.cls === p.cls && (p.kind === 'edge' ? tag.kind === 'tube' || tag.kind === 'arrow' : tag.kind === 'ball');

function fade(body: Object3D, crab: Object3D | null, p: ClassInfo | null): void {
  const set = (o: Object3D, dim: boolean) => {
    const m = (o as Mesh).material as Material | undefined;
    if (!m) return;
    m.transparent = dim;
    m.opacity = dim ? 0.12 : 1;
    m.depthWrite = !dim;
  };
  for (const o of body.children) set(o, !!p && !isPicked(o.userData as PartTag, p));
  crab?.traverse((o) => set(o, !!p));
}
