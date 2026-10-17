import type { PlatycosmDef } from '../data/platycosms';
import { resetShape, setShapeValues, shapeValues } from '../app/shapeState';
import { DiameterSearch, injectivityRadius } from '../math/metric';
import { Mat3, defaultValues, presetValues, ranges, shapeDef, shapeMatrix } from '../math/shape';
import { entryFor } from '../render/entries';
import type { Stage } from '../render/stage';

/** the matrix for the shape chosen for a platycosm (what the viewer should show) */
export const chosenShape = (def: PlatycosmDef): Mat3 => shapeMatrix(def, shapeValues(def))!;

const fmt = (x: number, deg: boolean) => (deg ? `${Math.round(x)}°` : x.toFixed(2));
const same = (a: number[], b: number[]) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);

/**
 * The shape bar in the viewer: a slider per free parameter (the length follows from volume 1), the Bravais types as
 * presets, and live diameter and injectivity radius. Hovering a slider fades all but the edges it stretches or turns.
 */
export function shapeBar(bar: HTMLElement, stage: Stage, getDef: () => PlatycosmDef): { render(): void; stop(): void } {
  let frame = 0, search: DiameterSearch | null = null, searchFrame = 0;

  function render(): void {
    const def = getDef(), sd = shapeDef(def.id), v = shapeValues(def), r = ranges(def);
    const presets = sd.presets.map((p) => ({ p, v: presetValues(def, p) }));
    bar.innerHTML = `
      ${presets.length ? `<div class="presets" role="group" aria-label="Bravais types">${presets.map(({ p }, i) =>
        `<button type="button" data-preset="${i}" title="${p.title}">${p.name}</button>`).join('')}</div>` : ''}
      ${sd.sliders.map((s, i) => `
        <label class="srow" data-slider="${i}"><span>${s.label}</span>
          <input type="range" min="${r[i][0]}" max="${r[i][1]}" step="any" value="${v[i]}">
          <output>${fmt(v[i], s.kind === 'angle')}</output></label>`).join('')}
      <div class="readout"><span>Volume 1</span><span class="diam"></span><span class="inj"></span>
        <button type="button" class="reset">Reset</button></div>`;

    const inputs = [...bar.querySelectorAll<HTMLInputElement>('input[type=range]')];
    const outputs = [...bar.querySelectorAll('output')];
    const mark = () => {
      const cur = shapeValues(def);
      bar.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(same(cur, presets[Number(b.dataset.preset)].v))));
      bar.querySelector<HTMLButtonElement>('.reset')!.hidden = same(cur, defaultValues(def));
    };
    const apply = (vals: number[]) => {
      setShapeValues(def, vals);
      vals.forEach((x, i) => { inputs[i].value = String(x); outputs[i].textContent = fmt(x, sd.sliders[i].kind === 'angle'); });
      mark();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { stage.show(def, chosenShape(def)); measure(); });
    };

    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const vals = [...shapeValues(def)];
        vals[i] = Number(inp.value);
        if (shapeMatrix(def, vals)) apply(vals);
        else inp.value = String(shapeValues(def)[i]); // the three angles cannot make a cell
      });
      const row = inp.closest<HTMLElement>('.srow')!;
      row.addEventListener('mouseenter', () => stage.classes.focus(edgesFor(def, sd.sliders[i])));
      row.addEventListener('mouseleave', () => stage.classes.focus(null));
    });
    bar.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => apply(presets[Number(b.dataset.preset)].v)));
    bar.querySelector('.reset')!.addEventListener('click', () => { resetShape(def); apply(shapeValues(def)); });
    mark();
    measure();
  }

  /** injectivity radius at once; the diameter by a search spread over frames */
  function measure(): void {
    const e = stage.entry;
    cancelAnimationFrame(searchFrame);
    if (!e) return;
    const inj = bar.querySelector('.inj'), diam = bar.querySelector('.diam');
    if (inj) inj.textContent = `Injectivity radius ${injectivityRadius(e.def, e.gamma).toFixed(2)}`;
    search = new DiameterSearch(e.def, { tol: 2e-3, gamma: e.gamma });
    const s = search;
    const tick = () => {
      if (s !== search) return;
      const b = s.step(8);
      if (diam) diam.textContent = `Diameter ${b.best.r.toFixed(2)}${b.done ? '' : '…'}`;
      if (!b.done) searchFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  return {
    render,
    stop() { cancelAnimationFrame(frame); cancelAnimationFrame(searchFrame); search = null; stage.classes.focus(null); },
  };
}

/** the edge classes running along the axes a slider changes (in the default box) */
function edgesFor(def: PlatycosmDef, s: ReturnType<typeof shapeDef>['sliders'][number]): number[] {
  const axes = s.pair ?? [s.kind === 'depth' ? 1 : 2];
  const R = entryFor(def).R, out = new Set<number>();
  R.D.E.forEach(([a, b], i) => {
    const p = R.D.V[a], q = R.D.V[b], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], l = Math.hypot(...d);
    if (axes.some((ax) => Math.abs(d[ax]) > 0.999 * l)) out.add(R.eClass[i]);
  });
  return [...out];
}
