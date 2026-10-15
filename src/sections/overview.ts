import { content } from '../content';
import { paragraphs } from '../ui/markdown';
import type { Section } from './section';

/** The name, symbol and the main description of the space. */
export const overview: Section = {
  id: 'overview',
  title: null,
  html: ({ def }) => `
    <h2>${def.name} <span class="sym">${def.sym}</span></h2>
    <div class="prose lead">${paragraphs(content.description(def.id))}</div>`,
};

/** How to read the two pictures (the same text as on the home page). */
export const reading: Section = {
  id: 'reading',
  title: null, // the text starts with its own bold heading
  html: () => `<div class="prose ruled">${paragraphs(content.howToRead())}</div>`,
};
