import { content } from '../content';
import { PLATYCOSMS, PlatycosmDef } from '../data/platycosms';
import type { PageMaker } from '../app/router';
import { onTheme } from '../app/theme';
import { onEntriesChanged } from '../render/entries';
import { Previews } from '../render/previews';
import { inline, paragraphs } from '../ui/markdown';

const GROUPS: { title: string; note: string; ids: string[] }[] = [
  { title: 'Orientable', note: 'Left and right stay the same wherever you go.', ids: ['c1', 'c2', 'c3', 'c4', 'c6', 'c22'] },
  { title: 'Non-orientable', note: 'Some round trips bring you back as your own mirror image.', ids: ['a1p', 'a1m', 'a2p', 'a2m'] },
];

/** The front page: what a platycosm is on the left, the ten as cards on the right. */
export const homePage: PageMaker = (root) => {
  root.innerHTML = `
    <div class="home">
      <aside class="home-side">
        <h1>The ten platycosms</h1>
        <div class="prose">${paragraphs(content.whatIs())}${paragraphs(content.howToRead())}</div>
        <a class="confused" href="#learn"><span>${inline(content.stillConfused())}</span><span class="go" aria-hidden="true">→</span></a>
      </aside>
      <div class="home-list">
        ${GROUPS.map((g) => `
          <section class="group">
            <h2>${g.title}</h2>
            <p class="group-note">${g.note}</p>
            <ol class="cards">${g.ids.map((id) => card(PLATYCOSMS.find((P) => P.id === id)!)).join('')}</ol>
          </section>`).join('')}
      </div>
    </div>`;

  // the previews: drawn one at a time after the page is up, so the text shows at once
  const previews = new Previews();
  const shots = [...root.querySelectorAll<HTMLCanvasElement>('canvas[data-id]')];
  const defOf = (c: HTMLCanvasElement) => PLATYCOSMS.find((P) => P.id === c.dataset.id)!;
  let queue = 0, alive = true;
  const drawAll = () => {
    const run = ++queue;
    let i = 0;
    const next = () => {
      if (!alive || run !== queue || i >= shots.length) return;
      previews.draw(defOf(shots[i]), shots[i]);
      i++;
      setTimeout(next, 0);
    };
    next();
  };
  for (const c of shots) {
    const a = c.closest('a')!;
    a.addEventListener('pointerenter', () => previews.spin(defOf(c), c));
    a.addEventListener('pointerleave', () => previews.stop());
    a.addEventListener('focus', () => previews.spin(defOf(c), c));
    a.addEventListener('blur', () => previews.stop());
  }
  const offTheme = onTheme(() => requestAnimationFrame(drawAll));
  const offEntries = onEntriesChanged(drawAll); // the crab arrived
  const ro = new ResizeObserver(() => drawAll());
  ro.observe(root.querySelector('.home-list')!);

  return {
    destroy() {
      alive = false;
      offTheme();
      offEntries();
      ro.disconnect();
      previews.dispose();
    },
  };
};

function card(P: PlatycosmDef): string {
  return `
    <li><a class="card" href="#${P.id}">
      <canvas data-id="${P.id}" aria-hidden="true"></canvas>
      <span class="card-text">
        <span class="card-name"><span class="sym">${P.sym}</span> ${P.name}</span>
        <span class="card-tag">${inline(content.tagline(P.id))}</span>
      </span>
    </a></li>`;
}
