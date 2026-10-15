import { content } from '../content';
import { describeIso } from '../math/gluing';
import type { Pairing } from '../math/gluing';
import { paragraphs } from '../ui/markdown';
import { Section, esc } from './section';

/** A plain label for each gluing: "left → right", "front to itself, half to half", "top → bottom, one half". */
export function pairLabels(pairs: Pairing[]): string[] {
  // a face pair that occurs more than once is glued in pieces (halves), each by its own map
  const pieces = new Map<string, number>();
  for (const p of pairs) pieces.set(`${p.a.face}-${p.b.face}`, (pieces.get(`${p.a.face}-${p.b.face}`) ?? 0) + 1);
  return pairs.map((p) => {
    if (p.a.face === p.b.face) return `${p.a.name} to itself, half to half`;
    return `${p.a.name} → ${p.b.name}${(pieces.get(`${p.a.face}-${p.b.face}`) ?? 1) > 1 ? ', one half' : ''}`;
  });
}

/** The list of face pairings; each one plays its animation (the page wires the buttons). */
export const gluings: Section = {
  id: 'gluings',
  title: 'The gluings',
  html: ({ pairs, mode }) => {
    const labels = pairLabels(pairs);
    const items = pairs.map((p, i) => `
      <li><button type="button" data-pair="${i}" aria-pressed="false">
        <span class="num">${i + 1}</span><span class="f">${labels[i]}</span><span class="k">${esc(describeIso(p.gamma))}</span>
        <span class="play" aria-hidden="true"></span>
      </button></li>`).join('');
    return `<div class="prose">${paragraphs(content.gluings(mode))}</div><ol class="pairs">${items}</ol>`;
  },
};
