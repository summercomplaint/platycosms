# Progress log

Read this first if you are a fresh Claude session. Update it at the end of every phase and commit.

## What this project is
Interactive 3D gluing diagrams of the ten platycosms (closed flat 3-manifolds), for a 7-minute talk and a website.
Style follows Greg Egan's "Loops Across Space" coloured-cylinder figure. Math source: Conway & Rossetti,
"Describing the platycosms" (arXiv math.DG/0311476; local copy is gitignored). See `NOTES.md` for what we know and how sure we are.

## Decisions (from the user)
- Standalone static site, TypeScript (Vite + three + vitest). Raw HTML kept only as backup: `legacy/platycosms-v1.html`.
- Edge direction shown with arrowheads (colour alone cannot tell c1 from c2). Since phase 10: tubes opaque, thin (0.02 L), whole (the phase-9 gap at each arrowhead looked odd); arrows 0.17 L long, flare 0.075 L, lighter tint of the tube colour, always on.
- Look (phase 8): space theme, plus a light mode (white, no stars, class-0 balls black) switched by a sun/moon button fixed at the top right of the page (phase 10). Vertex colours: white (black in light mode) and green. Black, white, bright green (#3dff7a). **No grey text**, ever; hierarchy by size, weight, green. No light theme. Fonts: Space Grotesk, JetBrains Mono (Fontsource, bundled).
- Egan's trick: add extra edges (seams) so no face is glued to itself only partly.
- Inside view (camera in the cell, copies around it). A fiddler crab (user's model, CC BY-NC) at the centre of every cell, both views. Since phase 9: teal body, big claw graded teal to coral, white eyes, coral P decal (for platycosm, no outline) on back and belly, scale 0.5 x inradius. No crab colour may be an edge colour (teal was removed from the edge palette; Egan's red stays, the claw is coral instead). The user rejected an RGB axis triad (it would clash with the tube colours).
- Animation (since phase 8): one per **face pairing** (the gluing maps, which generate the group); the ghost lands flush against the partner face, and stops at the end (no loop). In the inside view the whole tiling moves onto itself. (Before: 3 chosen generators, which for c22 sent the ghost somewhere not adjacent.)
- Page prose lives in `content/` (one Markdown-lite file per piece, see content/README.md) so the user can edit it directly. Maths terms in "More details" link to Wikipedia.
- Gluing controls: click a gluing to play it (again to replay), "Clear ghost" (top left of the view) to remove it. No slider. Save PNG opens a popover with the transparent-background choice.
- Mapping torus: not a badge. It is the way in: each description (`story` in facts.ts) uses the mapping torus picture to explain the space. Audience: someone who has never heard of platycosms, without talking down to mathematicians. List the orientable double cover for non-orientable ones. Put as much of the paper's content as is useful on the page.
- No edge/vertex lists, no cell-face fill, no rotate toggle (removed in phase 8). +a1 is drawn as a cube (only +a1; the user chose not to change the other 1 x ½ x ½ boxes).
- Everything pushed to https://github.com/summercomplaint/platycosms (public). No Pages deployment unless asked.

## Phases
- [x] 0. Repo scaffold, legacy backup, docs
- [x] 1. TypeScript project, port math/mesh/data, tests green
- [x] 2. Seams (Egan's extra edge) + real Euler check (V-E+F-1=0 for all 10)
- [x] 3. Facts + NOTES.md, verified against the PDF by a fresh subagent (no discrepancies)
- [x] 4. Restyle (translucent tubes, solid same-colour arrows, narrow tubes) + panel built from facts
- [x] 5. Inside view + fiddler crab
- [x] 6. Symmetry animation (3 generators; ghost copy outside, whole tiling inside)
- [x] 7. CI, README, final push (CI green on the first run)
- [x] 10. Third review: vertex class 1 green, the old green edge orange; crab letter P (no outline); tubes whole again at 0.02 L; Clear ghost in the view; sun/moon theme switch top right of the page; transparent option in a Save PNG popover; Space group links to the list of space groups
- [x] 9. Second review: thin tubes with a gap at each arrowhead, crab teal with a teal-to-coral claw, midlines on c22/−a1/+a2, Clear ghost, light mode, text in content/, Wikipedia links, one "More details"
- [x] 8. Redesign after user review: space theme, opaque tubes and long arrows, recoloured crab with R, face-pairing animations, newcomer text, +a1 cube

## Log
- v1 (Artifact) and v2 (standalone HTML, CPU-clipped closed meshes) done before this repo existed; see `legacy/`.
- Phase 1+2: `src/math/*` (analysis incl. seams via closure of skeleton images, regions = sub-faces), `src/render/mesh.ts`, `src/data/platycosms.ts`, tests in `tests/`.
  Class counts (V,E,F): c1 1,3,3; c2 1,3,3; c3 2,5,4; c4 1,3,3; c6 2,5,4; c22 2,5,4 (2 seams); +a1 1,3,3; -a1 2,5,4; +a2 2,5,4; -a2 2,6,5.
  Note: c22 has 5 edge classes here, not Egan's 6 (different but valid cell structure).
- Phases 3-6: app in `src/main.ts`, `src/ui/panel.ts`, `src/render/{stage,cellKit,tiles,firstPerson,animation,crab,mesh,iso3d}.ts`.
  Hash routes: `#c22`, `#c22/inside`, `#c22/outside/anim2@0.5` (face pairing 2 paused half way). `?stopAfter=3` stops the render loop (used for headless screenshots).
- Headless screenshots (Windows): run `npx vite preview --port 4173`, then `scripts/shots.sh <outdir> name=#hash ...` (needs Edge). The inside view is slow under software GL (about 1M triangles); use `FRAMES=2 BUDGET=20000`.
- `npm run build:single` makes `dist-single/index.html` (3 MB, crab and textures inlined). Checked: it works from file://.
- Gotcha: `renderer.setSize` clears the canvas, so `Stage.resize` redraws immediately.
- Gotcha: never put backticks inside a double-quoted `node -e "..."` in bash; edit files with the editor tools instead.

- Phase 8: `Pairing.gamma` (gluing.ts) maps face a onto face b; pairings are keyed by map, so halves glued by different maps are separate entries. `describeIso` names the axis line / mirror plane. Crab meshes by Collada node: Group2828 body, Group21201 eyestalks, Group37975 legs (+ small claw), Group16311 the big claw.
- A preview server may already be running on 4173 from an earlier session; it serves dist/ from disk, so just rebuild.

## Ideas not done yet
- Fibre slice slider for mapping tori (show the torus / Klein bottle fibre at height z).
- Seams could be drawn in a distinct style; the face list could say which sub-faces are halves.
- Touch controls for the inside view (look works by drag; there is no on-screen move pad).
- A decimated crab for weaker GPUs (the inside view draws about 20 crabs, around 1M triangles in all).
- The crab texture JPEGs in src/assets/crab are no longer used (kept for now).
- Diameters and injectivity radii are shown as formulas only.
- Domains for +a2 and -a2 have faces glued to themselves in halves (shown as "front (its halves)"); a different domain might read better.
