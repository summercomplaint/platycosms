import { byId } from '../data/platycosms';
import type { Mode } from '../render/stage';

/**
 * Pages are hashes, so old links keep working:
 *   (empty) or #        the home page
 *   #learn              "still confused?"
 *   #c22                a platycosm (keeps the current view)
 *   #c22/inside         ... in a given view
 *   #c22/outside/anim2@0.5   ... with gluing 2 paused half way (for slides and screenshots)
 */
export type Route =
  | { page: 'home' }
  | { page: 'learn' }
  | { page: 'cosm'; id: string; mode?: Mode; anim?: { gen: number; t: number } };

export function parse(hash: string): Route {
  const [id, view, extra] = hash.replace(/^#\/?/, '').split('/');
  if (!id) return { page: 'home' };
  if (id === 'learn') return { page: 'learn' };
  if (!byId(id)) return { page: 'home' };
  const mode = view === 'inside' || view === 'outside' ? view : undefined;
  const a = /^anim([0-9]+)@([0-9.]+)$/.exec(extra ?? '');
  return { page: 'cosm', id, mode, anim: a ? { gen: Number(a[1]) - 1, t: Number(a[2]) } : undefined };
}

export const cosmHash = (id: string, mode: Mode) => '#' + id + (mode === 'inside' ? '/inside' : '');

/** A page builds itself into a root element. `update` takes a new route of the same page in place (return false to be rebuilt). */
export interface Page {
  update?(route: Route): boolean;
  destroy(): void;
}
export type PageMaker = (root: HTMLElement, route: Route) => Page;

/** Show the page for the current hash, and follow changes. */
export function startRouter(root: HTMLElement, makers: Record<Route['page'], PageMaker>): void {
  let current: { kind: Route['page']; page: Page } | null = null;
  const show = () => {
    const route = parse(location.hash);
    if (current?.kind === route.page && current.page.update?.(route)) return;
    current?.page.destroy();
    root.replaceChildren();
    current = { kind: route.page, page: makers[route.page](root, route) };
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', show);
  show();
}
