# Ten platycosms

Interactive 3D diagrams of the ten closed flat 3-manifolds (Conway and Rossetti's "platycosms"), drawn the way Greg Egan draws
the Hantzsche–Wendt space: a fundamental cell with a coloured tube on every edge (same colour, same edge of the space) and
arrowheads for direction. Each space can be seen from outside and from inside, with a fiddler crab in every cell (recoloured:
teal body, big claw fading to coral, a coral "P" on its back and belly) so you can see how the copies are related, including when one is a mirror image.
Each face gluing can be played as an animation: a copy of the cell moves by the gluing map and lands against its partner face.
The side panel explains each space for a newcomer (through the mapping torus picture where there is one) and lists what the
paper says (orientable double cover, H₁, Seifert fibrations, and more).
Every fact is sourced in [`NOTES.md`](NOTES.md). The page's prose is in [`content/`](content/README.md), one small file per piece, to edit directly.

## Run it
```
npm install
npm run dev            # local dev server
npm test               # tiling, Euler characteristic, closed meshes, facts vs generators
npm run build          # static site in dist/
npm run build:single   # dist-single/index.html (about 3 MB, everything inlined) plus figure-33.png: upload both
```
Routes: `#c22`, `#c22/inside`, `#c22/outside/anim2@0.5` (gluing 2, paused half way). Spaces: `c1 c2 c3 c4 c6 c22 a1p a1m a2p a2m`.
An earlier single-file version is kept in `legacy/platycosms-v1.html`. Progress and plans are in [`PROGRESS.md`](PROGRESS.md).

## Credits
- Maths: J. H. Conway and J. P. Rossetti, "Describing the platycosms", arXiv:math.DG/0311476.
- Figure style: Greg Egan, "Loops Across Space".
- Fiddler crab model: "Fiddler Crab" (https://skfb.ly/6xDJv) by renceed, licensed under
  [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/). Non-commercial use only. Recoloured here (its textures are not used).
- Fonts: Space Grotesk and JetBrains Mono (SIL Open Font License), bundled via Fontsource.
- three.js (MIT).
