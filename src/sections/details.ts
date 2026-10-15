import { formatPresentation } from '../math/presentation';
import { Section, esc, wiki } from './section';

/** The table of facts (from src/data/facts.ts; sources in NOTES.md). */
export const details: Section = {
  id: 'details',
  title: 'More details',
  html: ({ def, facts: F }) => {
    const row = (term: string, value: string) => `<dt>${term}</dt><dd>${value}</dd>`;
    return `
      <dl>
        ${row(wiki('Orientable', 'Orientability'), `${def.orientable ? 'Yes' : 'No'}${F.metachiral ? ', in two mirror-image forms' : ''}${F.orientableDoubleCover ? `. Orientable double cover: ${F.orientableDoubleCover.replace(/(c\d+)$/, '<a href="#$1">$1</a>')}` : ''}`)}
        ${row(wiki('Mapping torus', 'Mapping_torus'), esc(F.mappingTorus.text))}
        ${row(wiki('Product space?', 'Product_topology'), F.product ? esc(F.product) : 'No')}
        ${row(wiki('H₁', 'Homology_(mathematics)'), F.h1)}
        ${row(wiki('Holonomy', 'Holonomy'), `order ${F.holonomyOrder} (${wiki('point group', 'Crystallographic_point_group')} ${F.pointGroup})`)}
        ${row(wiki('Space group', 'List_of_space_groups'), F.spaceGroup)}
        ${row("Wolf's name", F.wolf)}
        ${row(wiki('π₁', 'Fundamental_group'), `<span class="pres">${esc(formatPresentation(F.pi1))}</span><br><span class="small">${esc(F.pi1Key)}</span>`)}
        ${row('Shape parameters', String(F.shapeParameters))}
        ${row(wiki('Seifert fibrations', 'Seifert_fiber_space'), `${esc(F.seifert.map((s) => `${s.count}: ${s.type}`).join('; '))} (${wiki('notation', 'Orbifold_notation')})`)}
        ${row('Flat surfaces', esc(F.surfaces))}
        ${row(wiki('Bravais types', 'Bravais_lattice'), String(F.bravaisTypes))}
      </dl>
      <p class="small">Sources for every fact are in <a href="https://github.com/summercomplaint/platycosms/blob/main/NOTES.md" target="_blank" rel="noopener">NOTES.md</a>.</p>`;
  },
};
