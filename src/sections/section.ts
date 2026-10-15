import type { PlatycosmDef } from '../data/platycosms';
import type { Facts } from '../data/facts';
import type { Pairing } from '../math/gluing';
import type { Mode, Stage } from '../render/stage';

/** What a section of a platycosm page gets to draw itself. */
export interface SectionContext {
  def: PlatycosmDef;
  facts: Facts;
  pairs: Pairing[];
  mode: Mode;
  stage: Stage;
}

/**
 * One section of a platycosm page (src/pages/platycosm.ts lists them in order). `html` is its content; `wire`, if
 * given, adds behaviour after it is in the page. Gluing buttons (`data-pair`) are wired by the page itself, wherever
 * they are, so a section only has to draw them.
 */
export interface Section {
  id: string;
  /** the heading, or null for a section that brings its own (the overview) */
  title: string | null;
  html(ctx: SectionContext): string;
  wire?(el: HTMLElement, ctx: SectionContext): void;
}

export const wiki = (label: string, article: string) =>
  `<a href="https://en.wikipedia.org/wiki/${article}" target="_blank" rel="noopener">${label}</a>`;

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
