import {
  AdditiveBlending, AmbientLight, BufferGeometry, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Fog, Group, HemisphereLight,
  LineBasicMaterial, LineSegments, Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Points,
  PointsMaterial, Scene, Vector3, WebGLRenderer,
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
export interface Options { crab: boolean }

interface Entry {
  def: PlatycosmDef;
  R: Analysis;
  pairs: Pairing[];
  gamma: Gamma;
  L: number;
  kit: CellKit;
  kitLow?: CellKit;
}

const SPACE = new Color('#000000');
const ACCENT = new Color('#3dff7a');

/** Owns the renderer, the scene and both views (outside the cell, and inside among its copies). */
export class Stage {
  readonly anim = new Animator();
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
  private cache = new Map<string, Entry>();
  private crab: CrabModel | null = null;
  private stars = makeStars();

  // outside view
  private outside: Group | null = null;
  private crabGroup = new Group();
  private highlightGroup = new Group();
  private hoverPolys: { poly: Vec3[] }[] | null = null;
  private shownHighlight: unknown = undefined;
  private ghost: Group | null = null;
  // inside view
  private tiles: TileField | null = null;
  private lastTilePos = new Vector3(Infinity, 0, 0);
  private tilesDirty = true;

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
    this.fp = new FirstPerson(this.camera, canvas);
    // bright, even light so the colours stay saturated against the black
    this.scene.add(new HemisphereLight(0xffffff, 0x5a6478, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.5);
    sun.position.set(3, -4, 5);
    this.scene.add(sun);
    const fill = new DirectionalLight(0xffffff, 0.7);
    fill.position.set(-4, 2, -2);
    this.scene.add(fill);
    this.scene.add(new AmbientLight(0xffffff, 0.35));
    this.scene.background = SPACE;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement ?? canvas);
    this.resize();
    requestAnimationFrame(() => this.frame());
    loadCrab().then((c) => { this.crab = c; this.cache.clear(); if (this.entry) this.show(this.entry.def); }, (e) => console.warn('crab failed to load', e));
  }

  /* ---------- public ---------- */
  show(def: PlatycosmDef): Entry {
    const keep = this.entry && this.entry.def.id === def.id;
    const e = this.entryFor(def);
    this.entry = e;
    if (!keep) { this.anim.stop(); this.hoverPolys = null; }
    this.rebuild();
    return e;
  }

  setMode(m: Mode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.rebuild();
  }

  applyOptions(): void {
    if (this.outside) this.crabGroup.visible = this.options.crab;
    this.tilesDirty = true;
  }

  /** highlight some face polygons (hovering a gluing in the list); null clears it */
  highlight(polys: { poly: Vec3[] }[] | null): void {
    this.hoverPolys = polys;
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
        this.scene.background = SPACE;
        this.stars.visible = starsShown;
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
    this.scene.remove(this.stars);
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
    return m;
  }

  private buildOutside(e: Entry): void {
    this.orbit.enabled = true;
    this.fp.enabled = false;
    this.camera.fov = 30;
    this.camera.near = 0.05;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    const root = new Group();
    this.crabGroup = new Group();
    this.highlightGroup = new Group();
    this.shownHighlight = undefined;
    for (const p of e.kit.parts) {
      const m = this.meshOf(p);
      if (p.kind === 'crab') this.crabGroup.add(m);
      else root.add(m);
    }
    root.add(this.crabGroup, this.highlightGroup);

    // the ghost copy used by the gluing animation: see-through, with a green outline of the cell
    const D = e.def.dom();
    const lines: number[] = [];
    for (const f of D.F) f.poly.forEach((v, i) => lines.push(...D.V[v], ...D.V[f.poly[(i + 1) % f.poly.length]]));
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(lines, 3));
    const ghost = new Group();
    ghost.matrixAutoUpdate = false;
    for (const p of e.kit.parts) {
      const mat = p.material.clone() as MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = p.kind === 'crab' ? 0.75 : 0.55;
      mat.depthWrite = false;
      const m = this.meshOf(p, mat);
      m.renderOrder = 5;
      ghost.add(m);
    }
    const outline = new LineSegments(lg, new LineBasicMaterial({ color: ACCENT }));
    outline.renderOrder = 6;
    ghost.add(outline);
    ghost.visible = false;
    root.add(ghost);
    this.ghost = ghost;

    this.scene.add(root, this.stars);
    this.outside = root;
    // camera: look at the cell from the front-right, slightly above
    const c = v3(e.kit.centroid);
    let rad = 0;
    for (const p of D.V) rad = Math.max(rad, v3(p).distanceTo(c));
    this.orbit.target.copy(c);
    const dist = ((rad + e.kit.r * 2) / Math.sin((this.camera.fov * Math.PI) / 360)) * 1.15;
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
    this.scene.fog = new Fog(SPACE, R * 0.45, R * 1.0);
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

  /** the path of the gluing map being animated, if any */
  private animMatrix(e: Entry): Matrix4 | null {
    const a = this.anim;
    if (a.gen === null || a.tau <= 0) return null;
    const p = e.pairs[a.gen];
    return p ? isoPath(p.gamma)(a.eased) : null;
  }

  /** recompute which copies are drawn and where (the camera moved, or the animation is running) */
  private refreshTiles(): void {
    const e = this.entry;
    if (!e || !this.tiles) return;
    const M = this.animMatrix(e);
    const R = this.tileRadius(e) + (M ? 1.3 * e.L : 0);
    const c = e.kit.centroid;
    const els = e.gamma.near(c, [this.fp.pos.x, this.fp.pos.y, this.fp.pos.z], R);
    const mats = els.map((g) => (M ? M.clone() : new Matrix4()).multiply(toMatrix4(g)));
    const crabR = 1.8 * e.L, cv = new Vector3(c[0], c[1], c[2]);
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
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.anim.tick(dt);
    if (this.mode === 'outside') {
      this.orbit.update();
      this.stars.position.copy(this.camera.position);
      this.updateGhost();
      this.updateHighlight();
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
    const M = this.anim.tau < 0.004 ? null : this.animMatrix(e);
    g.visible = !!M;
    if (!M) return;
    g.matrix.copy(M);
    g.matrixWorldNeedsUpdate = true;
  }

  /** the faces of the hovered gluing, or else of the one being animated */
  private updateHighlight(): void {
    const e = this.entry;
    if (!e) return;
    const playing = this.anim.gen !== null ? e.pairs[this.anim.gen]?.polys ?? null : null;
    const want = this.hoverPolys ?? playing;
    if (want === this.shownHighlight) return;
    this.shownHighlight = want;
    this.highlightGroup.clear();
    if (!want) return;
    const mat = new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.24, side: DoubleSide, depthWrite: false });
    for (const { poly } of want) {
      const pos: number[] = [];
      for (let i = 1; i < poly.length - 1; i++) for (const k of [0, i, i + 1]) pos.push(...poly[k]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      const m = new Mesh(g, mat);
      m.renderOrder = 4;
      this.highlightGroup.add(m);
    }
  }
}

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
