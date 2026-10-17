import { MeshStandardMaterial } from 'three';
import { analyze, Analysis } from '../math/analyze';
import { Gamma } from '../math/group';
import { pairings, Pairing } from '../math/gluing';
import { Mat3, deformAnalysis, deformPairings, deformSpec } from '../math/shape';
import type { PlatycosmDef } from '../data/platycosms';
import { CellKit, buildKit } from './cellKit';
import { CrabModel, loadCrab } from './crab';
import { VERT0_LIGHT, vertColor } from './palette';

/**
 * Everything drawn for one platycosm, computed once and shared by every view (the main viewer and the previews on
 * the home page). Three.js lets two renderers draw the same geometry and materials.
 */
export interface Entry {
  def: PlatycosmDef;
  R: Analysis;
  pairs: Pairing[];
  gamma: Gamma;
  /** edge length of a cube of the same volume (the natural unit for distances in the views) */
  L: number;
  /** high quality, for the outside view and the previews */
  kit: CellKit;
  /** low quality, for the many copies of the inside view (made on first use) */
  kitLow?: CellKit;
  /** the shape: the default box is mapped by M (null: the default box itself, as in platycosms.ts) */
  M: Mat3 | null;
}

const cache = new Map<string, Entry>();
/** the one entry in a chosen shape (each slider move makes a new one; the last is kept) */
let shaped: Entry | null = null;
const listeners = new Set<() => void>();
let crab: CrabModel | null = null;
let light = false;

loadCrab().then(
  (c) => { crab = c; cache.clear(); dropShaped(); listeners.forEach((f) => f()); },
  (e) => console.warn('crab failed to load', e),
);

/** Called when the entries are rebuilt (the crab has arrived); returns an unsubscribe function. */
export function onEntriesChanged(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** The entry for a platycosm, in the default box or (with M) in the shape M maps it to (see src/math/shape.ts). */
export function entryFor(def: PlatycosmDef, M: Mat3 | null = null): Entry {
  if (M) return shapedEntry(def, M);
  let e = cache.get(def.id);
  if (e) return e;
  const R = analyze(def, { samples: 0 });
  if (!R.ok) console.warn('analysis problems for', def.id, R.errors);
  const kit = buildKit(R, { quality: 'high', crab });
  paintKit(kit);
  e = { def, R, pairs: pairings(R), gamma: new Gamma(def.gens, def.lattice), L: Math.cbrt(R.volume), kit, M: null };
  cache.set(def.id, e);
  return e;
}

function shapedEntry(def: PlatycosmDef, M: Mat3): Entry {
  if (shaped && shaped.def.id === def.id && shaped.M!.every((v, i) => v === M[i])) return shaped;
  const base = entryFor(def);
  const R = deformAnalysis(base.R, M), d = deformSpec(def, M);
  const kit = buildKit(R, { quality: 'high', crab });
  paintKit(kit);
  dropShaped();
  shaped = { def: d, R, pairs: deformPairings(base.pairs, M), gamma: new Gamma(d.gens, d.lattice), L: Math.cbrt(R.volume), kit, M };
  return shaped;
}

/** free the GPU buffers of the last shaped entry (its crab is shared, so it stays) */
function dropShaped(): void {
  for (const k of [shaped?.kit, shaped?.kitLow]) if (k) for (const p of k.parts) if (p.kind !== 'crab') { p.geometry.dispose(); p.material.dispose(); }
  shaped = null;
}

export function lowKit(e: Entry): CellKit {
  if (!e.kitLow) { e.kitLow = buildKit(e.R, { quality: 'low', crab }); paintKit(e.kitLow); }
  return e.kitLow;
}

/** theme-dependent colours of the shared kits: vertex class 0 is white on black, near-black on white */
export function setEntriesTheme(isLight: boolean): void {
  light = isLight;
  for (const e of [...cache.values(), ...(shaped ? [shaped] : [])]) for (const k of [e.kit, e.kitLow]) if (k) paintKit(k);
}

export const ball0Color = (): string => (light ? VERT0_LIGHT : vertColor(0));

function paintKit(k: CellKit): void {
  for (const p of k.parts) if (p.kind === 'ball' && p.cls === 0) (p.material as MeshStandardMaterial).color.set(ball0Color());
}
