import { content } from '../content';
import type { PageMaker } from '../app/router';
import { paragraphs } from '../ui/markdown';

/** "Still confused?": a gentle build-up from a circle to the platycosms. A placeholder for now (content/learn/). */
export const learnPage: PageMaker = (root) => {
  root.innerHTML = `
    <article class="learn">
      <a class="back" href="#">← The ten platycosms</a>
      <h1>Start from the beginning</h1>
      <div class="prose">${paragraphs(content.learn())}</div>
    </article>`;
  return { destroy() { /* nothing to undo */ } };
};
