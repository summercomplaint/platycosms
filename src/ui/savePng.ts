import type { PlatycosmDef } from '../data/platycosms';
import type { Mode, Stage } from '../render/stage';

/** e.g. didicosm-c22-outside.png, first-amphicosm-plus-a1-inside.png (the name and symbol on the page, not the internal id) */
export const pngName = (P: PlatycosmDef, m: Mode) =>
  `${P.name.toLowerCase().replace(/\s+/g, '-')}-${P.sym.replace(/^\+/, 'plus-').replace(/^−/, 'minus-')}-${m}.png`;

/**
 * The Save PNG button opens a small popover with the transparent-background choice. `wrap` holds the button
 * (.save-open), the popover (.pop) with its checkbox (.transp) and the Save button (.save-go). Returns a cleanup function.
 */
export function wireSavePng(wrap: HTMLElement, stage: Stage, current: () => { def: PlatycosmDef; mode: Mode }): () => void {
  const open = wrap.querySelector<HTMLButtonElement>('.save-open')!, pop = wrap.querySelector<HTMLElement>('.pop')!;
  const setPop = (on: boolean) => { pop.hidden = !on; open.setAttribute('aria-expanded', String(on)); };
  open.addEventListener('click', () => setPop(pop.hidden === true));
  const outside = (e: PointerEvent) => { if (!pop.hidden && !wrap.contains(e.target as Node)) setPop(false); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pop.hidden) { setPop(false); open.focus(); } };
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', esc);
  wrap.querySelector('.save-go')!.addEventListener('click', async () => {
    setPop(false);
    const blob = await stage.snapshot(wrap.querySelector<HTMLInputElement>('.transp')!.checked);
    if (!blob) return;
    const { def, mode } = current();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = pngName(def, mode);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // revoke late: a browser still asking where to save (Firefox) loses the name if the URL goes away first
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  });
  return () => {
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('keydown', esc);
  };
}
