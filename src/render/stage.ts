import {
  AmbientLight, BufferGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Fog, Group, HemisphereLight, LineBasicMaterial,
  LineSegments, Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { analyze, Analysis } from '../math/analyze';
import { Gamma } from '../math/group';
import { pairings, Pairing } from '../math/gluing';
import { PlatycosmDef } from '../data/platycosms';
import { Vec3 } from '../math/vec';
import { Animator } from './animation';
import { CellKit, Part, buildKit, v3 } from './cellKit';
import { CrabModel, loadCrab } from './crab';
import { FirstPerson } from './firstPerson';
import { isoPath, toMatrix4 } from './iso3d';
import { TileField } from './tiles';

export type Mode = 'outside' | 'inside';
export interface Options { arrows: boolean; faces: boolean; crab: boolean; edges: boolean; spin: boolean }

interface Entry {
  def: PlatycosmDef;
  R: Analysis;
  pairs: Pairing[];
  gamma: Gamma;
  L: number;
  kit: CellKit;
  kitLow?: CellKit;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Owns the renderer, the scene and both views (outside the cell, and inside among its copies). */
export class Stage {
  readonly anim = new Animator();
  options: Options = { arrows: true, faces: true, crab: true, edges: true, spin: false };
  mode: Mode = 'outside';
  onFrame: (() => void) | null = null;
  /** called when the cache has analysed a platycosm (so the UI can show its facts) */
  entry: Entry | null = null;

  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.05, 100);
  private orbit: OrbitControls;
  private fp: FirstPerson;
  private cache = new Map<string, Entry>();
  private crab: CrabModel | null = null;

  // outside view
  private outside: Group | null = null;
  private arrowGroup = new Group();
  private crabGroup = new Group();
  private faceGroup = new Group();
  private faceMats: MeshBasicMaterial[] = [];
  private highlightGroup = new Group();
  private ghost: Group | null = null;
  // inside view
  private tiles: TileField | null = null;
  private lastTilePos = new Vector3(Infinity, 0, 0);
  private tilesDirty = true;

  private stageColor = new Color('#e9edf3');
  private faceColor = new Color('#6c7a93');
  private hlColor = new Color('#2a55d6');
  private last = performance.now();
  /** ?stopAfter=N stops the render loop after N frames once the crab has loaded (for headless screenshots) */
  private stopAfter = Number(new URLSearchParams(location.search).get('stopAfter') ?? 0);
  private frames = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.up.set(0, 0, 1);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.orbit.autoRotateSpeed = 1.6;
    this.fp = new FirstPerson(this.camera, canvas);
    this.scene.add(new HemisphereLight(0xffffff, 0x8a93a6, 0.95));
    const sun = new DirectionalLight(0xffffff, 0.9);
    sun.position.set(3, -4, 5);
    this.scene.add(sun);
    const fill = new DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, 2, -2);
    this.scene.add(fill);
    this.scene.add(new AmbientLight(0xffffff, 0.15));
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement ?? canvas);
    this.resize();
    this.refreshTheme();
    requestAnimationFrame(() => this.frame());
    loadCrab().then((c) => { this.crab = c; this.cache.clear(); if (this.entry) this.show(this.entry.def); }, (e) => console.warn('crab failed to load', e));
  }

  /* ---------- public ---------- */
  show(def: PlatycosmDef): Entry {
    const keep = this.entry && this.entry.def.id === def.id;
    const e = this.entryFor(def);
    this.entry = e;
    if (!keep) this.anim.stop();
    this.rebuild();
    return e;
  }

  setMode(m: Mode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.rebuild();
  }

  applyOptions(): void {
    this.orbit.autoRotate = this.options.spin && this.mode === 'outside';
    if (this.outside) {
      this.arrowGroup.visible = this.options.arrows;
      this.crabGroup.visible = this.options.crab;
      this.faceGroup.visible = this.options.faces;
    }
    this.tilesDirty = true;
  }

  highlight(polys: { poly: Vec3[] }[] | null): void {
    this.highlightGroup.clear();
    if (!polys || this.mode !== 'outside') return;
    const mat = new MeshBasicMaterial({ color: this.hlColor, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false });
    for (const { poly } of polys) {
      const pos: number[] = [];
      for (let i = 1; i < poly.length - 1; i++) for (const k of [0, i, i + 1]) pos.push(...poly[k]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      const m = new Mesh(g, mat);
      m.renderOrder = 4;
      this.highlightGroup.add(m);
    }
  }

  refreshTheme(): void {
    this.stageColor = new Color(css('--stage') || '#e9edf3');
    this.faceColor = new Color(css('--face') || '#6c7a93');
    this.hlColor = new Color(css('--hl') || '#2a55d6');
    for (const m of this.faceMats) m.color.copy(this.faceColor);
    this.scene.background = this.stageColor;
    if (this.scene.fog) (this.scene.fog as Fog).color.copy(this.stageColor);
  }

  /** a PNG of the current view at high resolution */
  snapshot(transparent: boolean): Promise<Blob | null> {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, pr = this.renderer.getPixelRatio();
    const bg = this.scene.background, fog = this.scene.fog;
    this.scene.background = transparent ? null : new Color('#ffffff');
    if (fog) (fog as Fog).color.set('#ffffff');
    this.renderer.setPixelRatio(3);
    this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => {
      this.canvas.toBlob((b) => {
        this.scene.background = bg;
        if (fog) (fog as Fog).color.copy(this.stageColor);
        this.renderer.setPixelRatio(pr);
        this.renderer.setSize(w, h, false);
        resolve(b);
      }, 'image/png');
    });
  }

  /* ---------- building ---------- */
  private entryFor(def: PlatycosmDef): Entry {
    let e = this.cache.get(def.id);
    if (e) return e;
    const R = analyze(def, { samples: 0 });
    if (!R.ok) console.warn('analysis problems for', def.id, R.errors);
    const gamma = new Gamma(def.gens, def.lattice);
    const kit = buildKit(R, { quality: 'high', crab: this.crab });
    e = { def, R, pairs: pairings(R), gamma, L: Math.cbrt(R.volume), kit };
    this.cache.set(def.id, e);
    return e;
  }

  private clearViews(): void {
    if (this.outside) {
      this.scene.remove(this.outside);
      this.outside = null;
    }
    this.ghost = null;
    if (this.tiles) {
      this.scene.remove(this.tiles.group);
      this.tiles.dispose();
      this.tiles = null;
    }
    this.scene.fog = null;
  }

  private rebuild(): void {
    this.clearViews();
    if (!this.entry) return;
    if (this.mode === 'outside') this.buildOutside(this.entry);
    else this.buildInside(this.entry);
    this.applyOptions();
  }

  private meshOf(p: Part, material: Material = p.material): Mesh {
    const m = new Mesh(p.geometry, material);
    m.matrixAutoUpdate = false;
    m.matrix.copy(p.local);
    m.renderOrder = p.kind === 'tube' ? 2 : 1;
    return m;
  }

  private buildOutside(e: Entry): void {
    this.orbit.enabled = true;
    this.fp.enabled = false;
    this.camera.fov = 30;
    this.camera.near = 0.05;
    this.camera.updateProjectionMatrix();
    const root = new Group();
    this.arrowGroup = new Group();
    this.crabGroup = new Group();
    this.faceGroup = new Group();
    this.highlightGroup = new Group();
    this.faceMats = [];
    for (const p of e.kit.parts) {
      const m = this.meshOf(p);
      if (p.kind === 'arrow') this.arrowGroup.add(m);
      else if (p.kind === 'crab') this.crabGroup.add(m);
      else root.add(m);
    }
    // the cell's faces (translucent, pushed back so flush caps always win) and outline
    const D = e.def.dom();
    const lines: number[] = [];
    for (const f of D.F) {
      const pos: number[] = [];
      for (let i = 1; i < f.poly.length - 1; i++) for (const k of [0, i, i + 1]) pos.push(...D.V[f.poly[k]]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      const mat = new MeshBasicMaterial({ color: this.faceColor.clone(), transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
      this.faceMats.push(mat);
      const m = new Mesh(g, mat);
      m.renderOrder = 3;
      this.faceGroup.add(m);
      f.poly.forEach((v, i) => lines.push(...D.V[v], ...D.V[f.poly[(i + 1) % f.poly.length]]));
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(lines, 3));
    const outline = new LineSegments(lg, new LineBasicMaterial({ color: this.faceColor.clone(), transparent: true, opacity: 0.5 }));
    outline.renderOrder = 3;
    this.faceGroup.add(outline);
    root.add(this.arrowGroup, this.crabGroup, this.faceGroup, this.highlightGroup);

    // the ghost copy used by the symmetry animation
    const ghost = new Group();
    ghost.matrixAutoUpdate = false;
    for (const p of e.kit.parts) {
      const mat = p.material.clone() as MeshStandardMaterial;
      if (p.kind !== 'tube') { mat.transparent = true; mat.opacity = 0.78; }
      ghost.add(this.meshOf(p, mat));
    }
    const gl = new LineSegments(lg, new LineBasicMaterial({ color: this.hlColor.clone() }));
    ghost.add(gl);
    ghost.visible = false;
    root.add(ghost);
    this.ghost = ghost;

    this.scene.add(root);
    this.outside = root;
    // camera: look at the cell from the front-right, slightly above
    const c = v3(e.kit.centroid);
    let rad = 0;
    for (const p of D.V) rad = Math.max(rad, v3(p).distanceTo(c));
    this.orbit.target.copy(c);
    const dist = ((rad + e.kit.r * 2) / Math.sin((this.camera.fov * Math.PI) / 360)) * 1.35;
    this.camera.position.copy(c).add(new Vector3(0.62, -0.74, 0.5).normalize().multiplyScalar(dist));
    this.orbit.update();
  }

  private buildInside(e: Entry): void {
    this.orbit.enabled = false;
    this.fp.enabled = true;
    this.camera.fov = 80;
    this.camera.near = 0.02 * e.L;
    this.camera.far = 40 * e.L;
    this.camera.updateProjectionMatrix();
    e.kitLow ??= buildKit(e.R, { quality: 'low', crab: this.crab });
    this.tiles = new TileField(e.kitLow.parts, 500);
    this.scene.add(this.tiles.group);
    const R = this.tileRadius(e);
    this.scene.fog = new Fog(this.stageColor, R * 0.45, R * 1.0);
    // start halfway between the centre (where the crab is) and a corner, looking at the crab
    const D = e.def.dom(), c = v3(e.kit.centroid);
    this.fp.pos.copy(c).addScaledVector(v3(D.V[0]).sub(c), 0.55);
    this.fp.speed = 0.6 * e.L;
    this.fp.lookAt(c);
    this.fp.apply();
    this.lastTilePos.set(Infinity, 0, 0);
    this.tilesDirty = true;
  }

  private tileRadius(e: Entry): number { return 3.3 * e.L; }

  /** recompute which copies are drawn and where (the camera moved, or the animation is running) */
  private refreshTiles(): void {
    const e = this.entry;
    if (!e || !this.tiles) return;
    const animating = this.anim.gen !== null;
    const R = this.tileRadius(e) + (animating ? 1.3 * e.L : 0);
    const c = e.kit.centroid;
    const els = e.gamma.near(c, [this.fp.pos.x, this.fp.pos.y, this.fp.pos.z], R);
    const M = animating && this.anim.tau > 0 ? isoPath(e.def.animGens[this.anim.gen!])(this.anim.eased) : new Matrix4();
    const mats = els.map((g) => M.clone().multiply(toMatrix4(g)));
    const crabR = 1.8 * e.L, cv = new Vector3(c[0], c[1], c[2]);
    const centers = mats.map((m) => cv.clone().applyMatrix4(m));
    const { edges, crab } = this.options;
    const { arrows } = this.options;
    this.tiles.update(mats, (kind, i) => {
      if (kind === 'crab') return crab && centers[i].distanceTo(this.fp.pos) < crabR;
      return kind === 'arrow' ? edges && arrows : edges;
    });
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
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.anim.tick(dt);
    if (this.mode === 'outside') {
      this.orbit.update();
      this.updateGhost();
    } else if (this.entry) {
      const moved = this.fp.update(dt);
      const far = this.fp.pos.distanceTo(this.lastTilePos) > 0.12 * this.entry.L;
      if (moved || far || this.tilesDirty || this.anim.gen !== null) this.refreshTiles();
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
    if (this.crab) this.frames++;
    if (this.stopAfter && this.frames >= this.stopAfter) return;
    requestAnimationFrame(() => this.frame());
  }

  private updateGhost(): void {
    const g = this.ghost, e = this.entry;
    if (!g || !e) return;
    const a = this.anim;
    if (a.gen === null || a.tau < 0.004) { g.visible = false; return; }
    g.visible = true;
    g.matrix.copy(isoPath(e.def.animGens[a.gen])(a.eased));
    g.matrixWorldNeedsUpdate = true;
  }
}
