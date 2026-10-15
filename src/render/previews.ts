import { Group, Matrix4, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { PlatycosmDef } from '../data/platycosms';
import { addLights, cellMeshes, frameCell } from './cellGroup';
import { entryFor } from './entries';

/**
 * Small pictures of the cells for the home page. One renderer on an off-screen canvas draws each cell and copies the
 * result into the card's own 2D canvas, so ten previews cost one WebGL context. A card that is hovered spins.
 */
export class Previews {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.05, 100);
  private size = 0;
  private spinning: { def: PlatycosmDef; target: HTMLCanvasElement; last: number } | null = null;
  /** where each card's cell has turned to (it stays there when the pointer leaves, and carries on from there) */
  private angles = new WeakMap<HTMLCanvasElement, number>();

  constructor() {
    this.renderer = new WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    addLights(this.scene);
  }

  /** draw `def` into `target`, turned by `angle` (radians, about the vertical through the cell's centre) */
  draw(def: PlatycosmDef, target: HTMLCanvasElement, angle = this.angles.get(target) ?? 0): void {
    const w = target.clientWidth;
    if (!w) return;
    const px = Math.round(w * Math.min(window.devicePixelRatio || 1, 2));
    if (px !== this.size) { this.renderer.setSize(px, px, false); this.size = px; }
    if (target.width !== px) { target.width = px; target.height = px; }

    const e = entryFor(def);
    const { body, crab } = cellMeshes(e.kit);
    const cell = new Group();
    cell.add(body, crab);
    const c = e.kit.centroid;
    cell.matrixAutoUpdate = false;
    cell.matrix.makeTranslation(c[0], c[1], c[2]).multiply(new Matrix4().makeRotationZ(angle)).multiply(new Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
    this.scene.add(cell);
    const aim = new Vector3();
    frameCell(e, this.camera, aim);
    this.camera.position.lerp(aim, 0.12); // a little closer than the main view: the cards are small
    this.renderer.render(this.scene, this.camera);
    this.scene.remove(cell);

    const g = target.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, px, px);
    g.drawImage(this.renderer.domElement, 0, 0);
  }

  /** keep turning `def` in `target` until `stop` (one at a time) */
  spin(def: PlatycosmDef, target: HTMLCanvasElement): void {
    const fresh = !this.spinning;
    this.spinning = { def, target, last: performance.now() };
    if (fresh) requestAnimationFrame(() => this.tick());
  }

  stop(): void { this.spinning = null; }

  private tick(): void {
    const s = this.spinning;
    if (!s) return;
    const now = performance.now(), angle = (this.angles.get(s.target) ?? 0) + ((now - s.last) / 1000) * 0.9;
    this.angles.set(s.target, angle);
    s.last = now;
    this.draw(s.def, s.target, angle);
    requestAnimationFrame(() => this.tick());
  }

  dispose(): void {
    this.spinning = null;
    this.renderer.dispose();
  }
}
