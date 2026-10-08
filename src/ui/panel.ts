import { FAMILY_LABEL, factsFor } from '../data/facts';
import { describeIso } from '../math/gluing';
import type { Stage } from '../render/stage';
import type { Mode } from '../render/stage';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Fill the notes column for the platycosm currently shown, and wire up its controls. */
export function renderPanel(el: HTMLElement, stage: Stage, mode: Mode): void {
  const e = stage.entry;
  if (!e) return;
  const { def, R, pairs } = e;
  const F = factsFor(def.id);
  const nSeams = R.isSeam.filter(Boolean).length;

  // a face pair that occurs more than once is glued in pieces (halves), each by its own map
  const pieces = new Map<string, number>();
  for (const p of pairs) pieces.set(`${p.a.face}-${p.b.face}`, (pieces.get(`${p.a.face}-${p.b.face}`) ?? 0) + 1);
  const pairHtml = pairs.map((p, i) => {
    const same = p.a.face === p.b.face;
    const split = (pieces.get(`${p.a.face}-${p.b.face}`) ?? 1) > 1;
    const label = same ? `${p.a.name} to itself, half to half` : `${p.a.name} → ${p.b.name}${split ? ', one half' : ''}`;
    return `<li><button type="button" data-pair="${i}" aria-pressed="false"><span class="play" aria-hidden="true"></span><span class="f">${label}</span><span class="k">${esc(describeIso(p.gamma))}</span></button></li>`;
  }).join('');

  const otherNames = F.otherNames.length ? ` Also called the ${F.otherNames.join(', ')}.` : '';
  el.innerHTML = `
    <div class="title">
      <h2>${def.name} <span class="sym">${def.sym}</span></h2>
      <p class="fam">${FAMILY_LABEL[F.family]}.${otherNames}</p>
    </div>
    <div class="story">${F.story.map((s) => `<p>${esc(s)}</p>`).join('')}
      ${!def.orientable ? `<p>Keep only the copies of the cell where the crab has its original handedness, and you get the orientable double cover: ${F.orientableDoubleCover}.</p>` : ''}
    </div>
    <section class="key">
      <h3>The gluings</h3>
      <p>${mode === 'outside'
        ? 'Press one to watch a copy of the cell move by that map. It lands against the face it is glued to, and colours and arrows match across it.'
        : 'Press one to watch every copy of the cell move by that map. The whole tiling lands on itself, each crab where another one was.'}
        Together these maps generate every way of moving the cell onto another copy of itself.</p>
      <ul class="pairs">${pairHtml}</ul>
      <div class="player"><button type="button" id="aPlay">Play</button><input type="range" id="aSlide" min="0" max="1000" value="0" aria-label="Animation progress"></div>
      ${nSeams ? `<p class="small">Extra edge${nSeams > 1 ? 's' : ''} (tubes lying across a face) cut it into halves, so that each half is glued whole to another half. This is Egan's trick for drawing these.</p>` : ''}
    </section>
    <section class="key">
      <h3>At a glance</h3>
      <dl class="glance">
        <dt>Orientable</dt><dd>${def.orientable ? 'yes' : 'no'}${F.metachiral ? ', in two mirror-image forms' : ''}</dd>
        <dt>Mapping torus</dt><dd>${F.mappingTorus.is ? 'yes' : 'no'}</dd>
        <dt>H₁</dt><dd>${F.h1}</dd>
        <dt>Holonomy</dt><dd>order ${F.holonomyOrder} (point group ${F.pointGroup})</dd>
      </dl>
    </section>
    <details>
      <summary>More from the paper</summary>
      <p class="small">${esc(F.mappingTorus.text)}</p>
      <dl>
        <dt>Space group</dt><dd>${F.spaceGroup}</dd>
        <dt>Wolf</dt><dd>${F.wolf}</dd>
        <dt>π₁</dt><dd>${esc(F.pi1)}</dd>
        <dt>Shape parameters</dt><dd>${F.shapeParameters}</dd>
        <dt>Seifert fibrations</dt><dd>${esc(F.seifert.map((s) => `${s.count}: ${s.type}`).join('; '))}</dd>
        <dt>Flat surfaces</dt><dd>${esc(F.surfaces)}</dd>
        <dt>Double covers</dt><dd>${F.doubleCovers.total}: ${F.doubleCovers.types}</dd>
        <dt>Bravais types</dt><dd>${F.bravaisTypes}</dd>
        <dt>Injectivity radius²</dt><dd>${esc(F.injectivityRadiusSq)}</dd>
        <dt>Diameter²</dt><dd>${esc(F.diameterSq)}</dd>
      </dl>
      <p class="small">A, B, C, D are the paper's shape parameters. Every fact is sourced in NOTES.md in the repository.</p>
    </details>`;

  // the gluing buttons: hover highlights the faces, press plays the map
  const btns = [...el.querySelectorAll<HTMLButtonElement>('[data-pair]')];
  btns.forEach((b) => {
    const i = Number(b.dataset.pair);
    ['mouseenter', 'focus'].forEach((ev) => b.addEventListener(ev, () => stage.highlight(pairs[i].polys)));
    ['mouseleave', 'blur'].forEach((ev) => b.addEventListener(ev, () => stage.highlight(null)));
    b.addEventListener('click', () => { stage.anim.start(i); stage.applyOptions(); });
  });

  const play = el.querySelector<HTMLButtonElement>('#aPlay')!;
  const slide = el.querySelector<HTMLInputElement>('#aSlide')!;
  play.addEventListener('click', () => {
    const a = stage.anim;
    if (a.gen === null) a.start(0);
    else if (a.playing) a.pause();
    else a.resume();
  });
  slide.addEventListener('input', () => { if (stage.anim.gen === null) stage.anim.start(0); stage.anim.scrub(Number(slide.value) / 1000); });
  stage.onFrame = () => {
    const a = stage.anim;
    btns.forEach((b) => b.setAttribute('aria-pressed', String(a.gen === Number(b.dataset.pair))));
    play.textContent = a.gen !== null && a.playing ? 'Pause' : a.tau >= 1 ? 'Replay' : 'Play';
    if (document.activeElement !== slide) slide.value = String(Math.round(a.tau * 1000));
  };
}
