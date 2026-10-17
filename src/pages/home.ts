import { content } from '../content';
import { PLATYCOSMS, PlatycosmDef } from '../data/platycosms';
import type { PageMaker } from '../app/router';
import { onTheme } from '../app/theme';
import { Previews } from '../render/previews';
import { inline, paragraphs } from '../ui/markdown';

/** The front page: what a platycosm is on the left, the ten on the right, in Conway's order. */
export const homePage: PageMaker = (root) => {
  root.innerHTML = `
    <div class="home">
      <aside class="home-side">
        <h1>The ten platycosms</h1>
        <div class="prose">${paragraphs(content.whatIs())}${paragraphs(content.howToRead())}</div>
        <a class="confused" href="#learn"><span>${inline(content.stillConfused())}</span><span class="go" aria-hidden="true">→</span></a>
      </aside>
      <ol class="cards">${PLATYCOSMS.map(card).join('')}</ol>
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
  const ro = new ResizeObserver(() => drawAll());
  ro.observe(root.querySelector('.cards')!);

  return {
    destroy() {
      alive = false;
      offTheme();
      ro.disconnect();
      previews.dispose();
    },
  };
};

function card(P: PlatycosmDef): string {
  return `
    <li><a class="card" href="#${P.id}">
      <canvas data-id="${P.id}" aria-hidden="true"></canvas>
      <span class="card-name"><span class="sym">${P.sym}</span> ${P.name}</span>
    </a></li>`;
}
