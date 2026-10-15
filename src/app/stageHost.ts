import { Stage } from '../render/stage';
import { onTheme } from './theme';

/**
 * The one 3D viewer, made on first use and kept across pages (its canvas is moved into whichever page shows it), so
 * going from one platycosm to the next does not set up WebGL again.
 */
let stage: Stage | null = null;

export function getStage(): Stage {
  if (!stage) {
    const s = new Stage();
    if (location.search.includes('nocrab')) s.options.crab = false;
    onTheme((light) => s.setTheme(light));
    stage = s;
  }
  return stage;
}
