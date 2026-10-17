import type { PlatycosmDef } from '../data/platycosms';
import { defaultValues } from '../math/shape';

/** The slider values chosen for each platycosm while the page is open (not in the URL). */
const values = new Map<string, number[]>();

export const shapeValues = (def: PlatycosmDef): number[] => values.get(def.id) ?? defaultValues(def);
export const setShapeValues = (def: PlatycosmDef, v: number[]): void => { values.set(def.id, v); };
export const resetShape = (def: PlatycosmDef): void => { values.delete(def.id); };
