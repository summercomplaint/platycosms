import {
  BufferGeometry, CanvasTexture, Color, Euler, LoadingManager, Material, Matrix4, Mesh, MeshStandardMaterial, SRGBColorSpace, Vector3,
} from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import daeUrl from '../assets/crab/model.dae?url';

/**
 * The fiddler crab ("Fiddler Crab" by renceed, CC BY-NC 4.0, https://skfb.ly/6xDJv), recoloured so its handedness is
 * easy to see: a blue body, a red big claw, white eyestalks, and an "R" on the back and the belly that reads backwards
 * on a mirrored copy. Normalised to a unit bounding sphere centred at the origin, upright along +z, facing +y.
 */
export interface CrabPart { geometry: BufferGeometry; material: Material }
export interface CrabModel { parts: CrabPart[] }

let cached: Promise<CrabModel> | null = null;
export const loadCrab = (): Promise<CrabModel> => (cached ??= load());

// the model's four meshes, by their Collada node names
const BODY = 'Group2828', EYES = 'Group21201', LEGS = 'Group37975', CLAW = 'Group16311';
const COLOR: Record<string, string> = { [BODY]: '#2f7dff', [LEGS]: '#4f95ff', [EYES]: '#ffffff', [CLAW]: '#ff2b2b' };

async function load(): Promise<CrabModel> {
  // the .dae points at a bitmap that is not shipped; answer that request with nothing so it does not 404
  const manager = new LoadingManager();
  manager.setURLModifier((url) => (/\.bmp$/i.test(url) ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : url));
  const collada = (await new ColladaLoader(manager).loadAsync(daeUrl))!;

  // bake each mesh's transform, convert Y-up (centimetres) to Z-up
  const toZUp = new Matrix4().makeRotationX(Math.PI / 2);
  const meshes: { name: string; geometry: BufferGeometry }[] = [];
  collada.scene.updateMatrixWorld(true);
  collada.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    g.applyMatrix4(toZUp);
    g.deleteAttribute('uv');
    meshes.push({ name: m.name.replace(/^g /, ''), geometry: g });
  });

  // normalise: centre of the bounding box at the origin, farthest vertex at distance 1
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const { geometry } of meshes) {
    geometry.computeBoundingBox();
    min.min(geometry.boundingBox!.min);
    max.max(geometry.boundingBox!.max);
  }
  const center = min.clone().add(max).multiplyScalar(0.5);
  let radius = 0;
  for (const { geometry } of meshes) {
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) radius = Math.max(radius, Math.hypot(p.getX(i) - center.x, p.getY(i) - center.y, p.getZ(i) - center.z));
  }
  const norm = new Matrix4().makeScale(1 / radius, 1 / radius, 1 / radius).multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));

  const parts: CrabPart[] = [];
  let body: BufferGeometry | null = null;
  for (const { name, geometry } of meshes) {
    geometry.applyMatrix4(norm);
    geometry.computeBoundingSphere();
    if (name === BODY) body = geometry;
    const material = new MeshStandardMaterial({ color: new Color(COLOR[name] ?? '#2f7dff'), roughness: 0.4, metalness: 0 });
    parts.push({ geometry, material });
  }

  if (body) {
    // the "R": projected straight down onto the back, and straight up onto the belly (mirrored so it reads right from below)
    const map = letterTexture('R');
    const material = new MeshStandardMaterial({
      map, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    const host = new Mesh(body);
    host.updateMatrixWorld(true);
    const size = new Vector3(0.42, 0.42, 0.22);
    parts.push({ geometry: new DecalGeometry(host, new Vector3(0, -0.12, 0.3), new Euler(0, 0, 0), size), material });
    parts.push({ geometry: new DecalGeometry(host, new Vector3(0, -0.12, -0.12), new Euler(0, Math.PI, 0), size), material });
  }
  return { parts };
}

/** a white letter with a dark outline on a transparent square */
function letterTexture(ch: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.font = '900 210px "Space Grotesk", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 22;
  g.strokeStyle = '#06123a';
  g.strokeText(ch, 128, 140);
  g.fillStyle = '#ffffff';
  g.fillText(ch, 128, 140);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
