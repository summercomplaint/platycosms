/*
 * What we know about each platycosm, in a form the UI can show.
 * Source tags: 'paper' = transcribed from Conway & Rossetti, "Describing the platycosms" (arXiv math.DG/0311476),
 * 'computed' = checked by a test from the generators in platycosms.ts, 'derived' = reasoned from the above, not independently checked.
 * See NOTES.md for the same information with page and table references and the verification status.
 */

export type Source = 'paper' | 'computed' | 'derived';

export interface SeifertFibration { count: string; type: string }

export interface Facts {
  id: string;
  /** families from the paper, section 3 */
  family: 'torocosm' | 'helicosm' | 'didicosm' | 'amphicosm' | 'amphidicosm';
  otherNames: string[];
  /** Wolf's notation, Table 11 */
  wolf: string;
  /** international space group name and number(s) (two for the metachiral cases: one per orientation), Table 12 */
  spaceGroup: string;
  /** point group in orbifold notation and its order (the holonomy group), Table 2 */
  pointGroup: string;
  holonomyOrder: number;
  /** number of free shape parameters, Table 2 */
  shapeParameters: number;
  /** first homology group, Table 6 */
  h1: string;
  b1: number;
  /** fundamental group, Table 6 and section 7 */
  pi1: string;
  metachiral: boolean;
  /** Seifert fibrations (Table 3) */
  seifert: SeifertFibration[];
  /** parallel families of embedded flat surfaces (Table 4), unpacked into words; the paper's notation is in NOTES.md section 4 */
  surfaces: string;
  /** the orientable double cover, for non-orientable spaces (section 3 and Table 8) */
  orientableDoubleCover?: string;
  /** all double covers (Table 8 and section 8): how many and of which type */
  doubleCovers: { total: number; types: string };
  /** number of Bravais types, section 11 */
  bravaisTypes: number;
  /** squared injectivity radius and squared diameter, Table 9 (A, B, C, D are the paper's parameters) */
  injectivityRadiusSq: string;
  diameterSq: string;
  /** a plain-language statement of the mapping-torus structure, generated from the computed fibrations and checked in tests */
  mappingTorus: { is: boolean; text: string };
  /** the product decomposition (surface × circle) if there is one, from the computed fibrations (NOTES.md section 2) */
  product: string | null;
  sources: Record<string, Source>;
}

const src = (o: Partial<Record<keyof Facts, Source>> & Record<string, Source>) => o as Record<string, Source>;

const BASE: Facts[] = [
  {
    id: 'c1', family: 'torocosm', otherNames: ['3-torus'], wolf: 'G1', spaceGroup: 'P1 (no. 1)',
    pointGroup: '1', holonomyOrder: 1, shapeParameters: 6, h1: 'ℤ³', b1: 3,
    pi1: '⟨X, Y, Z | X, Y, Z commute⟩', metachiral: false,
    seifert: [{ count: 'infinitely many', type: '∘' }],
    surfaces: 'Infinitely many looping families of two-sided tori.', doubleCovers: { total: 7, types: 'all torocosms' }, bravaisTypes: 14,
    injectivityRadiusSq: 'the minimal vonorm of the lattice', diameterSq: 'see paper section 10',
    mappingTorus: { is: true, text: 'Yes. Every horizontal slice is a torus, and going up through the cell brings it back unchanged.' },
    product: 'Yes: T² × S¹ (= S¹ × S¹ × S¹)',
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'c2', family: 'helicosm', otherNames: ['half-turn space'], wolf: 'G2', spaceGroup: 'P2₁ (no. 4)',
    pointGroup: '22', holonomyOrder: 2, shapeParameters: 4, h1: 'ℤ × (ℤ/2)²', b1: 1,
    pi1: '⟨X, Y, Z | X, Y commute; Z X Z⁻¹ = X⁻¹, Z Y Z⁻¹ = Y⁻¹⟩', metachiral: false,
    seifert: [{ count: '1', type: '2222' }, { count: 'infinitely many', type: '××' }],
    surfaces: 'One looping family of two-sided tori, and infinitely many families of two-sided tori that run between two one-sided Klein bottles.', doubleCovers: { total: 7, types: '1 torocosm, 6 dicosms' }, bravaisTypes: 5,
    injectivityRadiusSq: 'min(B+C, C+A, A+B, D)', diameterSq: '(B+C)(C+A)(A+B) / (4(BC+CA+AB)) + D/4',
    mappingTorus: { is: true, text: 'Yes. Every horizontal slice is a torus; going up through the cell brings it back turned by a half turn.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'c3', family: 'helicosm', otherNames: ['one-third turn space'], wolf: 'G3', spaceGroup: 'P3₁ (no. 144) or P3₂ (no. 145)',
    pointGroup: '33', holonomyOrder: 3, shapeParameters: 2, h1: 'ℤ × ℤ/3', b1: 1,
    pi1: '⟨X, Y, Z | X, Y commute; Z: X → Y → (XY)⁻¹⟩', metachiral: true,
    seifert: [{ count: '1', type: '333' }],
    surfaces: 'One looping family of two-sided tori.', doubleCovers: { total: 1, types: 'a tricosm' }, bravaisTypes: 1,
    injectivityRadiusSq: 'min(2A, D)', diameterSq: '2A/3 + D/4',
    mappingTorus: { is: true, text: 'Yes. Every horizontal slice is a torus; going up through the cell brings it back turned by a third of a turn.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'c4', family: 'helicosm', otherNames: ['quarter-turn space'], wolf: 'G4', spaceGroup: 'P4₁ (no. 76) or P4₃ (no. 78)',
    pointGroup: '44', holonomyOrder: 4, shapeParameters: 2, h1: 'ℤ × ℤ/2', b1: 1,
    pi1: '⟨X, Y, Z | X, Y commute; Z: X → Y → X⁻¹⟩', metachiral: true,
    seifert: [{ count: '1', type: '444' }],
    surfaces: 'One looping family of two-sided tori.', doubleCovers: { total: 3, types: '1 dicosm, 2 tetracosms' }, bravaisTypes: 1,
    injectivityRadiusSq: 'min(A, D)', diameterSq: 'A/2 + D/4',
    mappingTorus: { is: true, text: 'Yes. Every horizontal slice is a torus; going up through the cell brings it back turned by a quarter turn.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'c6', family: 'helicosm', otherNames: ['one-sixth turn space'], wolf: 'G5', spaceGroup: 'P6₁ (no. 169) or P6₅ (no. 170)',
    pointGroup: '66', holonomyOrder: 6, shapeParameters: 2, h1: 'ℤ', b1: 1,
    pi1: '⟨X, Y, Z | X, Y commute; Z: X → XY → Y⟩', metachiral: true,
    seifert: [{ count: '1', type: '632' }],
    surfaces: 'One looping family of two-sided tori.', doubleCovers: { total: 1, types: 'a tricosm' }, bravaisTypes: 1,
    injectivityRadiusSq: 'min(2A, D)', diameterSq: '2A/3 + D/4',
    mappingTorus: { is: true, text: 'Yes. Every horizontal slice is a torus; going up through the cell brings it back turned by a sixth of a turn.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'c22', family: 'didicosm', otherNames: ['Hantzsche–Wendt space'], wolf: 'G6', spaceGroup: 'P2₁2₁2₁ (no. 19)',
    pointGroup: '222', holonomyOrder: 4, shapeParameters: 3, h1: '(ℤ/4)²', b1: 0,
    pi1: '⟨X, Y | X = Y² X Y², Y = X² Y X²⟩', metachiral: false,
    seifert: [{ count: '3', type: '22× (all three)' }],
    surfaces: 'Three families of two-sided tori, each running between two one-sided Klein bottles.', doubleCovers: { total: 3, types: 'all dicosms' }, bravaisTypes: 3,
    injectivityRadiusSq: 'min(A, B, C)', diameterSq: 'at least max(α, β, γ)/4 (see paper)',
    mappingTorus: { is: false, text: 'No. Its first homology is finite, so there is no map onto a circle to slice it along.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'a1p', family: 'amphicosm', otherNames: ['Klein bottle × circle'], wolf: 'B1', spaceGroup: 'Pc (no. 7)',
    pointGroup: '*', holonomyOrder: 2, shapeParameters: 4, h1: 'ℤ² × ℤ/2', b1: 2,
    pi1: '⟨W, X, Z | Z^X = Z^W = Z⁻¹, [X, W] = 1⟩', metachiral: false,
    seifert: [{ count: '1', type: '∘' }, { count: 'infinitely many', type: '∗∗ and ××' }],
    surfaces: 'One family of two-sided tori running between two one-sided tori; infinitely many looping families of two-sided Klein bottles; infinitely many looping families of two-sided tori.', orientableDoubleCover: 'the torocosm c1',
    doubleCovers: { total: 7, types: '1 torocosm, 4 first amphicosms, 2 second amphicosms' }, bravaisTypes: 5,
    injectivityRadiusSq: 'min(A+B, B+C, A+C, D)', diameterSq: '(B+C)(C+A)(A+B) / (4(BC+CA+AB)) + D/4',
    mappingTorus: { is: true, text: 'Yes. Slices across the left–right direction are tori; going across brings the torus back reflected.' },
    product: 'Yes: K × S¹ (K the Klein bottle)',
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', orientableDoubleCover: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'a1m', family: 'amphicosm', otherNames: [], wolf: 'B2', spaceGroup: 'Cc (no. 9)',
    pointGroup: '*', holonomyOrder: 2, shapeParameters: 4, h1: 'ℤ²', b1: 2,
    pi1: '⟨W, X, Z | Z^X = Z^W = Z⁻¹, [X, W] = Z⟩', metachiral: false,
    seifert: [{ count: '1', type: '∘' }, { count: 'infinitely many', type: '∗× and ××' }],
    surfaces: 'One family of two-sided tori running between two one-sided tori; infinitely many looping families of two-sided Klein bottles; infinitely many looping families of two-sided tori.', orientableDoubleCover: 'the torocosm c1',
    doubleCovers: { total: 3, types: '1 torocosm, 2 first amphicosms' }, bravaisTypes: 5,
    injectivityRadiusSq: 'min(A+B, A+C, B+C+D, 4D, 4(B+C))', diameterSq: 'a long case analysis, see paper section 9',
    mappingTorus: { is: true, text: 'Yes. Slices across the left–right direction are tori; going across brings the torus back reflected, by a reflection that swaps its two generating loops.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', orientableDoubleCover: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'a2p', family: 'amphidicosm', otherNames: [], wolf: 'B3', spaceGroup: 'Pca2₁ (no. 29)',
    pointGroup: '*22', holonomyOrder: 4, shapeParameters: 3, h1: 'ℤ × (ℤ/2)²', b1: 1,
    pi1: '⟨W, X, Z | Z^W = Z^X = Z⁻¹, X^W = X⁻¹⟩', metachiral: false,
    seifert: [{ count: '3', type: '22∗, ∗∗, ××' }],
    surfaces: 'One family of two-sided Klein bottles running between two one-sided Klein bottles; one looping family of two-sided Klein bottles; one family of two-sided tori running between a one-sided Klein bottle and a one-sided torus.', orientableDoubleCover: 'the dicosm c2',
    doubleCovers: { total: 7, types: '1 dicosm, 2 first amphicosms, 2 first amphidicosms, 2 second amphidicosms' }, bravaisTypes: 1,
    injectivityRadiusSq: 'min(A, B, C)', diameterSq: '(A+B+C)/4',
    mappingTorus: { is: true, text: 'Yes. Its slices are Klein bottles; going around brings the Klein bottle back by a twisted symmetry.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', orientableDoubleCover: 'paper', doubleCovers: 'paper' }),
  },
  {
    id: 'a2m', family: 'amphidicosm', otherNames: [], wolf: 'B4', spaceGroup: 'Pa2₁ (no. 33)',
    pointGroup: '*22', holonomyOrder: 4, shapeParameters: 3, h1: 'ℤ × ℤ/4', b1: 1,
    pi1: '⟨W, X, Z | Z^W = Z^X = Z⁻¹, X^W = X⁻¹ Z⟩', metachiral: false,
    seifert: [{ count: '3', type: '22×, ∗×, ××' }],
    surfaces: 'One family of two-sided tori running between a one-sided torus and a one-sided Klein bottle; one looping family of two-sided Klein bottles; one family of two-sided tori running between a one-sided Klein bottle and a one-sided torus.', orientableDoubleCover: 'the dicosm c2',
    doubleCovers: { total: 3, types: '1 dicosm, 2 first amphicosms' }, bravaisTypes: 1,
    injectivityRadiusSq: 'min(A, B, 4C)', diameterSq: 'at least max(β, γ)/4 (see paper)',
    mappingTorus: { is: true, text: 'Yes. Its slices are Klein bottles; going around brings the Klein bottle back by a twisted symmetry.' },
    product: null,
    sources: src({ mappingTorus: 'computed', product: 'computed', b1: 'computed', h1: 'paper', pi1: 'paper', seifert: 'paper', surfaces: 'paper', orientableDoubleCover: 'paper', doubleCovers: 'paper' }),
  },
];

export const FACTS: Facts[] = BASE;

export const factsFor = (id: string): Facts => FACTS.find((f) => f.id === id)!;
