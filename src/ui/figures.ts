/**
 * Figures the page text can open with [text](figure:name). Each opens in a dialog over the page. The images are
 * imported so that `build:single` inlines them into the one file.
 */
import fig33 from '../assets/figures/conway-rossetti-fig33.png';

interface Figure { src: string; alt: string; caption: string }

export const FIGURES: Record<string, Figure> = {
  proof: {
    src: fig33,
    alt: 'Flowchart. Start: are there glide reflections? If not: are there screw motions? If not, c1. If so, the lattice '
      + 'decomposes; if their axes are all parallel, c2, c3, c4 or c6, and if not they are orthogonal of period 2, giving c22. '
      + 'If there are glide reflections, their product is a translation or a screw motion; if all their glide mirrors are '
      + 'parallel, +a1 or −a1, and if not, +a2 or −a2.',
    caption: 'Guide to the proof that there are just ten platycosms. Figure 33 of J. H. Conway and J. P. Rossetti, '
      + '<a href="https://arxiv.org/abs/math/0311476" target="_blank" rel="noopener">Describing the platycosms</a> '
      + '(Appendix I has the proof).',
  },
};

/** one dialog for all figures, opened by any .figlink button on the page */
export function setupFigures(): void {
  const dlg = document.createElement('dialog');
  dlg.className = 'figure';
  dlg.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>'
    + '<button type="button" class="close" aria-label="Close">×</button>';
  document.body.appendChild(dlg);
  const img = dlg.querySelector('img')!, cap = dlg.querySelector('figcaption')!;
  dlg.querySelector('.close')!.addEventListener('click', () => dlg.close());
  // a click on the backdrop (outside the figure) closes it
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.figlink');
    const f = b && FIGURES[b.dataset.figure ?? ''];
    if (!f) return;
    img.src = f.src;
    img.alt = f.alt;
    cap.innerHTML = f.caption;
    dlg.showModal();
  });
}
