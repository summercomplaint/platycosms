import type { Color, Group, PerspectiveCamera } from 'three';
import type { Animator } from '../animation';
import type { Entry } from '../entries';

export type Mode = 'outside' | 'inside';

/** What an overlay can see of the viewer. */
export interface ViewContext {
  mode: Mode;
  entry: Entry;
  /** outside view: the whole scene graph of the view (cleared on every rebuild); null inside */
  root: Group | null;
  /** outside view: the tubes, arrows and balls of the cell (own materials), and the crab; null inside */
  body: Group | null;
  crab: Group | null;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  anim: Animator;
  accent: Color;
  light: boolean;
}

/**
 * Something drawn on top of the basic views: highlighted faces, a hovered edge class, and later generator paths,
 * slice planes and fibres. Objects added to `ctx.root` in `build` go away with the view, so most overlays need no
 * cleanup of their own.
 */
export interface Overlay {
  /** the view was (re)built: a new platycosm, a new mode, or the crab arrived */
  build?(ctx: ViewContext): void;
  /** every frame, before drawing */
  frame?(ctx: ViewContext, dt: number): void;
  /** the theme changed (the view was not rebuilt) */
  theme?(ctx: ViewContext): void;
}
