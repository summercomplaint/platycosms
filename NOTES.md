# What we know about the platycosms

This is the knowledge base behind the site. It is written for the project owner to check and for future Claude sessions.
**Every fact has a source tag.** Do not add a fact without one.

- `[paper]` transcribed from J. H. Conway and J. P. Rossetti, *Describing the platycosms*, arXiv:math.DG/0311476
  (a local PDF copy is in the working folder but is gitignored). Page numbers are the paper's own.
- `[computed]` checked by a test in `tests/` from the generators in `src/data/platycosms.ts`.
- `[derived]` reasoned from the above, not independently checked.
- `[literature]` confirmed against another source outside this project (none yet).

Status of the transcription check: **see the end of this file** ("Verification log").

## 0. Basics

A *platycosm* (Conway's name) is a compact flat 3-manifold without boundary, i.e. R³/Γ for a discrete group Γ of isometries
acting freely (no fixed points). There are exactly 10 [paper §1, Appendix I]. They were known by about 1933 (found by Nowacki and by Hantzsche–Wendt, both 1934) [paper §1, §3].

- Six are orientable ("chiral"): c1, c2, c3, c4, c6 (the *helicosms*: a lattice of translations plus a screw motion of period N = 1, 2, 3, 4, 6)
  and c22 (the *didicosm*, also the Hantzsche–Wendt manifold) [paper §3, p.5].
- Four are non-orientable ("amphichiral"): the *amphicosms* ±a1 and the *amphidicosms* ±a2 [paper §3, p.6].
- "+" and "−" are the *first* and *second* (positive and negative) versions. Rule of thumb: an amphi is first or second type iff it has a glide
  mirror of first or second return, i.e. walking perpendicular to a glide mirror you hit the mirror again at the same point (first) or a different point (second) [paper §4, p.15–16].
- c3, c4, c6 are *metachiral*: two enantiomorphic forms (dextral/sinistral screw), so there are 9 oriented types in all [paper §3, p.10].
- Names: torocosm (c1), dicosm (c2), tricosm (c3), tetracosm (c4), hexacosm (c6), didicosm (c22),
  first/second amphicosm (+a1, −a1), first/second amphidicosm (+a2, −a2) [paper §3; names and notations in Appendix III, Table 11, p.45].

## 1. Table of facts (one row per platycosm)

| | c1 | c2 | c3 | c4 | c6 | c22 | +a1 | −a1 | +a2 | −a2 |
|---|---|---|---|---|---|---|---|---|---|---|
| Wolf [Table 11] | G1 | G2 | G3 | G4 | G5 | G6 | B1 | B2 | B3 | B4 |
| Other names [Table 11] | 3-torus | half-turn space | one-third turn space | quarter-turn space | one-sixth turn space | Hantzsche–Wendt | Klein bottle × circle | | | |
| Space group [Table 12] | P1 (1) | P2₁ (4) | P3₁/P3₂ (144/145) | P4₁/P4₃ (76/78) | P6₁/P6₅ (169/170) | P2₁2₁2₁ (19) | Pc (7) | Cc (9) | Pca2₁ (29) | Pna2₁ (33) |
| Point group (orbifold) [Table 2] | 1 | 22 | 33 | 44 | 66 | 222 | * | * | *22 | *22 |
| Holonomy order [computed] | 1 | 2 | 3 | 4 | 6 | 4 | 2 | 2 | 4 | 4 |
| Orientable [computed] | yes | yes | yes | yes | yes | yes | no | no | no | no |
| Free parameters [Table 2] | 6 | 4 | 2 | 2 | 2 | 3 | 4 | 4 | 3 | 3 |
| H₁ [Table 6] | ℤ³ | ℤ×(ℤ/2)² | ℤ×ℤ/3 | ℤ×ℤ/2 | ℤ | (ℤ/4)² | ℤ²×ℤ/2 | ℤ² | ℤ×(ℤ/2)² | ℤ×ℤ/4 |
| b₁ [computed] | 3 | 1 | 1 | 1 | 1 | 0 | 2 | 2 | 1 | 1 |
| Mapping torus [computed] | yes | yes | yes | yes | yes | **no** | yes | yes | yes | yes |
| Orientable double cover [paper §3; computed] | – | – | – | – | – | – | c1 | c1 | c2 | c2 |
| Bravais types [§11] | 14 | 5 | 1 | 1 | 1 | 3 | 5 | 5 | 1 | 1 |

Space group of −a2 [paper Table 12, corrected; literature: International Tables]: the paper prints "P a2₁" for no. 33, but no. 33 is Pna2₁. The glide components agree: the mirror ⊥ x carries the diagonal shift (0, ½, ½), an n-glide, and the mirror ⊥ y carries (½, 0, 0), an a-glide. +a2 has (0, 0, ½) ⊥ x, a c-glide, so it is Pca2₁, matching the paper. (Changed from "Pa2₁" on 2026-10-14.)

Sum of the free parameters over the ten (a consistency test, not a paper fact): 33. Bravais types total 37 [paper p.39].

## 2. Mapping tori (fibre bundles over the circle)

**Claim [derived, then computed]:** a platycosm R³/Γ is a mapping torus (a fibre bundle over S¹) iff b₁ ≥ 1 iff the holonomy group fixes
a nonzero vector. Reason: harmonic 1-forms on a flat manifold are parallel, i.e. fixed vectors of the holonomy; a nowhere-vanishing closed 1-form with
rational periods fibres the manifold over the circle (Tischler). So **all except c22 (b₁ = 0)** are mapping tori. This matches the paper's table of embedded
surfaces [Table 4]: a platycosm has a circle family `(2T)` or `(2K)` of embedded flat surfaces exactly when it fibres this way, and c22 has only intervals `[∓1sK (2T) ∓1sK]`.

Computed with `src/math/fibration.ts` (tests: `tests/fibration.test.ts`). For a fixed direction v, the fibre is R²/Γ₀ where Γ₀ = {γ : t·v = 0} acts on v^⊥;
it is a **torus** if all of Γ₀ preserves the plane's orientation, a **Klein bottle** otherwise. The monodromy is any element with smallest positive t·v.

| | fibre(s) | monodromy | product? |
|---|---|---|---|
| c1 | T² (any direction) | identity | yes: T² × S¹ |
| c2 | T² | half turn (order 2) | no |
| c3 | T² | one-third turn (order 3) | no |
| c4 | T² | quarter turn (order 4) | no |
| c6 | T² | one-sixth turn (order 6) | no |
| c22 | none (b₁ = 0) | | |
| +a1 | K (direction y) and T² (direction x) | identity (K) / split reflection (T²) | **K × S¹** = the "Klein bottle times circle" of the paper |
| −a1 | K and T² | twisted (K) / non-split reflection (T²) | no |
| +a2 | K (only) | twisted | no |
| −a2 | K (only) | twisted | no |

Matches the paper's Table 4: ±a2 have exactly one circle family of Klein bottles `(2K)^1`; ±a1 have `(2K)^∞` and `(2T)^∞`; c2 has `(2T)^1`.
"Twisted" for a Klein bottle fibre means: not a product, i.e. no pure translation along v in Γ. For −a1 the monodromy is trivial on the fibre's point group but is
a half-shift along the fibre's circle direction. That it is not isotopic to the identity follows [derived] from H₁(−a1) = ℤ² versus H₁(K × S¹) = ℤ² × ℤ/2.
**The ±a2 Klein bottle fibre and its monodromy [derived from the generators; direction, base and the mirror lifts computed in `tests/fibration.test.ts`; checked against the paper's H₁].**
In our box [0,1]×[0,½]×[0,½] the slices are horizontal and the circle is one cell high (base ½). A slice is the 1 × ½ cross-section: its left and right ends are glued
straight (T(1,0,0)), and its front edge and back edge are each glued to themselves by a half shift ((x, y) → (x + ½, −y), and the same composed with T(0,1,0)).
Cutting at y = ¼ splits it into two Möbius bands, whose core circles are the folded front and back edges. Equivalently, cut at x = ½ and flip the right half
in front of the left: you get the textbook square, with one pair of sides glued straight and the other flipped. The monodromy is +a2: (x, y) → (−x, y), a mirror that keeps each Möbius band in place; −a2: (x, y) → (−x, y + ½), a glide reflection that swaps them. No lift of the −a2 monodromy is a plain mirror. On the Klein bottle a mirror and a half turn can be the same map (compose with the fibre's own glide), so "mirror" names the lift we use.
Check: H₁(K) = ℤa ⊕ (ℤ/2)b, with a the front core and b the front-to-back loop, and H₁ of the bundle is ℤ ⊕ coker(φ* − 1). For +a2, φ*: a ↦ −a, b ↦ b, so the cokernel is (ℤ/2)², which gives ℤ × (ℤ/2)².
For −a2, a ↦ −a + b, so the cokernel is ℤ/4, which gives ℤ × ℤ/4. Both match the paper's Table 6.
"Reflection, split / non-split" refers to the conjugacy class of the monodromy in GL₂(ℤ): conjugate to diag(1, −1) (split) or to the swap matrix (non-split).

**Shape of the torus fibre [derived from the monodromy column, which is computed; literature: the five 2D Bravais lattices].** The fibre lattice must be
invariant under the monodromy's linear part, and that forces its shape: quarter turn (c4) → **square**; third or sixth turn (c3, c6) → **hexagonal**
(a 60° rhombus, or a regular hexagon with opposite sides glued); split reflection (+a1) → **rectangular**; non-split reflection (−a1) → **rhombic**
(centred rectangular); identity or half turn (c1, c2) → any lattice, so the panel names no shape. This matches the paper's space groups: P4₁ tetragonal,
P3₁ / P6₁ hexagonal, Pc primitive versus Cc centred monoclinic. "Rectangular" means opposite edges glued straight across: any parallelogram can be cut
and re-pasted into a rectangle, but then one pair of edges is glued with a sideways shift, which is a different flat torus (e.g. its shortest loops are not at 90°).

**[literature]** Wikipedia ("Flat manifold", "Hantzsche–Wendt manifold") says the same for the orientable ones: the first five are torus bundles over the circle with monodromy of order 1, 2, 4, 6, 3 (c1, c2, c4, c6, c3), and the Hantzsche–Wendt manifold does not fibre over S¹ because its first homology is finite. It also notes HW fibres over an interval with Klein-bottle fibres, matching the paper's `[∓1sK (2T) ∓1sK]`. The non-orientable cases (K-bundles, K × S¹) are only checked by our own computation and the paper's Table 4.

Seifert fibrations are a different, weaker structure (fibres are circles, base an orbifold). **Every** platycosm has one [paper p.10, Table 3], including c22.

## 3. Seifert fibrations [paper Table 3, p.10]

Fibres are the images of a family of parallel lines; the type is the orbifold notation of the base (the plane group seen "looking along the fibres").

| | fibrations |
|---|---|
| c1 | infinitely many, all of type ∘ |
| c2 | one of type 2222, infinitely many of type ×× |
| c3 | one of type 333 |
| c4 | one of type 444 |
| c6 | one of type 632 |
| c22 | exactly three, all of type 22× |
| +a1 | one of type ∘; infinitely many of types ∗∗ and ×× |
| −a1 | one of type ∘; infinitely many of types ∗× and ×× |
| +a2 | exactly three, of types 22∗, ∗∗, ×× |
| −a2 | exactly three, of types 22×, ∗×, ×× |

## 4. Embedded flat surfaces [paper §5, Table 4, p.19]

Notation: (2T) circle of 2-sided tori, (2K) circle of 2-sided Klein bottles, [1K (2T) 1T] an interval whose ends are 1-sided surfaces.
`+1`/`−1` = first/second return, `∓1` = ambiguous, `g` glide surface, `s` screw surface; the exponent is the number of such families.

| | families (basal ; perpendal) |
|---|---|
| c1 | (2T)^∞ |
| c2 | (2T)^1 ; [1sK (2T) 1sK]^∞ |
| c3, c4, c6 | (2T)^1 |
| c22 | [∓1sK (2T) ∓1sK]^3 |
| +a1 | [+1gT (2T) +1gT]^1 ; (2K)^∞, (2T)^∞ |
| −a1 | [−1gT (2T) −1gT]^1 ; (2K)^∞, (2T)^∞ |
| +a2 | [+1gsK (2K) +1gsK]^1 ; (2K)^1, [∓1sK (2T) ∓1gT]^1 |
| −a2 | [−1gT (2T) −1sK]^1 ; (2K)^1, [∓1sK (2T) ∓1gT]^1 |

The page (`surfaces` in `src/data/facts.ts`) shows these in words: `(2T)`/`(2K)` is "a looping family of two-sided tori / Klein bottles", `[x (2T) y]` is "a family of two-sided tori running between" the one-sided surfaces x and y, and the exponent is the count. It leaves out the first/second-return signs, the g/s tags and the basal/perpendal split (since 2026-10-09).

Footnote: for ±a2 the prose on p.18 describes the perpendal interval as [1sK (2T) 1gK] while Table 4 (p.19) has [∓1sK (2T) ∓1gT]; we follow the table.

## 5. Double covers [paper §8, Table 8, p.28–30]

A double cover corresponds to a homomorphism π₁ → {±1} onto; the number is 2^r − 1 where r is the rank of H₁ mod 2.

| | total | types |
|---|---|---|
| c1 | 7 | all c1 |
| c2 | 7 | 1 c1, 6 c2 |
| c3 | 1 | c3 |
| c4 | 3 | 1 c2, 2 c4 |
| c6 | 1 | c3 |
| c22 | 3 | all c2 |
| +a1 | 7 | 1 c1, 4 +a1, 2 −a1 |
| −a1 | 3 | 1 c1, 2 +a1 |
| +a2 | 7 | 1 c2, 2 +a1, 2 +a2, 2 −a2 |
| −a2 | 3 | 1 c2, 2 +a1 |

**Orientable double cover** of a non-orientable platycosm [paper §3 p.6; §8]: +a1 and −a1 have the torocosm c1; +a2 and −a2 have the dicosm c2.
Checked by computation: the orientation-preserving subgroup has holonomy of order 1 (±a1) or 2 (±a2) (`src/math/covers.ts`).
The paper calls a non-orientable X an "amphi-Y" where Y is its orientable double cover, obtained by keeping only the images of one handedness.

## 6. Fundamental groups [paper Table 6, p.24; §7]

**What the page shows (since 2026-10-09)**: plain generators and relators, written on *our* generators (§8), in `facts.ts` (`pi1`, `pi1Key`). Lower case is a generator, a superscript ⁻¹ its inverse, [a, b] = aba⁻¹b⁻¹.

| | presentation | generators (our isometries) |
|---|---|---|
| c1 | ⟨x, y, z \| [x, y], [x, z], [y, z]⟩ | translations e₁, e₂, e₃ |
| c2 | ⟨x, y, t \| [x, y], txt⁻¹x, tyt⁻¹y⟩ | e₁, e₂; t = (−x, −y, z+1) |
| c3 | ⟨x, y, t \| [x, y], txt⁻¹y⁻¹x, tyt⁻¹x⟩ | (1,0,0), (½,√3/2,0); t = 120° screw |
| c4 | ⟨x, y, t \| [x, y], txt⁻¹y⁻¹, tyt⁻¹x⟩ | e₁, e₂; t = 90° screw |
| c6 | ⟨x, y, t \| [x, y], txt⁻¹y⁻¹, tyt⁻¹y⁻¹x⟩ | (1,0,0), (½,√3/2,0); t = 60° screw |
| c22 | ⟨a, b \| a²ba²b⁻¹, b²ab²a⁻¹⟩ | the two generators of §8 |
| +a1 | ⟨t, y, z \| [y, z], [t, y], tzt⁻¹z⟩ | t = (x+1, y, −z); e₂, e₃ |
| −a1 | ⟨t, u, v \| [u, v], tut⁻¹v⁻¹, tvt⁻¹u⁻¹⟩ | t = (−x, y, z+½); u = (½,½,0), v = (−½,½,0) |
| +a2 | ⟨s, t, y \| sys⁻¹y, [t, y], tst⁻¹s⟩ | s = (x+½, −y, z), t = (−x, y, z+½); e₂ |
| −a2 | ⟨s, t, y \| sys⁻¹y, [t, y], tst⁻¹sy⁻¹⟩ | s = (x+½, −y, z), t = (−x, y+½, z+½); e₂ |

- **[computed]** `tests/presentation.test.ts`: every relator is the identity isometry, the generators generate the same group as `platycosms.ts`, and the abelianization (Smith normal form of the relator exponent sums) equals H₁ from Table 6 for all ten.
- That the relators are *enough* (no relation missing) **[derived]**: every group except c22 is a semidirect product (lattice or Klein-bottle group) ⋊ ℤ, the ℤ being t: the elements fixing the t-direction coordinate form ℤ² (c1–c6, ±a1, with a commuting basis) or the Klein bottle group ⟨s, y | sys⁻¹y⟩ (±a2), and the relators are exactly that group's relators plus how t conjugates its generators. For c22 this is the standard Hantzsche–Wendt presentation **[literature]**, and it agrees with the paper's ⟨X, Y | X = Y²XY², Y = X²YX²⟩ (relators X⁻¹Y²XY², which hold with X = a, Y = b since a², b² are translations inverted by the other).

What the paper's Table 6 shorthand said (kept for reference; the page used it before 2026-10-09): X, Y, Z or W, X, Z are generators; "Z: X → X⁻¹" means conjugation by Z. In the helicosms Z is the defining screw motion and X, Y generate the lattice perpendicular to it.

- c1: X, Y, Z commute.
- c2: X, Y commute; Z inverts both.
- c3: X, Y commute; Z: X → Y → (XY)⁻¹.
- c4: X, Y commute; Z: X → Y → X⁻¹.
- c6: X, Y commute; Z: X → XY → Y.
- c22: ⟨X, Y | X = Y²XY², Y = X²YX²⟩ (with Z = (XY)⁻¹). The translation subgroup is generated by the squares X², Y², Z²; the generators X, Y, Z satisfy XYZ = 1 and invert the squares of each other [paper p.23]. H₁ = C₄ × C₄, the only platycosm with finite homology.
- +a1: ⟨W, X, Z | Z^X = Z^W = Z⁻¹, [X, W] = 1⟩. −a1: same with [X, W] = Z.
- +a2: W, X: Z → Z⁻¹, and W: X → X⁻¹. −a2: W, X: Z → Z⁻¹, and W: X → X⁻¹Z (Table 6; the paper does not spell out the full relations for the amphidicosms, so treat these as the table's shorthand).

## 7. Metric facts [paper §9, Table 9, p.33]

A, B, C, D are the paper's shape parameters (conorms of the "naming lattice"; A, B, C often squared lengths a², b², c² of screw/glide vectors). Squared injectivity radius and squared diameter:

| | inj. radius² | diameter² |
|---|---|---|
| c1 | minimal vonorm | see §10 |
| c2 | min(B+C, C+A, A+B, D) | (B+C)(C+A)(A+B) / (4(BC+CA+AB)) + D/4 |
| c3, c6 | min(2A, D) | 2A/3 + D/4 |
| c4 | min(A, D) | A/2 + D/4 |
| c22 | min(A, B, C) | ≥ ¼ max(α, β, γ) |
| +a1 | min(A+B, B+C, A+C, D) | (B+C)(C+A)(A+B) / (4(BC+CA+AB)) + D/4 |
| −a1 | min(A+B, A+C, B+C+D, 4D, 4(B+C)) | long case analysis (§9) |
| +a2 | min(A, B, C) | (A+B+C)/4 |
| −a2 | min(A, B, 4C) | ≥ ¼ max(β, γ) |

Volume of c22 with screw lengths a, b, c: 2abc [paper p.13]. Footnote: for −a2 the proof text on p.31 says min(A, B, 4D) while Table 9 says min(A, B, 4C); this is only a change of letter (§7a). The injectivity column is the squared shortest geodesic, (2 · inj)² (§7a). The paper conjectures every platycosm's diameter equals its orbit-lattice bound.

## 7a. Shapes, and the metric facts we compute (since 2026-10-17, phase R2)

**Shapes [derived; computed].** Every linear part L of our generators is orthogonal, so a flat metric on R³/Γ is a symmetric positive G with
GL = LG for all L (`src/math/shape.ts`). With M = √G (symmetric), M commutes with every L, so MΓM⁻¹ keeps the linear parts, maps translation
parts t ↦ Mt, and M(D) is a fundamental domain with the same cell structure. `tests/shape.test.ts` checks: the space of such G has dimension
6, 4, 2, 2, 2, 3, 4, 4, 3, 3, exactly Table 2's free parameters; the sliders (volume fixed at 1, so one fewer) move G in independent directions;
the deformed domain still tiles, with the same classes; carrying the default analysis over by M gives the same skeleton and gluings as a fresh analysis.

Sliders are lengths and angles of the default box (x length, y depth, z height); the length follows from volume 1. Which angles may move is
forced by the holonomy: c1 all three, c2 and +a1 length–depth, −a1 depth–height, none for the rest; c3, c4, c6 stretch length and depth together.

**Bravais presets [paper §11; computed].** c1: the 14 Bravais lattices as primitive bases of standard conventional cells [literature]; the test
counts their lattice symmetries (2, 4, 4, 8, 8, 8, 8, 16, 16, 12, 24, 48, 48, 48). c2: the plane lattice under the screw is square, rectangular,
rhombic, hexagonal or oblique; the test computes its conorms and finds AA0, AB0, AAB, AAA, ABC [paper Table 1]. ±a1: the five types of §11 with
the glide vector x distinguished, A = −w·x, B = −w·y, C = −x·y (w = −x−y): AB0 (our default box), ABC, ABB, 0BC, 0BB, checked from the conorms
of x and the second vector y of the mirror plane. c22: all equal, two equal, all different screw vectors. c3, c4, c6, ±a2: one type each.
Our parameters ↔ the paper's: c2 and +a1, x = (1,0,0), y = (0,1,0), z = (0,0,1) (z the screw / normal vector, D = |z|²); c3, c6, A = |x|²/2;
c4, A = |x|²; c22, the screw vectors (½,0,0), (0,½,0), (0,0,½); −a1, glide x = (0,0,½), y = (0,½,0), z = (½,0,0); +a2, (½,0,0), (0,0,½),
(0,1,0); −a2, glide x = (½,0,0), screw y = (0,0,½), and z = (0,½,0), whose double is a translation but which is not itself a geodesic vector.
(All mapped by M.)

**Injectivity radius [computed].** Half the shortest closed geodesic: ½ min over γ ≠ 1 of |Pt|, P the projection onto the vectors L fixes
(`src/math/metric.ts`), searched in a radius that provably reaches every conjugacy class. **Table 9's "squared injectivity radius" column is
(2 · injectivity radius)², i.e. the squared length of the shortest closed geodesic**, not the squared radius (e.g. the unit 3-torus: the table
gives its minimal vonorm 1, the injectivity radius is ½). Read that way, every row of Table 9 matches our computation on several shapes, all ten
platycosms, including the two exceptions −a1 and −a2 worked out in §9 of the paper. The −a2 row's "4C" (Table 9) versus "4D" (text) is only a
change of letter: it is the norm of z above.

**Diameter [computed].** The farthest point from p is the farthest corner of p's Voronoi cell among its images Γp; the diameter is the largest
of these over p. The search is a branch and bound that returns a certified range [a real pair of points, an upper bound]: the covering radius
R(p) does not change when p moves along a direction every L fixes, and changes by at most |δ| when p moves by δ across them. Checks:
- c2, c3, c4, c6, +a1, +a2 (where the paper proves its formula): Table 9's value lies in the certified range on 3 or 4 shapes each.
- c1: cubic, body- and face-centred cubic give √3/2, √5/4, ½ times the cube side [literature: covering radii].
- c22, −a2, −a1: Table 9 gives the *orbit-lattice bound*, a lower bound that the paper conjectures is the diameter ("orbit lattice
  conjecture", p.32). Our upper bound is never below it, and the default shapes (all screw vectors equal) attain it. For −a2 the bound is the
  larger of the two α-type terms led by the glide vector and by the screw vector (the only reading that is a lower bound on all 25 shapes we
  tried; the paper says "β, γ" without saying which vectors).
- **The orbit lattice conjecture appears to fail for c22 and −a2 [computed].** c22 with squared screw lengths A, B, C = 0.482, 1.44, 0.36
  (volume 1; sliders depth 1.2, height 0.6): the bound is 4R₀² = max(α, β, γ) = 2.926, but there are points p, y with 4|p − y|² ≥ 3.17 and
  no image of p closer to y than p itself. −a2 at the same sliders: bound 2.925, pair at 4d² ≥ 3.14. `tests/metric.test.ts` checks each pair
  with nothing but a breadth-first search of the generators. We also confirmed numerically that the paper's α, β, γ are the covering radii of
  orbits that are lattices, so the formulas are right; the diameter is attained elsewhere. We found nothing on this in the literature (search, 2026-10-17).
- −a1's long formula (§9, read from the PDF text, whose Δ denominators lost their symbol): our range contains it at the default shape and lies
  above it elsewhere; at sliders depth 0.7, height 1.1, angle 100° the pair found beats it by about 1%. Not claimed as a counterexample, since
  the transcription is not certain.

## 8. Conventions used in *our* code (not the paper's)

The paper's generators (Table 12) are in lattice, non-orthonormal coordinates; ours are Cartesian groups that are equivalent to them (same space group), not literal transcriptions. In particular our c2 uses a slide of 1 with lattice (0,0,2) where the paper has ½ with lattice Z³ (same group after rescaling z), and our −a1 is an orthogonal member of the Cc family:

- c1: translations. c2: (x,y,z) → (−x, −y, z+1) with lattice (1,0,0),(0,1,0),(0,0,2). c3, c4, c6: rotation by 120°, 90°, 60° about the vertical axis with a slide of 1.
- c22: (−x, y+½, −z+½), (x+½, −y, −z), lattice Z³ [Table 12].
- +a1: (x+1, y, −z), lattice (2,0,0),(0,1,0),(0,0,1), so the cell is the unit cube (since 2026-10-08; before it was (x+½, y, −z) with lattice Z³ and a ½ × 1 × 1 box; a stretch along x, so the same platycosm with a different free shape parameter). −a1: (−x, y, z+½) with lattice generated by (0,0,1), (½,½,0), (−½,½,0) and box [−½,½]×[0,½]×[0,½] (an orthogonal member of the paper's Cc family, centred in the xy-plane). Since 2026-10-09; before it was the same group with x and z swapped, (x+½, y, −z) with lattice (1,0,0), (0,½,½), (0,½,−½) and a box long along z. Swapping axes is an isometry, so this is the same platycosm, just drawn wide instead of tall.
- +a2: (−x, y, z+½), (x+½, −y, z). −a2: (−x, y+½, z+½), (x+½, −y, z) [Table 12].

Tests (`tests/group.test.ts`) check that our lattice bases are exactly the translation subgroups, that the face-pairing maps (what the page animates) generate the group,
and (`tests/analyze.test.ts`) that each chosen fundamental domain tiles space exactly once.

Class counts of the cell structure on our domains (computed): V, E, F per platycosm (vertex, edge, face classes; V−E+F−1 = 0 in every case):
c1 1,3,3; c2 1,3,3; c3 2,5,4; c4 1,3,3; c6 2,5,4; c22 2,6,5; +a1 1,3,3; −a1 2,6,5; +a2 2,6,5; −a2 2,6,5. These depend on the chosen domain and seams, not on the manifold.
Since 2026-10-08 c22, −a1 and +a2 also get a midline round their long faces (`extraEdges` in platycosms.ts, closed up under the gluings; −a2 already had one from its seams). With it c22 has 6 edge colours, like Egan's picture (before: 5).

## 8a. The page text (the files in `content/`)

The details panel does not show the paper's formulas for the injectivity radius or diameter (§7) since 2026-10-09: they need the paper's shape parameters. Since 2026-10-17 the shape bar in the view shows both as numbers, computed for the shape on screen (§7a).

The descriptions restate facts above; nothing new is claimed except:

- Which faces are glued and by what (straight across, half turn, mirror flip with a slide; halves): **[computed]**, the face pairings printed by `tests/gluing.test.ts` for our domains.
- "Only half, third, quarter and sixth turns carry a flat torus onto itself": **[literature]**, the crystallographic restriction theorem (a rotation preserving a 2D lattice has order 1, 2, 3, 4 or 6). Together with the helicosms N = 1, 2, 3, 4, 6 [paper §3].
- "A hexagon with opposite sides glued is a torus": **[literature]**, standard.
- −a1 is "the mapping torus of the other kind of reflection, one that swaps the torus's two generating loops": the non-split reflection of §2 **[computed]** (the swap matrix in GL₂(ℤ)).
- Mirror-image crab after a non-orientable trip: what non-orientable means; each such platycosm has a gluing map with det −1 **[computed]**.
- Inside view (since 2026-10-09): a gluing is a walk, not a motion of the tiling. From p in the cell h(D) you go in a straight line, without turning, to hγh⁻¹(p), which lies in the neighbouring copy hγ(D) across the glued face **[computed]**, `tests/group.test.ts`. The view on arrival is the start view turned or mirrored by the linear part of γ: walking without turning is parallel transport, and in a flat manifold the holonomy of a loop is the linear part of its deck transformation **[literature]**.
- The face-pairing maps of a fundamental polyhedron generate the group (Poincaré polyhedron theorem) **[literature]**, and checked for our domains **[computed]** in `tests/group.test.ts`.

## 9. Open questions / things to double-check

- The amphidicosm shorthand in Table 6 is incomplete; the page now uses the full presentations of §6, checked by test.
- Metachirality: the paper says c3, c4, c6 have enantiomorphic forms. The page says "the two choices are mirror images" [derived].
- The "monodromy for −a1, Klein bottle fibre is not isotopic to the identity" argument is derived from H₁, not from the mapping class group directly.

## 10. Verification log

- 2026-10-05: a fresh subagent re-read the PDF (via pdftotext) and checked about 150 field-level facts in this file and in `src/data/facts.ts`. **No data discrepancies.** It found the two internal inconsistencies of the paper noted in §4 and §7, and that the column alignment of Tables 9, 11, 12 had to be inferred from entry counts (row assignments are consistent). The [computed] and [derived] facts were out of its scope.
