import {
  BufferGeometry, Color, LoadingManager, Material, Matrix4, Mesh, MeshStandardMaterial, RepeatWrapping,
  SRGBColorSpace, Texture, TextureLoader, Vector3,
} from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import daeUrl from '../assets/crab/model.dae?url';
import albedoUrl from '../assets/crab/defaultMat_albedo.jpeg?url';
import roughUrl from '../assets/crab/defaultMat_roughness.jpeg?url';
import metalUrl from '../assets/crab/defaultMat_metallic.jpeg?url';
import normalUrl from '../assets/crab/defaultMat_normal.jpeg?url';
import aoUrl from '../assets/crab/defaultMat_AO.jpeg?url';

/**
 * The fiddler crab ("Fiddler Crab" by renceed, CC BY-NC 4.0, https://skfb.ly/6xDJv), as plain geometry
 * normalised to a unit bounding sphere centred at the origin, upright along +z.
 */
export interface CrabPart { geometry: BufferGeometry; material: Material }
export interface CrabModel { parts: CrabPart[] }

let cached: Promise<CrabModel> | null = null;
export const loadCrab = (): Promise<CrabModel> => (cached ??= load());

async function load(): Promise<CrabModel> {
  // the .dae points at a bitmap that is not shipped; answer that request with nothing so it does not 404
  const manager = new LoadingManager();
  manager.setURLModifier((url) => (/\.bmp$/i.test(url) ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : url));
  const collada = (await new ColladaLoader(manager).loadAsync(daeUrl))!;

  const tl = new TextureLoader();
  const tex = async (url: string, srgb: boolean): Promise<Texture> => {
    const t = await tl.loadAsync(url);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.flipY = true;
    if (srgb) t.colorSpace = SRGBColorSpace;
    return t;
  };
  const [map, roughnessMap, metalnessMap, normalMap, aoMap] = await Promise.all([
    tex(albedoUrl, true), tex(roughUrl, false), tex(metalUrl, false), tex(normalUrl, false), tex(aoUrl, false),
  ]);
  const material = new MeshStandardMaterial({ map, roughnessMap, metalnessMap, normalMap, aoMap, roughness: 1, metalness: 1, color: new Color('#ffffff') });

  // bake each mesh's transform, convert Y-up (centimetres) to Z-up, and normalise
  const toZUp = new Matrix4().makeRotationX(Math.PI / 2);
  const geos: BufferGeometry[] = [];
  collada.scene.updateMatrixWorld(true);
  collada.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    g.applyMatrix4(toZUp);
    geos.push(g);
  });
  const box = { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) };
  for (const g of geos) {
    g.computeBoundingBox();
    box.min.min(g.boundingBox!.min);
    box.max.max(g.boundingBox!.max);
  }
  const center = box.min.clone().add(box.max).multiplyScalar(0.5);
  // radius = farthest vertex from the centre
  let radius = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) radius = Math.max(radius, Math.hypot(p.getX(i) - center.x, p.getY(i) - center.y, p.getZ(i) - center.z));
  }
  const norm = new Matrix4().makeScale(1 / radius, 1 / radius, 1 / radius).multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  for (const g of geos) { g.applyMatrix4(norm); g.computeBoundingSphere(); }
  return { parts: geos.map((geometry) => ({ geometry, material })) };
}


