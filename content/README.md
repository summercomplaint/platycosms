# Page text

Every piece of prose on the page lives in this folder, one small file per piece. Edit them freely.

## Format

- Paragraphs are separated by a blank line.
- `**bold**`, `*italic*`, and links: `[Klein bottle](https://en.wikipedia.org/wiki/Klein_bottle)`.
- Links to another platycosm use its id after a #: `[the torocosm](#c1)` switches the page to it.
- Links to a figure use `figure:` and its name: `[this diagram](figure:proof)` opens it over the page. The figures are listed in `src/ui/figures.ts`.
- That is all. Anything else (HTML, headings) shows up as plain text.

## Files

| File | Where it appears |
|---|---|
| `intro/1-what-is-a-platycosm.md` | top of the page, left |
| `intro/2-how-to-read.md` | top of the page, right |
| `gluings/outside.md` | above the list of gluings, outside view |
| `gluings/inside.md` | above the list of gluings, inside view |
| `platycosms/<id>/description.md` | the main description of that space |

The ids are `c1 c2 c3 c4 c6 c22 a1p a1m a2p a2m` (`a1p` is +a1, `a1m` is −a1, and so on).

## Seeing your edits

`npm run dev` and open the page: it reloads as you save. `npm test` checks every file is there and not empty.
The facts in the "More details" box are not here; they live in `src/data/facts.ts` with their sources in `NOTES.md`.
If you add a maths claim to these texts, add its source to `NOTES.md` (section 8a).
