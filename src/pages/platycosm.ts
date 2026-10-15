import { PLATYCOSMS, PlatycosmDef, byId } from '../data/platycosms';
import { factsFor } from '../data/facts';
import { Route, PageMaker, cosmHash } from '../app/router';
import { getStage } from '../app/stageHost';
import type { Mode } from '../render/stage';
import type { ClassInfo } from '../render/overlays/classHover';
import { details } from '../sections/details';
import { gluings, pairLabels } from '../sections/gluings';
import { overview, reading } from '../sections/overview';
import type { Section, SectionContext } from '../sections/section';
import { wireSavePng } from '../ui/savePng';

/** The sections of a platycosm page, top to bottom. Add new ones here (see src/sections/section.ts). */
const SECTIONS: Section[] = [overview, gluings, reading, details];

/**
 * One platycosm: a strip of all ten at the top, the 3D view (sticky) on the left, and the sections scrolling on the
 * right. On phones the view sticks to the top and the sections scroll under it.
 */
export const platycosmPage: PageMaker = (root, first) => {
  const stage = getStage();
  root.innerHTML = `
    <div class="cosm-page">
      <nav class="strip" aria-label="Platycosms">
        <a class="home-link" href="#">All ten</a>
        <div class="tabs" role="tablist">${PLATYCOSMS.map((P) => `
          <button type="button" role="tab" data-id="${P.id}"><span class="sym">${P.sym}</span><span class="nm">${P.name}</span></button>`).join('')}
        </div>
      </nav>
      <div class="cosm">
        <div class="viewer">
          <div class="stage">
            <div class="vtop">
              <div class="glue-row" role="group" aria-label="Play a gluing"></div>
              <button type="button" class="clear" hidden>Clear ghost</button>
            </div>
            <div class="hint" hidden><span>Drag to look · W A S D or arrow keys to move · Q / E down and up · scroll to zoom</span></div>
            <div class="caption" hidden></div>
            <div class="tools">
              <div class="seg" role="group" aria-label="View">
                <button type="button" data-mode="outside">Outside</button>
                <button type="button" data-mode="inside">Inside</button>
              </div>
              <label><input type="checkbox" class="crab-box"> Crab</label>
              <span class="gap"></span>
              <div class="savewrap">
                <button type="button" class="save-open" aria-haspopup="dialog" aria-expanded="false">Save PNG</button>
                <div class="pop" role="dialog" aria-label="Save PNG" hidden>
                  <label><input type="checkbox" class="transp"> Transparent background</label>
                  <button type="button" class="save-go">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <article class="sections"></article>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const box = $('.stage'), article = $('.sections'), glueRow = $('.glue-row'), clear = $<HTMLButtonElement>('.clear');
  const caption = $('.caption'), crabBox = $<HTMLInputElement>('.crab-box');
  box.prepend(stage.canvas);

  let def: PlatycosmDef = byId(first.page === 'cosm' ? first.id : 'c22')!;
  let mode: Mode = stage.mode;
  let rendered = '';

  /* ---------- showing a platycosm ---------- */
  function go(id: string, m: Mode): void {
    def = byId(id) ?? def;
    mode = m;
    stage.show(def);
    stage.setMode(m);
    if (rendered !== def.id + mode) { render(); rendered = def.id + mode; }
    try { history.replaceState(null, '', cosmHash(def.id, mode)); } catch { /* ignore */ }
  }

  function render(): void {
    const e = stage.entry!;
    const ctx: SectionContext = { def, facts: factsFor(def.id), pairs: e.pairs, mode, stage };
    article.innerHTML = SECTIONS.map((s) =>
      `<section class="sec" id="sec-${s.id}">${s.title ? `<h3>${s.title}</h3>` : ''}${s.html(ctx)}</section>`).join('');
    SECTIONS.forEach((s) => s.wire?.(article.querySelector<HTMLElement>(`#sec-${s.id}`)!, ctx));

    // the gluings again, as a row of play buttons in the view
    const labels = pairLabels(e.pairs);
    glueRow.innerHTML = `<span class="lbl">Play a gluing</span>` + e.pairs.map((_, i) =>
      `<button type="button" data-pair="${i}" aria-pressed="false" title="${labels[i]}" aria-label="Gluing ${i + 1}: ${labels[i]}"><span class="play" aria-hidden="true"></span>${i + 1}</button>`).join('');
    wirePairs();

    root.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === def.id)));
    keepTabInView();
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('.hint').hidden = mode !== 'inside';
    clear.textContent = mode === 'outside' ? 'Clear ghost' : 'Walk back';
    document.title = `${def.name} (${def.sym}) · The ten platycosms`;
  }

  /** every gluing button on the page (in the view and in the list): hover shows the faces, a click plays it */
  function wirePairs(): void {
    root.querySelectorAll<HTMLButtonElement>('[data-pair]').forEach((b) => {
      const i = Number(b.dataset.pair);
      const show = () => stage.highlight(stage.entry!.pairs[i].polys), hide = () => stage.highlight(null);
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('mouseleave', hide);
      b.addEventListener('blur', hide);
      b.addEventListener('click', () => { stage.anim.start(i); stage.applyOptions(); });
    });
  }

  let tabsShown = false; // the first scroll (page load) jumps, later ones glide
  function keepTabInView(): void {
    // on phones the strip scrolls sideways; keep the chosen platycosm in view (scrolls only the strip, never the page)
    const bar = $('.tabs'), sel = bar.querySelector<HTMLElement>('[aria-selected="true"]');
    if (sel && bar.scrollWidth > bar.clientWidth) {
      const left = sel.offsetLeft - bar.offsetLeft, right = left + sel.offsetWidth;
      if (left < bar.scrollLeft || right > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: left - 16, behavior: tabsShown ? 'smooth' : 'auto' });
    }
    tabsShown = true;
  }

  /* ---------- controls ---------- */
  root.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.id!, mode)));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => go(def.id, b.dataset.mode as Mode)));
  clear.addEventListener('click', () => {
    if (mode === 'outside') { stage.anim.stop(); stage.highlight(null); stage.applyOptions(); } else stage.walkBack();
  });
  crabBox.checked = stage.options.crab;
  crabBox.addEventListener('change', () => { stage.options.crab = crabBox.checked; stage.applyOptions(); });
  const offSave = wireSavePng($('.savewrap'), stage, () => ({ def, mode }));

  // the view sticks just under the strip, whose height depends on how its buttons wrap
  const stripRo = new ResizeObserver(() => document.documentElement.style.setProperty('--strip-h', `${$('.strip').offsetHeight}px`));
  stripRo.observe($('.strip'));

  const onKey = (e: KeyboardEvent) => {
    if (mode !== 'outside' || (e.target as HTMLElement).closest('input')) return;
    const i = PLATYCOSMS.indexOf(def), n = PLATYCOSMS.length;
    if (e.key === 'ArrowRight') go(PLATYCOSMS[(i + 1) % n].id, mode);
    if (e.key === 'ArrowLeft') go(PLATYCOSMS[(i + n - 1) % n].id, mode);
  };
  window.addEventListener('keydown', onKey);

  // which gluing is playing, and whether there is anything to clear
  stage.onFrame = () => {
    const a = stage.anim;
    root.querySelectorAll<HTMLElement>('[data-pair]').forEach((b) => b.setAttribute('aria-pressed', String(a.gen === Number(b.dataset.pair))));
    clear.hidden = a.gen === null;
  };
  // pointing at an edge or a vertex in the view says what it is
  stage.classes.onChange = (info: ClassInfo | null) => {
    caption.hidden = !info;
    if (!info) return;
    caption.innerHTML = `<span class="dot" style="background:${info.color}"></span>` + (info.kind === 'edge'
      ? 'These tubes are all one edge of the space. Each arrow shows which way the edge runs.'
      : 'These balls are all one point of the space.');
  };

  /* ---------- routes ---------- */
  function take(route: Route): boolean {
    if (route.page !== 'cosm') return false;
    go(route.id, route.mode ?? mode);
    if (route.anim) { stage.anim.start(route.anim.gen); stage.anim.scrub(route.anim.t); stage.applyOptions(); }
    return true;
  }
  take(first);

  return {
    update: take,
    destroy() {
      window.removeEventListener('keydown', onKey);
      stripRo.disconnect();
      offSave();
      stage.onFrame = null;
      stage.classes.onChange = null;
      stage.highlight(null);
      stage.canvas.remove();
    },
  };
};
