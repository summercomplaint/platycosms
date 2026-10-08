import { factsFor } from '../data/facts';
import { content } from '../content';
import { describeIso } from '../math/gluing';
import type { Stage } from '../render/stage';
import type { Mode } from '../render/stage';
import { inline, paragraphs } from './markdown';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wiki = (label: string, article: string) =>
  `<a href="https://en.wikipedia.org/wiki/${article}" target="_blank" rel="noopener">${label}</a>`;

/** Fill the notes column for the platycosm currently shown, and wire up its controls. */
export function renderPanel(el: HTMLElement, stage: Stage, mode: Mode): void {
  const e = stage.entry;
  if (!e) return;
  const { def, pairs } = e;
  const F = factsFor(def.id);

  // a face pair that occurs more than once is glued in pieces (halves), each by its own map
  const pieces = new Map<string, number>();
  for (const p of pairs) pieces.set(`${p.a.face}-${p.b.face}`, (pieces.get(`${p.a.face}-${p.b.face}`) ?? 0) + 1);
  const pairHtml = pairs.map((p, i) => {
    const same = p.a.face === p.b.face;
    const split = (pieces.get(`${p.a.face}-${p.b.face}`) ?? 1) > 1;
    const label = same ? `${p.a.name} to itself, half to half` : `${p.a.name} → ${p.b.name}${split ? ', one half' : ''}`;
    return `<li><button type="button" data-pair="${i}" aria-pressed="false"><span class="play" aria-hidden="true"></span><span class="f">${label}</span><span class="k">${esc(describeIso(p.gamma))}</span></button></li>`;
  }).join('');

  const row = (term: string, value: string) => `<dt>${term}</dt><dd>${value}</dd>`;
  el.innerHTML = `
    <div class="title">
      <h2>${def.name} <span class="sym">${def.sym}</span></h2>
      <p class="fam">${inline(content.tagline(def.id))}</p>
    </div>
    <div class="story">${paragraphs(content.description(def.id))}</div>
    <section class="key">
      <h3>The gluings</h3>
      <div class="small">${paragraphs(content.gluings(mode))}</div>
      <ul class="pairs">${pairHtml}</ul>
      <button type="button" class="clear" id="aClear" hidden>${mode === 'outside' ? 'Clear ghost' : 'Reset tiling'}</button>
    </section>
    <details>
      <summary>More details</summary>
      <dl>
        ${row(wiki('Orientable', 'Orientability'), `${def.orientable ? 'Yes' : 'No'}${F.metachiral ? ', in two mirror-image forms' : ''}${F.orientableDoubleCover ? `. Orientable double cover: ${F.orientableDoubleCover}` : ''}`)}
        ${row(wiki('Mapping torus', 'Mapping_torus'), esc(F.mappingTorus.text))}
        ${row(wiki('H₁', 'Homology_(mathematics)'), F.h1)}
        ${row(wiki('Holonomy', 'Holonomy'), `order ${F.holonomyOrder} (${wiki('point group', 'Crystallographic_point_group')} ${F.pointGroup})`)}
        ${row(wiki('Space group', 'Space_group'), F.spaceGroup)}
        ${row(`${wiki('Wolf', 'Joseph_A._Wolf')}'s name`, F.wolf)}
        ${row(wiki('π₁', 'Fundamental_group'), esc(F.pi1))}
        ${row('Shape parameters', String(F.shapeParameters))}
        ${row(wiki('Seifert fibrations', 'Seifert_fiber_space'), esc(F.seifert.map((s) => `${s.count}: ${s.type}`).join('; ')))}
        ${row('Flat surfaces', esc(F.surfaces))}
        ${row(wiki('Double covers', 'Covering_space'), `${F.doubleCovers.total}: ${F.doubleCovers.types}`)}
        ${row(wiki('Bravais types', 'Bravais_lattice'), String(F.bravaisTypes))}
        ${row(`${wiki('Injectivity radius', 'Injectivity_radius')}²`, esc(F.injectivityRadiusSq))}
        ${row(`${wiki('Diameter', 'Diameter')}²`, esc(F.diameterSq))}
      </dl>
      <p class="small">A, B, C, D are the shape parameters of Conway and Rossetti's paper, where the rest of these come from. Every fact is sourced in NOTES.md in the repository.</p>
    </details>`;

  // the gluing buttons: hover highlights the faces, a click plays the map from the start
  const btns = [...el.querySelectorAll<HTMLButtonElement>('[data-pair]')];
  btns.forEach((b) => {
    const i = Number(b.dataset.pair);
    ['mouseenter', 'focus'].forEach((ev) => b.addEventListener(ev, () => stage.highlight(pairs[i].polys)));
    ['mouseleave', 'blur'].forEach((ev) => b.addEventListener(ev, () => stage.highlight(null)));
    b.addEventListener('click', () => { stage.anim.start(i); stage.applyOptions(); });
  });
  const clear = el.querySelector<HTMLButtonElement>('#aClear')!;
  clear.addEventListener('click', () => { stage.anim.stop(); stage.highlight(null); stage.applyOptions(); });
  stage.onFrame = () => {
    const a = stage.anim;
    btns.forEach((b) => b.setAttribute('aria-pressed', String(a.gen === Number(b.dataset.pair))));
    clear.hidden = a.gen === null;
  };
}
