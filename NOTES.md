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
| Space group [Table 12] | P1 (1) | P2₁ (4) | P3₁/P3₂ (144/145) | P4₁/P4₃ (76/78) | P6₁/P6₅ (169/170) | P2₁2₁2₁ (19) | Pc (7) | Cc (9) | Pca2₁ (29) | Pa2₁ (33) |
| Point group (orbifold) [Table 2] | 1 | 22 | 33 | 44 | 66 | 222 | * | * | *22 | *22 |
| Holonomy order [computed] | 1 | 2 | 3 | 4 | 6 | 4 | 2 | 2 | 4 | 4 |
| Orientable [computed] | yes | yes | yes | yes | yes | yes | no | no | no | no |
| Free parameters [Table 2] | 6 | 4 | 2 | 2 | 2 | 3 | 4 | 4 | 3 | 3 |
| H₁ [Table 6] | ℤ³ | ℤ×(ℤ/2)² | ℤ×ℤ/3 | ℤ×ℤ/2 | ℤ | (ℤ/4)² | ℤ²×ℤ/2 | ℤ² | ℤ×(ℤ/2)² | ℤ×ℤ/4 |
| b₁ [computed] | 3 | 1 | 1 | 1 | 1 | 0 | 2 | 2 | 1 | 1 |
| Mapping torus [computed] | yes | yes | yes | yes | yes | **no** | yes | yes | yes | yes |
| Orientable double cover [paper §3; computed] | – | – | – | – | – | – | c1 | c1 | c2 | c2 |
| Bravais types [§11] | 14 | 5 | 1 | 1 | 1 | 3 | 5 | 5 | 1 | 1 |

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
"Reflection, split / non-split" refers to the conjugacy class of the monodromy in GL₂(ℤ): conjugate to diag(1, −1) (split) or to the swap matrix (non-split).

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

X, Y, Z or W, X, Z are generators; "Z: X → X⁻¹" means conjugation by Z. In the helicosms Z is the defining screw motion and X, Y generate the lattice perpendicular to it.

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

Volume of c22 with screw lengths a, b, c: 2abc [paper p.13]. Footnote: for −a2 the proof text on p.31 says min(A, B, 4D) while Table 9 says min(A, B, 4C); the paper is inconsistent with itself (D vs C is the screw-direction parameter) and we follow Table 9. The paper conjectures every platycosm's diameter equals its orbit-lattice bound.

## 8. Conventions used in *our* code (not the paper's)

The paper's generators (Table 12) are in lattice, non-orthonormal coordinates; ours are Cartesian groups that are equivalent to them (same space group), not literal transcriptions. In particular our c2 uses a slide of 1 with lattice (0,0,2) where the paper has ½ with lattice Z³ (same group after rescaling z), and our −a1 is an orthogonal member of the Cc family:

- c1: translations. c2: (x,y,z) → (−x, −y, z+1) with lattice (1,0,0),(0,1,0),(0,0,2). c3, c4, c6: rotation by 120°, 90°, 60° about the vertical axis with a slide of 1.
- c22: (−x, y+½, −z+½), (x+½, −y, −z), lattice Z³ [Table 12].
- +a1: (x+1, y, −z), lattice (2,0,0),(0,1,0),(0,0,1), so the cell is the unit cube (since 2026-10-08; before it was (x+½, y, −z) with lattice Z³ and a ½ × 1 × 1 box; a stretch along x, so the same platycosm with a different free shape parameter). −a1: (x+½, y, −z) with lattice generated by (1,0,0), (0,½,½), (0,½,−½) (an orthogonal member of the paper's Cc family, centred in the yz-plane).
- +a2: (−x, y, z+½), (x+½, −y, z). −a2: (−x, y+½, z+½), (x+½, −y, z) [Table 12].

Tests (`tests/group.test.ts`) check that our lattice bases are exactly the translation subgroups, that the face-pairing maps (what the page animates) generate the group,
and (`tests/analyze.test.ts`) that each chosen fundamental domain tiles space exactly once.

Class counts of the cell structure on our domains (computed): V, E, F per platycosm (vertex, edge, face classes; V−E+F−1 = 0 in every case):
c1 1,3,3; c2 1,3,3; c3 2,5,4; c4 1,3,3; c6 2,5,4; c22 2,5,4; +a1 1,3,3; −a1 2,5,4; +a2 2,5,4; −a2 2,6,5. These depend on the chosen domain and seams, not on the manifold.
Egan's picture of the didicosm has 6 edge colours; ours has 5 (a different, equally valid cell structure).

## 8a. The page text (src/data/facts.ts `story`)

The descriptions restate facts above; nothing new is claimed except:

- Which faces are glued and by what (straight across, half turn, mirror flip with a slide; halves): **[computed]**, the face pairings printed by `tests/gluing.test.ts` for our domains.
- "Only half, third, quarter and sixth turns carry a flat torus onto itself": **[literature]**, the crystallographic restriction theorem (a rotation preserving a 2D lattice has order 1, 2, 3, 4 or 6). Together with the helicosms N = 1, 2, 3, 4, 6 [paper §3].
- "A hexagon with opposite sides glued is a torus": **[literature]**, standard.
- −a1 is "the mapping torus of the other kind of reflection, one that swaps the torus's two generating loops": the non-split reflection of §2 **[computed]** (the swap matrix in GL₂(ℤ)).
- Mirror-image crab after a non-orientable trip: what non-orientable means; each such platycosm has a gluing map with det −1 **[computed]**.
- The face-pairing maps of a fundamental polyhedron generate the group (Poincaré polyhedron theorem) **[literature]**, and checked for our domains **[computed]** in `tests/group.test.ts`.

## 9. Open questions / things to double-check

- The amphidicosm presentations (§6) are the Table 6 shorthand.
- Metachirality: the paper says c3, c4, c6 have enantiomorphic forms. The page says "the two choices are mirror images" [derived].
- The "monodromy for −a1, Klein bottle fibre is not isotopic to the identity" argument is derived from H₁, not from the mapping class group directly.

## 10. Verification log

- 2026-10-05: a fresh subagent re-read the PDF (via pdftotext) and checked about 150 field-level facts in this file and in `src/data/facts.ts`. **No data discrepancies.** It found the two internal inconsistencies of the paper noted in §4 and §7, and that the column alignment of Tables 9, 11, 12 had to be inferred from entry counts (row assignments are consistent). The [computed] and [derived] facts were out of its scope.
