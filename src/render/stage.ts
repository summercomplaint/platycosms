import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Fog, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh,
  MeshStandardMaterial, PerspectiveCamera, Points, PointsMaterial, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlatycosmDef, byId } from '../data/platycosms';
import { IDENTITY, Iso, apply, compose, inverse } from '../math/iso';
import { Vec3 } from '../math/vec';
import { I3, Mat3, inv3, mmul, mvec } from '../math/shape';
import { Animator } from './animation';
import { v3 } from './cellKit';
import { PartTag, addLights, cellMeshes, frameCell, ghostGroup } from './cellGroup';
import { Entry, ball0Color, entryFor, lowKit, onEntriesChanged, setEntriesTheme } from './entries';
import { FirstPerson } from './firstPerson';
import { isoPath, toMatrix4 } from './iso3d';
import { ClassHover } from './overlays/classHover';
import { FaceHighlight } from './overlays/faceHighlight';
import type { Mode, Overlay, ViewContext } from './overlays/overlay';
import { TileField } from './tiles';

export type { Mode } from './overlays/overlay';
export interface Options { crab: boolean }

const SPACE = new Color('#000000'), PAPER = new Color('#ffffff');
const ACCENT_DARK = new Color('#3dff7a'), ACCENT_LIGHT = new Color('#00953a');

/**
 * Owns the renderer, the scene and both views (outside the cell, and inside among its copies). Anything extra drawn
 * on top (highlighted faces, a picked edge class, ...) is an Overlay (src/render/overlays). The canvas can be moved
 * between pages; nothing is drawn while it is not in the document.
 */
export class Stage {
  readonly anim = new Animator();
  readonly faces = new FaceHighlight();
  readonly classes: ClassHover;
  readonly canvas: HTMLCanvasElement;
  options: Options = { crab: true };
  mode: Mode = 'outside';
  onFrame: (() => void) | null = null;
  /** the platycosm on show (so the UI can show its facts) */
  entry: Entry | null = null;

  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.05, 100);
  private orbit: OrbitControls;
  private fp: FirstPerson;
  private overlays: Overlay[];
  private stars = makeStars();
  private light = false;
  private bg = SPACE;
  private accent = ACCENT_DARK;

  // outside view
  private outside: { root: Group; body: Group; crab: Group; ghost: Group } | null = null;
  // inside view
  private tiles: TileField | null = null;
  private lastTilePos = new Vector3(Infinity, 0, 0);
  private tilesDirty = true;
  private animRun = -1;
  private walk: { from: Vector3; to: Vector3; done: number } | null = null;

  private last = performance.now();
  /** ?stopAfter=N stops the render loop after N frames once the crab has loaded (for headless screenshots) */
  private stopAfter = Number(new URLSearchParams(location.search).get('stopAfter') ?? 0);
  private frames = 0;
  private crabReady = false;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', '3D diagram of the selected platycosm');
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.up.set(0, 0, 1);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.fp = new FirstPerson(this.camera, canvas);
    this.classes = new ClassHover(canvas);
    this.overlays = [this.faces, this.classes];
    addLights(this.scene);
    this.scene.background = this.bg;
    new ResizeObserver(() => this.resize()).observe(canvas);
    requestAnimationFrame(() => this.frame());
    onEntriesChanged(() => { this.crabReady = true; if (this.entry) this.show(byId(this.entry.def.id)!, this.entry.M); });
  }

  /* ---------- public ---------- */
  /** Show a platycosm, in the shape M (see src/math/shape.ts). The same platycosm again keeps the camera. */
  show(def: PlatycosmDef, M: Mat3 | null = null): Entry {
    const prev = this.entry, keep = !!prev && prev.def.id === def.id;
    const e = entryFor(def, M);
    if (e === prev) return e;
    this.entry = e;
    if (!keep) { this.anim.stop(); this.faces.set(null); }
    this.rebuild(keep ? prev : null);
    return e;
  }

  setMode(m: Mode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.anim.stop(); // a ghost outside is not a walk inside, and the other way round
    this.faces.set(null);
    this.rebuild();
  }

  applyOptions(): void {
    if (this.outside) this.outside.crab.visible = this.options.crab;
    this.tilesDirty = true;
  }

  /** highlight some face polygons (hovering a gluing in the list); null clears it */
  highlight(polys: { poly: Vec3[] }[] | null): void {
    this.faces.set(polys);
  }

  /** light (white page, no stars) or dark (space) */
  setTheme(light: boolean): void {
    this.light = light;
    this.bg = light ? PAPER : SPACE;
    this.accent = light ? ACCENT_LIGHT : ACCENT_DARK;
    this.scene.background = this.bg;
    this.stars.visible = !light;
    setEntriesTheme(light);
    // recolour in place (a rebuild would reset the camera)
    if (this.scene.fog) (this.scene.fog as Fog).color.copy(this.bg);
    this.outside?.root.traverse((o) => {
      if (o instanceof LineSegments) (o.material as LineBasicMaterial).color.copy(this.accent);
      if ((o.userData as PartTag).ball0) ((o as Mesh).material as MeshStandardMaterial).color.set(ball0Color());
    });
    const ctx = this.context();
    if (ctx) for (const o of this.overlays) o.theme?.(ctx);
  }

  /** a PNG of the current view at high resolution */
  snapshot(transparent: boolean): Promise<Blob | null> {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, pr = this.renderer.getPixelRatio();
    const starsShown = this.stars.visible;
    if (transparent) { this.scene.background = null; this.stars.visible = false; }
    this.renderer.setPixelRatio(3);
    this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => {
      this.canvas.toBlob((b) => {
        this.scene.background = this.bg;
        this.stars.visible = starsShown;
        this.renderer.setPixelRatio(pr);
        this.renderer.setSize(w, h, false);
        resolve(b);
      }, 'image/png');
    });
  }

  /** Inside view: go back to where the last walk started, and end it. */
  walkBack(): void {
    if (this.walk) this.fp.pos.copy(this.walk.from);
    this.walk = null;
    this.anim.stop();
    this.fp.apply();
    this.tilesDirty = true;
  }

  /* ---------- building ---------- */
  private context(): ViewContext | null {
    if (!this.entry) return null;
    const o = this.outside;
    return {
      mode: this.mode, entry: this.entry, root: o?.root ?? null, body: o?.body ?? null, crab: o?.crab ?? null,
      camera: this.camera, canvas: this.canvas, anim: this.anim, accent: this.accent, light: this.light,
    };
  }

  private clearViews(): void {
    if (this.outside) this.scene.remove(this.outside.root);
    this.outside = null;
    this.scene.remove(this.stars);
    if (this.tiles) {
      this.scene.remove(this.tiles.group);
      this.tiles.dispose();
      this.tiles = null;
    }
    this.scene.fog = null;
  }

  /** build the view; with `prev` (the same platycosm in another shape) the camera stays where it was */
  private rebuild(prev: Entry | null = null): void {
    this.clearViews();
    if (!this.entry) return;
    if (this.mode === 'outside') this.buildOutside(this.entry, !!prev);
    else this.buildInside(this.entry, prev);
    this.applyOptions();
    const ctx = this.context()!;
    for (const o of this.overlays) o.build?.(ctx);
  }

  private buildOutside(e: Entry, keepCamera = false): void {
    this.orbit.enabled = true;
    this.fp.enabled = false;
    this.camera.fov = 30;
    this.camera.near = 0.05;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    const root = new Group();
    const { body, crab } = cellMeshes(e.kit, true);
    const ghost = ghostGroup(e, this.accent);
    root.add(body, crab, ghost);
    this.scene.add(root, this.stars);
    this.outside = { root, body, crab, ghost };
    if (!keepCamera) frameCell(e, this.camera, this.orbit.target);
    this.orbit.update();
  }

  private buildInside(e: Entry, prev: Entry | null = null): void {
    this.orbit.enabled = false;
    this.fp.enabled = true;
    this.camera.fov = 80;
    this.camera.near = 0.02 * e.L;
    this.camera.far = 40 * e.L;
    this.camera.updateProjectionMatrix();
    this.tiles = new TileField(lowKit(e).parts, 500, { near: CRAB_FADE[0] * e.L, far: CRAB_FADE[1] * e.L });
    this.scene.add(this.tiles.group);
    const R = this.tileRadius(e);
    this.scene.fog = new Fog(this.bg, R * 0.45, R * 1.0);
    this.fp.speed = 0.6 * e.L;
    if (prev) {
      // the same point of the space in the new shape: map the position by M_new M_old⁻¹, keep the direction of view
      const T = mmul(e.M ?? I3, inv3(prev.M ?? I3)), p = mvec(T, [this.fp.pos.x, this.fp.pos.y, this.fp.pos.z]);
      this.fp.pos.set(p[0], p[1], p[2]);
    } else {
      // start halfway between the centre (where the crab is) and a corner, looking at the crab
      const D = e.def.dom(), c = v3(e.kit.centroid);
      this.fp.pos.copy(c).addScaledVector(v3(D.V[0]).sub(c), 0.55);
      this.fp.lookAt(c);
    }
    this.fp.apply();
    this.lastTilePos.set(Infinity, 0, 0);
    this.tilesDirty = true;
    // the view is rebuilt when the crab arrives: a gluing in progress is walked again from the start
    this.animRun = -1;
    this.walk = null;
  }

  private tileRadius(e: Entry): number { return 3.3 * e.L; }

  /** the path of the gluing map being animated, if any (outside view: the cell itself) */
  private animMatrix(e: Entry): Matrix4 | null {
    const a = this.anim;
    if (a.gen === null || a.tau <= 0) return null;
    const p = e.pairs[a.gen];
    return p ? isoPath(p.gamma)(a.eased) : null;
  }

  /**
   * Inside view: a gluing is a way of moving, so the tiling stays put and you walk. For the cell you are in, h(D),
   * the gluing is h γ h⁻¹; you go in a straight line, without turning, from p to h γ h⁻¹(p), through the shared face
   * into the neighbouring copy. Arriving there you see the world turned (a screw) or mirrored (a glide): the holonomy.
   * The walk adds its step to the camera each frame, so you can still fly about while it runs.
   */
  private stepWalk(e: Entry): void {
    const a = this.anim, p = a.gen === null ? undefined : e.pairs[a.gen];
    if (!p) return;
    if (a.runs !== this.animRun) {
      this.animRun = a.runs;
      const h = this.cellAt(e), from = this.fp.pos.clone();
      this.walk = { from, to: v3(apply(compose(h, compose(p.gamma, inverse(h))), [from.x, from.y, from.z])), done: 0 };
    }
    const w = this.walk;
    if (!w || a.eased === w.done) return;
    this.fp.pos.addScaledVector(w.to.clone().sub(w.from), a.eased - w.done);
    w.done = a.eased;
  }

  /** the copy of the cell whose centre is nearest the camera */
  private cellAt(e: Entry): Iso {
    const p: Vec3 = [this.fp.pos.x, this.fp.pos.y, this.fp.pos.z], c = e.kit.centroid;
    let best = IDENTITY, d = Infinity;
    for (const g of e.gamma.near(c, p, 2 * e.L)) {
      const q = apply(g, c), dd = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (dd < d) { d = dd; best = g; }
    }
    return best;
  }

  /** recompute which copies are drawn and where (the camera moved, or the animation is running) */
  private refreshTiles(): void {
    const e = this.entry;
    if (!e || !this.tiles) return;
    const c = e.kit.centroid;
    const els = e.gamma.near(c, [this.fp.pos.x, this.fp.pos.y, this.fp.pos.z], this.tileRadius(e));
    const mats = els.map(toMatrix4);
    // a crab is drawn while any of it can be closer than the end of its fade
    const crabR = CRAB_FADE[1] * e.L + e.kit.inradius * 0.5, cv = new Vector3(c[0], c[1], c[2]);
    const centers = mats.map((m) => cv.clone().applyMatrix4(m));
    const { crab } = this.options;
    this.tiles.update(mats, (kind, i) => (kind === 'crab' ? crab && centers[i].distanceTo(this.fp.pos) < crabR : true));
    this.lastTilePos.copy(this.fp.pos);
    this.tilesDirty = false;
  }

  /* ---------- frame loop ---------- */
  private resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera); // setSize clears the canvas; redraw so it never flashes blank
  }

  private frame(): void {
    requestAnimationFrame(() => this.frame());
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.canvas.isConnected || (this.stopAfter && this.frames >= this.stopAfter)) return;
    this.anim.tick(dt);
    const ctx = this.context();
    if (this.mode === 'outside') {
      this.orbit.update();
      this.stars.position.copy(this.camera.position);
      this.updateGhost();
    } else if (this.entry) {
      this.stepWalk(this.entry);
      const moved = this.fp.update(dt);
      const far = this.fp.pos.distanceTo(this.lastTilePos) > 0.12 * this.entry.L;
      if (moved || far || this.tilesDirty || this.anim.playing) this.refreshTiles();
    }
    if (ctx) for (const o of this.overlays) o.frame?.(ctx, dt);
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    if (this.crabReady) this.frames++;
  }

  private updateGhost(): void {
    const o = this.outside, e = this.entry;
    if (!o || !e) return;
    const M = this.anim.tau < 0.004 ? null : this.animMatrix(e);
    o.ghost.visible = !!M;
    if (!M) return;
    o.ghost.matrix.copy(M);
    o.ghost.matrixWorldNeedsUpdate = true;
  }
}

/** inside view: crabs are solid up to the first distance and gone by the second (in units of L, the cell's size) */
const CRAB_FADE = [1.4, 2.2];

/** a sphere of faint stars that follows the camera (so it only turns, never comes closer) */
function makeStars(): Points {
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pos: number[] = [], col: number[] = [];
  for (let i = 0; i < 1800; i++) {
    const z = 2 * rnd() - 1, t = 2 * Math.PI * rnd(), r = Math.sqrt(1 - z * z);
    pos.push(60 * r * Math.cos(t), 60 * r * Math.sin(t), 60 * z);
    const b = 0.35 + 0.65 * rnd() ** 3;
    const green = rnd() < 0.12;
    col.push(green ? 0.25 * b : b, b, green ? 0.5 * b : b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  const p = new Points(g, new PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }));
  p.renderOrder = -1;
  p.frustumCulled = false;
  return p;
}
